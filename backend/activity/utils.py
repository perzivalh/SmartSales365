from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model

from .models import AuditLog

User = get_user_model()


def record_event(
    *,
    event_type: str,
    description: str,
    actor: User | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    request=None,
) -> AuditLog:
    """Create an audit log entry."""

    request_ip = None
    user_agent = ""
    if request is not None:
        request_ip = getattr(request, "META", {}).get("REMOTE_ADDR")
        user_agent = getattr(request, "META", {}).get("HTTP_USER_AGENT", "")

    return AuditLog.objects.create(
        actor=actor,
        event_type=event_type,
        entity_type=entity_type or "",
        entity_id=entity_id or "",
        description=description,
        metadata=metadata or {},
        request_ip=request_ip,
        user_agent=user_agent[:255],
    )


class AuditLogViewSetMixin:
    """Mixin for ModelViewSets to record CRUD events automatically."""

    audit_entity: str | None = None

    def _audit_entity(self, instance) -> str:
        return self.audit_entity or instance.__class__.__name__

    def _audit_actor(self):
        user = getattr(self.request, "user", None)
        if getattr(user, "is_authenticated", False):
            return user
        return None

    def _audit_metadata(self, extra: dict[str, Any] | None = None) -> dict[str, Any]:
        metadata = {
            "path": getattr(self.request, "path", ""),
            "method": getattr(self.request, "method", ""),
        }
        if extra:
            metadata.update(extra)
        return metadata

    def log_create(self, instance, extra: dict[str, Any] | None = None) -> None:
        record_event(
            event_type=AuditLog.EventType.CREATE,
            description=f"{self._audit_entity(instance)} creado.",
            actor=self._audit_actor(),
            entity_type=self._audit_entity(instance),
            entity_id=str(getattr(instance, "pk", "")),
            metadata=self._audit_metadata(extra),
            request=self.request,
        )

    def log_update(self, instance, extra: dict[str, Any] | None = None) -> None:
        record_event(
            event_type=AuditLog.EventType.UPDATE,
            description=f"{self._audit_entity(instance)} actualizado.",
            actor=self._audit_actor(),
            entity_type=self._audit_entity(instance),
            entity_id=str(getattr(instance, "pk", "")),
            metadata=self._audit_metadata(extra),
            request=self.request,
        )

    def log_delete(self, instance, extra: dict[str, Any] | None = None) -> None:
        record_event(
            event_type=AuditLog.EventType.DELETE,
            description=f"{self._audit_entity(instance)} eliminado.",
            actor=self._audit_actor(),
            entity_type=self._audit_entity(instance),
            entity_id=str(getattr(instance, "pk", "")),
            metadata=self._audit_metadata(extra),
            request=self.request,
        )
