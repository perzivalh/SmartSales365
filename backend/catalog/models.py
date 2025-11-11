"""Models for catalog domain."""
from __future__ import annotations

import uuid

from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.db.models import CheckConstraint, Q, F
from django.utils import timezone


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    image_url = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"

    def __str__(self) -> str:
        return self.name


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=160)
    sku = models.CharField(
        max_length=64,
        unique=True,
        validators=[RegexValidator(regex=r"^[A-Z0-9-]{4,64}$", message="El SKU debe cumplir ^[A-Z0-9-]{4,64}$.")],
    )
    short_description = models.CharField(max_length=300, blank=True)
    long_description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])
    stock = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    width_cm = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    height_cm = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    weight_kg = models.DecimalField(max_digits=8, decimal_places=3, default=0)
    is_active = models.BooleanField(default=True)
    cover_image_url = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
        constraints = [
            CheckConstraint(check=Q(price__gt=0), name="product_price_gt_zero"),
            CheckConstraint(check=Q(stock__gt=0), name="product_stock_gt_zero"),
        ]

    def __str__(self) -> str:
        return f"{self.sku} - {self.name}"


class ProductImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    url = models.TextField()
    position = models.PositiveSmallIntegerField(default=0)
    is_cover = models.BooleanField(default=False)
    mime_type = models.CharField(max_length=64, null=True, blank=True)
    size_bytes = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["position", "id"]
        verbose_name = "Imagen de producto"
        verbose_name_plural = "Imagenes de producto"
        constraints = [
            CheckConstraint(
                check=Q(size_bytes__lte=10_485_760) | Q(size_bytes__isnull=True),
                name="product_image_max_size",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.product_id} - {self.url}"


class ProductFeature(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="features")
    label = models.CharField(max_length=120)

    class Meta:
        ordering = ["label"]
        verbose_name = "Caracteristica"
        verbose_name_plural = "Caracteristicas"

    def __str__(self) -> str:
        return self.label


class Promotion(models.Model):
    class DiscountType(models.TextChoices):
        PERCENT = "PERCENT", "Porcentaje"
        AMOUNT = "AMOUNT", "Monto fijo"

    class Scope(models.TextChoices):
        GLOBAL = "GLOBAL", "Global"
        CATEGORY = "CATEGORY", "Categoria"
        PRODUCT = "PRODUCT", "Producto"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices, default=DiscountType.PERCENT)
    discount_value = models.DecimalField(max_digits=8, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    scope = models.CharField(max_length=16, choices=Scope.choices, default=Scope.GLOBAL)
    categories = models.ManyToManyField(Category, related_name="promotions", blank=True)
    products = models.ManyToManyField(Product, related_name="promotions", blank=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Promocion"
        verbose_name_plural = "Promociones"
        constraints = [
            CheckConstraint(check=Q(discount_value__gt=0), name="promotion_discount_gt_zero"),
            CheckConstraint(
                check=Q(discount_type="PERCENT", discount_value__lte=100)
                | Q(discount_type="AMOUNT"),
                name="promotion_percent_lte_100",
            ),
            CheckConstraint(
                check=Q(end_date__gt=F("start_date")) | Q(end_date__isnull=True),
                name="promotion_end_after_start",
            ),
        ]

    def __str__(self) -> str:
        return self.name

    def is_current(self, moment: timezone.datetime | None = None) -> bool:
        if not self.is_active:
            return False
        now = moment or timezone.now()
        if self.start_date and self.start_date > now:
            return False
        if self.end_date and self.end_date < now:
            return False
        return True

    def applies_to_product(self, product: Product) -> bool:
        if self.scope == self.Scope.GLOBAL:
            return True
        if self.scope == self.Scope.CATEGORY and product.category_id:
            return self.categories.filter(id=product.category_id).exists()
        if self.scope == self.Scope.PRODUCT:
            return self.products.filter(id=product.id).exists()
        return False
