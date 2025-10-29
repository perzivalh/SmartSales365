"""Serializers for customers app."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=get_user_model().objects.all())
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Customer
        fields = ["id", "user", "user_email", "phone", "doc_id", "created_at"]
        read_only_fields = ["id", "created_at", "user_email"]

