from __future__ import annotations

from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True)
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "event_type",
            "entity_type",
            "entity_id",
            "description",
            "metadata",
            "request_ip",
            "user_agent",
            "created_at",
            "actor",
            "actor_email",
            "actor_name",
        ]
        read_only_fields = fields

    def get_actor_name(self, obj: AuditLog) -> str | None:
        if not obj.actor:
            return None
        full_name = f"{obj.actor.first_name} {obj.actor.last_name}".strip()
        return full_name or obj.actor.email
