"""Models for catalog domain."""
from __future__ import annotations

import uuid

from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.db.models import CheckConstraint, Q


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
