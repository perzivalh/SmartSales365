from __future__ import annotations

import logging
from urllib.parse import urlparse
from typing import Iterable

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from django.db import transaction
from decimal import Decimal

from rest_framework import serializers

from .models import Category, Product, ProductFeature, ProductImage, Promotion
from .promotion_service import PromotionPricingEngine, build_promotion_pricing_map

logger = logging.getLogger(__name__)

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description", "image_url", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "url", "position", "is_cover", "mime_type", "size_bytes"]
        read_only_fields = ["id"]


class ProductFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductFeature
        fields = ["id", "label"]
        read_only_fields = ["id"]


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    category_name = serializers.CharField(source="category.name", read_only=True)
    images = ProductImageSerializer(many=True, required=False)
    features = ProductFeatureSerializer(many=True, required=False)
    active_promotion = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "category",
            "category_name",
            "name",
            "sku",
            "short_description",
            "long_description",
            "price",
            "stock",
            "width_cm",
            "height_cm",
            "weight_kg",
            "is_active",
            "cover_image_url",
            "images",
            "features",
            "created_at",
            "updated_at",
            "active_promotion",
            "final_price",
        ]
        read_only_fields = ["id", "cover_image_url", "created_at", "updated_at"]

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor que 0.")
        return value

    def validate_stock(self, value):
        if value <= 0:
            raise serializers.ValidationError("El stock debe ser mayor que 0.")
        return value

    def validate(self, attrs):
        images = attrs.get("images")
        if images is not None:
            cover_count = sum(1 for image in images if image.get("is_cover"))
            if cover_count > 1:
                raise serializers.ValidationError("Solo una imagen puede marcarse como portada.")
        return attrs

    def _extract_nested(self, validated_data: dict) -> tuple[list[dict], list[dict]]:
        images = validated_data.pop("images", [])
        features = validated_data.pop("features", [])
        return images, features

    def _prepare_images(self, images: Iterable[dict]) -> list[dict]:
        prepared: list[dict] = []
        for image in images:
            size_value = image.get("size_bytes")
            if size_value in ("", None):
                size_value = None
            mime_value = image.get("mime_type")
            if mime_value in ("", None):
                mime_value = None
            prepared.append(
                {
                    "url": image.get("url"),
                    "position": image.get("position", 0),
                    "is_cover": image.get("is_cover", False),
                    "mime_type": mime_value,
                    "size_bytes": size_value,
                }
            )
        prepared.sort(key=lambda item: (item["position"], item["url"]))
        return prepared

    def _prepare_features(self, features: Iterable[dict]) -> list[dict]:
        return [{"label": feature.get("label")} for feature in features if feature.get("label")]

    def _sync_cover(self, product: Product, images_data: list[dict]) -> str | None:
        cover_url = None
        if not images_data:
            return None
        cover_candidates = [img for img in images_data if img["is_cover"]]
        if not cover_candidates:
            images_data[0]["is_cover"] = True
            cover_candidates = [images_data[0]]
        cover_url = cover_candidates[0]["url"]
        return cover_url

    def _extract_storage_key(self, url: str | None) -> str | None:
        if not url:
            return None
        parsed = urlparse(url)
        key = parsed.path.lstrip("/")
        return key or None

    def _delete_removed_objects(self, previous_urls: list[str], current_images: list[dict]) -> None:
        if not settings.AWS_S3_BUCKET:
            return
        remaining_urls = {image.get("url") for image in current_images if image.get("url")}
        urls_to_delete = [url for url in previous_urls if url and url not in remaining_urls]
        keys = [self._extract_storage_key(url) for url in urls_to_delete if url]
        if not keys:
            return
        try:
            s3_client = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            )
            for key in keys:
                s3_client.delete_object(Bucket=settings.AWS_S3_BUCKET, Key=key)
        except (BotoCoreError, ClientError) as error:
            logger.warning("No se pudo eliminar imagenes antiguas de S3: %s", error)

    def _replace_nested(self, product: Product, images: list[dict], features: list[dict]) -> None:
        previous_urls = list(product.images.values_list("url", flat=True))
        product.images.all().delete()
        product.features.all().delete()

        cover_url = self._sync_cover(product, images)
        for image in images:
            ProductImage.objects.create(product=product, **image)
        for feature in features:
            ProductFeature.objects.create(product=product, **feature)

        product.cover_image_url = cover_url
        product.save(update_fields=["cover_image_url", "updated_at"])
        self._delete_removed_objects(previous_urls, images)

    @transaction.atomic
    def create(self, validated_data):
        images_raw, features_raw = self._extract_nested(validated_data)
        product = Product.objects.create(**validated_data)
        images = self._prepare_images(images_raw)
        features = self._prepare_features(features_raw)
        self._replace_nested(product, images, features)
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        images_raw, features_raw = self._extract_nested(validated_data)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if images_raw or features_raw or "images" in self.initial_data or "features" in self.initial_data:
            images = self._prepare_images(images_raw)
            features = self._prepare_features(features_raw)
            self._replace_nested(instance, images, features)
        return instance

    def _get_pricing(self, obj: Product):
        engine: PromotionPricingEngine | None = self.context.get("promotion_pricing")
        if engine:
            return engine.get(obj)
        single_engine = PromotionPricingEngine([obj])
        return single_engine.get(obj)

    def get_active_promotion(self, obj: Product):
        pricing = self._get_pricing(obj)
        if not pricing:
            return None
        return pricing.as_public_dict()

    def get_final_price(self, obj: Product) -> str:
        pricing = self._get_pricing(obj)
        if pricing:
            return str(pricing.final_price)
        return str(obj.price)


class PromotionSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), many=True, required=False)
    products = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), many=True, required=False)
    category_names = serializers.SerializerMethodField()
    product_names = serializers.SerializerMethodField()

    class Meta:
        model = Promotion
        fields = [
            "id",
            "name",
            "description",
            "discount_type",
            "discount_value",
            "scope",
            "categories",
            "products",
            "category_names",
            "product_names",
            "start_date",
            "end_date",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "category_names", "product_names"]

    def validate(self, attrs):
        scope = attrs.get("scope") or getattr(self.instance, "scope", Promotion.Scope.GLOBAL)
        categories = attrs.get("categories")
        products = attrs.get("products")
        discount_type = attrs.get("discount_type") or getattr(self.instance, "discount_type", Promotion.DiscountType.PERCENT)
        discount_value: Decimal = attrs.get("discount_value") or getattr(self.instance, "discount_value", Decimal("0"))
        start = attrs.get("start_date") or getattr(self.instance, "start_date", None)
        end = attrs.get("end_date") or getattr(self.instance, "end_date", None)

        if discount_value <= 0:
            raise serializers.ValidationError({"discount_value": "El valor del descuento debe ser mayor a 0."})
        if discount_type == Promotion.DiscountType.PERCENT and discount_value > 100:
            raise serializers.ValidationError({"discount_value": "El porcentaje no puede superar el 100%."})

        if end and start and end <= start:
            raise serializers.ValidationError({"end_date": "La fecha de fin debe ser posterior al inicio."})

        if scope == Promotion.Scope.CATEGORY and not categories:
            raise serializers.ValidationError({"categories": "Selecciona al menos una categoria."})
        if scope == Promotion.Scope.PRODUCT and not products:
            raise serializers.ValidationError({"products": "Selecciona al menos un producto."})
        return attrs

    def create(self, validated_data):
        categories = validated_data.pop("categories", [])
        products = validated_data.pop("products", [])
        promotion = Promotion.objects.create(**validated_data)
        if promotion.scope == Promotion.Scope.CATEGORY and categories:
            promotion.categories.set(categories)
        if promotion.scope == Promotion.Scope.PRODUCT and products:
            promotion.products.set(products)
        return promotion

    def update(self, instance, validated_data):
        categories = validated_data.pop("categories", None)
        products = validated_data.pop("products", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if categories is not None:
            if instance.scope == Promotion.Scope.CATEGORY:
                instance.categories.set(categories)
            else:
                instance.categories.clear()
        if products is not None:
            if instance.scope == Promotion.Scope.PRODUCT:
                instance.products.set(products)
            else:
                instance.products.clear()
        return instance

    def get_category_names(self, obj: Promotion):
        return [category.name for category in obj.categories.all()]

    def get_product_names(self, obj: Promotion):
        return [product.name for product in obj.products.all()]





