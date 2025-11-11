"""Serializers for authx app."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from customers.models import Customer

from .models import EmailVerificationToken, User
from .services import send_verification_email, validate_token


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
            "is_active",
            "is_staff",
            "is_email_verified",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_staff", "is_email_verified", "created_at", "updated_at"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        email = validated_data.get("email")
        if email:
            validated_data["email"] = email.lower()
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.is_staff = user.role == User.Roles.ADMIN
        user.save()
        send_verification_email(user)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        should_send_verification = False

        if "email" in validated_data:
            new_email = validated_data["email"].lower()
            if new_email != instance.email:
                instance.email = new_email
                should_send_verification = True
        for attr, value in validated_data.items():
            if attr == "email":
                continue
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
            should_send_verification = True

        if should_send_verification:
            instance.is_email_verified = False
        instance.is_staff = instance.role == User.Roles.ADMIN
        instance.save()
        if should_send_verification:
            send_verification_email(instance)
        return instance


class EmailAwareTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_email_verified:
            send_verification_email(self.user)
            raise AuthenticationFailed(
                {"detail": "Email no verificado. Revisa tu bandeja de entrada.", "code": "email_not_verified"}
            )
        return data


class EmailVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)

    def validate(self, attrs):
        try:
            token = validate_token(
                attrs["email"],
                attrs["code"],
                EmailVerificationToken.Purpose.REGISTER,
            )
        except ValueError as exc:
            raise serializers.ValidationError({"code": str(exc)}) from exc
        attrs["token"] = token
        return attrs


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        user_model = get_user_model()
        try:
            user = user_model.objects.get(email=value.lower())
        except user_model.DoesNotExist as exc:
            raise serializers.ValidationError("No encontramos una cuenta con este correo.") from exc
        if user.is_email_verified:
            raise serializers.ValidationError("La cuenta ya esta verificada.")
        self.context["user"] = user
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        user_model = get_user_model()
        try:
            user = user_model.objects.get(email=value.lower())
        except user_model.DoesNotExist as exc:
            raise serializers.ValidationError("No encontramos una cuenta con este correo.") from exc
        self.context["user"] = user
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    password = serializers.CharField(write_only=True, min_length=6)

    def validate(self, attrs):
        try:
            token = validate_token(
                attrs["email"],
                attrs["code"],
                EmailVerificationToken.Purpose.PASSWORD_RESET,
            )
        except ValueError as exc:
            raise serializers.ValidationError({"code": str(exc)}) from exc
        attrs["token"] = token
        return attrs

    def save(self):
        token = self.validated_data["token"]
        user = token.user
        password = self.validated_data["password"]
        user.set_password(password)
        user.is_email_verified = True
        user.save(update_fields=["password", "is_email_verified", "updated_at"])
        token.is_used = True
        token.save(update_fields=["is_used"])
        return user


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    doc_id = serializers.CharField(max_length=30, required=False, allow_blank=True)

    def validate_email(self, value: str):
        user_model = get_user_model()
        email = value.lower()
        if user_model.objects.filter(email=email).exists():
            raise serializers.ValidationError("Ya existe una cuenta con este email.")
        return email

    def create(self, validated_data):
        user_model = get_user_model()
        password = validated_data.pop("password")
        phone = validated_data.pop("phone", "")
        doc_id = validated_data.pop("doc_id", "")
        email = validated_data.pop("email")

        user = user_model.objects.create_user(
            email=email,
            password=password,
            role=User.Roles.CLIENT,
            is_active=False,
            is_email_verified=False,
            **validated_data,
        )

        Customer.objects.create(user=user, phone=phone, doc_id=doc_id)
        send_verification_email(user)
        return user


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "is_email_verified", "created_at", "updated_at"]


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("La contrasena actual no es correcta.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        new_password = self.validated_data["new_password"]
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        return user
