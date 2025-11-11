"""Signals for catalog app."""
from __future__ import annotations

from datetime import timedelta
import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from notifications.models import UserNotification
from notifications.services import send_push_to_all

from .models import Promotion, Product

LOGGER = logging.getLogger(__name__)


def _schedule_promotion_notification(instance: Promotion, title: str, body: str) -> None:
    def _send():
        LOGGER.info("Enviando notificacion de promocion %s", instance.id)
        send_push_to_all(
            title,
            body,
            data={"promotion_id": str(instance.id), "type": "promotion"},
            category=UserNotification.Category.PROMOTION,
        )

    transaction.on_commit(_send)


@receiver(post_save, sender=Promotion)
def promotion_push_notifications(sender, instance: Promotion, created: bool, **kwargs):
    if not instance.is_active:
        return
    title = None
    body = None
    if created:
        title = f"Nueva promocion: {instance.name}"
        body = instance.description[:120] if instance.description else "Aprovecha antes de que termine."
    else:
        if instance.end_date:
            now = timezone.now()
            if instance.end_date > now and instance.end_date - now <= timedelta(days=1):
                title = f"La promo '{instance.name}' vence pronto"
                body = "Tienes menos de 24h para aprovechar este descuento."
    if title and body:
        _schedule_promotion_notification(instance, title, body)


@receiver(post_save, sender=Product)
def product_recommendation_notification(sender, instance: Product, created: bool, **kwargs):
    if not created or not instance.is_active:
        return

    def _send():
        send_push_to_all(
            f"Nuevo producto: {instance.name}",
            instance.short_description[:120] if instance.short_description else "Descubre las novedades para ti.",
            data={"product_id": str(instance.id), "type": "product"},
            category=UserNotification.Category.RECOMMENDATION,
        )

    transaction.on_commit(_send)
