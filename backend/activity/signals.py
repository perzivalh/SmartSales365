from __future__ import annotations

from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver

from .models import AuditLog
from .utils import record_event


@receiver(user_logged_in)
def log_user_login(sender, user, request, **kwargs):
    record_event(
        event_type=AuditLog.EventType.LOGIN,
        description="Inicio de sesion exitoso.",
        actor=user,
        metadata={"path": getattr(request, "path", "")},
        request=request,
    )


@receiver(user_logged_out)
def log_user_logout(sender, user, request, **kwargs):
    record_event(
        event_type=AuditLog.EventType.LOGOUT,
        description="Cierre de sesion.",
        actor=user,
        metadata={"path": getattr(request, "path", "")},
        request=request,
    )
