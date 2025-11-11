from __future__ import annotations

import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from catalog.models import Product


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "PENDING_PAYMENT", "Pendiente de pago"
        PAID = "PAID", "Pagado"
        FAILED = "FAILED", "Pago fallido"
        CANCELED = "CANCELED", "Cancelado"

    class FulfillmentStatus(models.TextChoices):
        PENDING = "PENDING", "Pendiente"
        PROCESSING = "PROCESSING", "En proceso"
        IN_TRANSIT = "IN_TRANSIT", "En camino"
        DELIVERED = "DELIVERED", "Entregado"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=20, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="orders",
        null=True,
        blank=True,
    )
    customer_email = models.EmailField()
    customer_name = models.CharField(max_length=160)
    customer_phone = models.CharField(max_length=30, blank=True)
    shipping_address_line1 = models.CharField(max_length=160)
    shipping_address_line2 = models.CharField(max_length=160, blank=True)
    shipping_city = models.CharField(max_length=80)
    shipping_state = models.CharField(max_length=80, blank=True)
    shipping_postal_code = models.CharField(max_length=20, blank=True)
    shipping_country = models.CharField(max_length=2)
    notes = models.TextField(blank=True)

    subtotal_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    shipping_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3, default="USD")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING_PAYMENT)
    fulfillment_status = models.CharField(
        max_length=20,
        choices=FulfillmentStatus.choices,
        default=FulfillmentStatus.PENDING,
    )
    stripe_payment_intent_id = models.CharField(max_length=128, blank=True, null=True, unique=True)
    stripe_client_secret = models.CharField(max_length=200, blank=True)
    receipt_url = models.URLField(blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Pedido"
        verbose_name_plural = "Pedidos"

    def save(self, *args, **kwargs):
        if not self.number:
            timestamp = timezone.now().strftime("%Y%m%d")
            random_suffix = uuid.uuid4().hex[:4].upper()
            self.number = f"ORD-{timestamp}-{random_suffix}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Orden {self.number}"

    def mark_as_paid(self, receipt_url: str | None = None) -> None:
        self.status = self.Status.PAID
        if self.fulfillment_status == self.FulfillmentStatus.PENDING:
            self.fulfillment_status = self.FulfillmentStatus.PROCESSING
        self.paid_at = timezone.now()
        if receipt_url:
            self.receipt_url = receipt_url
        self.save(update_fields=["status", "fulfillment_status", "paid_at", "receipt_url", "updated_at"])

    def mark_as_failed(self) -> None:
        self.status = self.Status.FAILED
        self.save(update_fields=["status", "updated_at"])

    def update_fulfillment_status(self, new_status: str) -> None:
        if new_status not in self.FulfillmentStatus.values:
            raise ValueError("Estado de entrega no válido.")
        self.fulfillment_status = new_status
        self.save(update_fields=["fulfillment_status", "updated_at"])


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    product_name = models.CharField(max_length=160)
    product_sku = models.CharField(max_length=64)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    total_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    promotion_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["product_name"]
        verbose_name = "Linea de pedido"
        verbose_name_plural = "Lineas de pedido"

    def __str__(self) -> str:
        return f"{self.product_name} x{self.quantity}"


class OrderPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    stripe_payment_intent_id = models.CharField(max_length=128)
    status = models.CharField(max_length=32)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3)
    receipt_url = models.URLField(blank=True)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Pago de pedido"
        verbose_name_plural = "Pagos de pedido"

    def __str__(self) -> str:
        return f"Pago {self.stripe_payment_intent_id} ({self.status})"

# Create your models here.
