"""ViewSets for catalog domain."""
from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework import filters, status
from rest_framework.permissions import BasePermission, SAFE_METHODS, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from activity.mixins import AuditableModelViewSet
from .models import Category, Product, Promotion
from .promotion_service import PromotionPricingEngine
from .serializers import CategorySerializer, ProductSerializer, PromotionSerializer


class AdminOrReadOnly(BasePermission):
    """Allow read-only access to anyone, but restrict modifications to admins."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class CategoryViewSet(AuditableModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [AdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]
    audit_entity = "Categoria"


class ProductViewSet(AuditableModelViewSet):
    queryset = (
        Product.objects.select_related("category")
        .prefetch_related("images", "features")
        .all()
    )
    serializer_class = ProductSerializer
    permission_classes = [AdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "sku"]
    ordering_fields = ["created_at", "price"]
    ordering = ["-created_at"]
    audit_entity = "Producto"

    def get_queryset(self):
        queryset = super().get_queryset()
        request = self.request
        category_id = request.query_params.get("category_id")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        is_active_param = request.query_params.get("is_active")
        if is_active_param is not None and is_active_param != "":
            if is_active_param.lower() in {"true", "1"}:
                queryset = queryset.filter(is_active=True)
            elif is_active_param.lower() in {"false", "0"}:
                queryset = queryset.filter(is_active=False)
        if not request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        ids_param = request.query_params.get("ids")
        if ids_param:
            try:
                ids = [UUID(part.strip()) for part in ids_param.split(",") if part.strip()]
                if ids:
                    queryset = queryset.filter(id__in=ids)
            except (ValueError, AttributeError):
                queryset = queryset.none()
        has_promotion_param = request.query_params.get("has_promotion")
        if has_promotion_param and has_promotion_param.lower() in {"true", "1", "yes"}:
            queryset = self._filter_with_active_promotions(queryset)
        return queryset

    def _prepare_promotion_engine(self, items):
        if not items:
            self._promotion_engine = None
            return
        self._promotion_engine = PromotionPricingEngine(items)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if hasattr(self, "_promotion_engine") and self._promotion_engine:
            context["promotion_pricing"] = self._promotion_engine
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            items = list(page)
            self._prepare_promotion_engine(items)
            serializer = self.get_serializer(items, many=True)
            return self.get_paginated_response(serializer.data)

        items = list(queryset)
        self._prepare_promotion_engine(items)
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        self._prepare_promotion_engine([instance])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def _filter_with_active_promotions(self, queryset):
        now = timezone.now()
        active_promotions = (
            Promotion.objects.filter(is_active=True)
            .filter(Q(start_date__lte=now) | Q(start_date__isnull=True))
            .filter(Q(end_date__gte=now) | Q(end_date__isnull=True))
        )
        if not active_promotions.exists():
            return queryset.none()
        if active_promotions.filter(scope=Promotion.Scope.GLOBAL).exists():
            return queryset
        category_ids = list(
            active_promotions.filter(scope=Promotion.Scope.CATEGORY).values_list("categories__id", flat=True)
        )
        product_ids = list(
            active_promotions.filter(scope=Promotion.Scope.PRODUCT).values_list("products__id", flat=True)
        )
        filters = Q()
        if category_ids:
            filters |= Q(category_id__in=category_ids)
        if product_ids:
            filters |= Q(id__in=product_ids)
        if filters:
            return queryset.filter(filters)
        return queryset.none()


class ProductImageUploadView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, *args, **kwargs):
        if not settings.AWS_S3_BUCKET:
            return Response(
                {"detail": "El almacenamiento S3 no esta configurado."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        upload_file = request.FILES.get("file")
        if not upload_file:
            return Response(
                {"detail": "Debes adjuntar un archivo en el campo 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = upload_file.content_type or "application/octet-stream"
        file_extension = Path(upload_file.name).suffix.lower()
        object_key = f"products/{uuid4()}{file_extension}"

        extra_args: dict[str, str] = {"ContentType": content_type}
        acl_value = (settings.AWS_S3_UPLOAD_ACL or "").strip()
        if acl_value and acl_value.lower() not in {"none", "default"}:
            extra_args["ACL"] = acl_value

        try:
            s3_client = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            )
            s3_client.upload_fileobj(upload_file, settings.AWS_S3_BUCKET, object_key, ExtraArgs=extra_args)
        except (BotoCoreError, ClientError) as upload_error:
            return Response(
                {
                    "detail": "No se pudo subir la imagen al almacenamiento.",
                    "error": str(upload_error),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        public_base = (settings.AWS_S3_PUBLIC_DOMAIN or "").rstrip("/")
        public_url = f"{public_base}/{object_key}" if public_base else object_key

        return Response(
            {
                "url": public_url,
                "mime_type": content_type,
                "size_bytes": upload_file.size,
                "key": object_key,
            },
            status=status.HTTP_201_CREATED,
        )


class CategoryImageUploadView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, *args, **kwargs):
        if not settings.AWS_S3_BUCKET:
            return Response(
                {"detail": "El almacenamiento S3 no esta configurado."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        upload_file = request.FILES.get("file")
        if not upload_file:
            return Response(
                {"detail": "Debes adjuntar un archivo en el campo 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = upload_file.content_type or "application/octet-stream"
        file_extension = Path(upload_file.name).suffix.lower()
        object_key = f"categories/{uuid4()}{file_extension}"

        extra_args: dict[str, str] = {"ContentType": content_type}
        acl_value = (settings.AWS_S3_UPLOAD_ACL or "").strip()
        if acl_value and acl_value.lower() not in {"none", "default"}:
            extra_args["ACL"] = acl_value

        try:
            s3_client = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            )
            s3_client.upload_fileobj(upload_file, settings.AWS_S3_BUCKET, object_key, ExtraArgs=extra_args)
        except (BotoCoreError, ClientError) as upload_error:
            return Response(
                {
                    "detail": "No se pudo subir la imagen al almacenamiento.",
                    "error": str(upload_error),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        public_base = (settings.AWS_S3_PUBLIC_DOMAIN or "").rstrip("/")
        public_url = f"{public_base}/{object_key}" if public_base else object_key

        return Response(
            {
                "url": public_url,
                "mime_type": content_type,
                "size_bytes": upload_file.size,
                "key": object_key,
            },
            status=status.HTTP_201_CREATED,
        )


class PromotionViewSet(AuditableModelViewSet):
    queryset = Promotion.objects.prefetch_related("categories", "products").all()
    serializer_class = PromotionSerializer
    permission_classes = [AdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["start_date", "end_date", "created_at", "discount_value"]
    ordering = ["-created_at"]
    audit_entity = "Promocion"

    def get_queryset(self):
        queryset = super().get_queryset()
        scope = self.request.query_params.get("scope")
        status_param = self.request.query_params.get("status")
        if scope:
            queryset = queryset.filter(scope=scope.upper())
        if status_param:
            if status_param.lower() == "active":
                queryset = queryset.filter(is_active=True)
            elif status_param.lower() == "inactive":
                queryset = queryset.filter(is_active=False)
        return queryset


