from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, viewsets
from rest_framework.permissions import IsAdminUser

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Read-only viewset for audit logs."""

    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    queryset = AuditLog.objects.select_related("actor").all()
    ordering = "-created_at"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["event_type", "entity_type"]
    search_fields = ["description", "entity_type", "entity_id", "actor__email"]
