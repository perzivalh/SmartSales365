from __future__ import annotations

from rest_framework import viewsets
from .utils import AuditLogViewSetMixin


class AuditableModelViewSet(AuditLogViewSetMixin, viewsets.ModelViewSet):
    """ModelViewSet que registra eventos CRUD en la bitacora."""

    def perform_create(self, serializer):
        instance = serializer.save()
        self.log_create(instance)
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        self.log_update(instance)
        return instance

    def perform_destroy(self, instance):
        self.log_delete(instance)
        return super().perform_destroy(instance)
