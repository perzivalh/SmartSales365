"""Models for push notifications."""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class PushToken(models.Model):
    """Stores Firebase Cloud Messaging tokens per user/device."""

    class Platform(models.TextChoices):
        ANDROID = "android", "Android"
        IOS = "ios", "iOS"
        WEB = "web", "Web"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="push_tokens",
    )
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=20, choices=Platform.choices)
    device_name = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["platform"]),
            models.Index(fields=["user", "platform"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.platform}"


class UserNotification(models.Model):
    class Category(models.TextChoices):
        SYSTEM = "SYSTEM", "Sistema"
        PAYMENT = "PAYMENT", "Pago"
        ORDER_STATUS = "ORDER_STATUS", "Estado de pedido"
        PROMOTION = "PROMOTION", "Promoción"
        RECOMMENDATION = "RECOMMENDATION", "Recomendación"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=160)
    body = models.TextField()
    category = models.CharField(max_length=32, choices=Category.choices, default=Category.SYSTEM)
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read"]),
        ]

    def mark_as_read(self) -> None:
        if self.is_read:
            return
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=["is_read", "read_at"])

    def __str__(self) -> str:
        return f"Notificación {self.title} ({self.user.email})"
