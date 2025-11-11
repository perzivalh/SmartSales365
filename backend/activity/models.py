"""Models for activity logging."""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Stores audit events (bitacora)."""

    class EventType(models.TextChoices):
        LOGIN = "LOGIN", "Inicio de sesion"
        LOGOUT = "LOGOUT", "Cierre de sesion"
        CREATE = "CREATE", "Creacion"
        UPDATE = "UPDATE", "Actualizacion"
        DELETE = "DELETE", "Eliminacion"
        SYSTEM_ERROR = "SYSTEM_ERROR", "Error del sistema"
        ACTION = "ACTION", "Accion"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        null=True,
        blank=True,
    )
    event_type = models.CharField(max_length=32, choices=EventType.choices)
    entity_type = models.CharField(max_length=120, blank=True)
    entity_id = models.CharField(max_length=120, blank=True)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    request_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_type"]),
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["created_at"]),
        ]
        verbose_name = "Registro de bitacora"
        verbose_name_plural = "Registros de bitacora"

    def __str__(self) -> str:
        return f"{self.event_type} - {self.entity_type} - {self.created_at:%Y-%m-%d %H:%M:%S}"
