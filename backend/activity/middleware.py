from __future__ import annotations

import traceback
from typing import Callable

from django.http import HttpRequest, HttpResponse

from .models import AuditLog
from .utils import record_event


class AuditLogMiddleware:
    """Middleware that logs unhandled exceptions as system errors."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        try:
            response = self.get_response(request)
        except Exception as exc:
            actor = None
            user = getattr(request, "user", None)
            if getattr(user, "is_authenticated", False):
                actor = user

            metadata = {
                "path": request.path,
                "method": request.method,
                "traceback": "\n".join(traceback.format_exc().splitlines()[-10:]),
            }

            record_event(
                event_type=AuditLog.EventType.SYSTEM_ERROR,
                description=str(exc)[:500] or exc.__class__.__name__,
                actor=actor,
                metadata=metadata,
                request=request,
            )
            raise
        return response
