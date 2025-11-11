"""ViewSets for push notifications."""
import logging

from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import PushToken, UserNotification
from .serializers import (
    PushTokenSerializer,
    UserNotificationSerializer,
    UserNotificationUpdateSerializer,
)

LOGGER = logging.getLogger(__name__)


class PushTokenViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = PushTokenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PushToken.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            LOGGER.warning("Push token payload invalid: data=%s errors=%s", request.data, serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class UserNotificationViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = UserNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = UserNotification.objects.filter(user=self.request.user)
        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            normalized = is_read.lower()
            if normalized in {"true", "1", "yes"}:
                queryset = queryset.filter(is_read=True)
            elif normalized in {"false", "0", "no"}:
                queryset = queryset.filter(is_read=False)
        return queryset.order_by("-created_at")

    def get_serializer_class(self):
        if self.action in {"update", "partial_update"}:
            return UserNotificationUpdateSerializer
        return super().get_serializer_class()

    def partial_update(self, request, *args, **kwargs):
        response = super().partial_update(request, *args, **kwargs)
        return response

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        updated = UserNotification.objects.filter(user=request.user, is_read=False).update(
            is_read=True,
            read_at=timezone.now(),
        )
        return Response({"updated": updated}, status=status.HTTP_200_OK)
