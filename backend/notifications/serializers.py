"""Serializers for notifications app."""
from rest_framework import serializers

from .models import PushToken, UserNotification


class PushTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushToken
        fields = ("id", "token", "platform", "device_name", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        user = self.context["request"].user
        token = validated_data["token"]
        PushToken.objects.filter(token=token).exclude(user=user).delete()
        instance, _ = PushToken.objects.update_or_create(
            token=token,
            defaults={
                "user": user,
                "platform": validated_data.get("platform", PushToken.Platform.ANDROID),
                "device_name": validated_data.get("device_name", ""),
            },
        )
        return instance


class UserNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotification
        fields = (
            "id",
            "title",
            "body",
            "category",
            "data",
            "is_read",
            "read_at",
            "created_at",
        )
        read_only_fields = fields


class UserNotificationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotification
        fields = ("is_read",)

    def update(self, instance, validated_data):
        if validated_data.get("is_read"):
            instance.mark_as_read()
            return instance
        return super().update(instance, validated_data)
