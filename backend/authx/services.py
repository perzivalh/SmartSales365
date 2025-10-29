"""Utility functions for user verification and emails."""
from __future__ import annotations

import random
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import EmailVerificationToken, User

CODE_TTL_MINUTES = 15


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def create_token(user: User, purpose: str) -> EmailVerificationToken:
    EmailVerificationToken.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)
    token = EmailVerificationToken.objects.create(
        user=user,
        purpose=purpose,
        code=_generate_code(),
        expires_at=timezone.now() + timedelta(minutes=CODE_TTL_MINUTES),
    )
    return token


def send_verification_email(user: User) -> EmailVerificationToken:
    token = create_token(user, EmailVerificationToken.Purpose.REGISTER)
    subject = "Codigo de verificacion SmartSales365"
    frontend_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
    body = (
        f"Hola {user.first_name or user.email},\n\n"
        f"Tu codigo de verificacion es: {token.code}.\n"
        f"Ingresa este codigo en la pantalla de verificacion para activar tu cuenta.\n\n"
        f"Tambien puedes ir a: {frontend_url}/verify-email\n\n"
        "Este codigo caduca en 15 minutos.\n\n"
        "Equipo SmartSales365"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email])
    return token


def send_password_reset_email(user: User) -> EmailVerificationToken:
    token = create_token(user, EmailVerificationToken.Purpose.PASSWORD_RESET)
    subject = "Codigo para restablecer contrasena SmartSales365"
    frontend_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
    body = (
        f"Hola {user.first_name or user.email},\n\n"
        f"Tu codigo para restablecer la contrasena es: {token.code}.\n"
        f"Ingresa este codigo junto con tu nueva contrasena en {frontend_url}/reset-password.\n\n"
        f"El codigo caduca en 15 minutos.\n\n"
        "Si no solicitaste este cambio, ignora este correo.\n\n"
        "Equipo SmartSales365"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email])
    return token


def validate_token(email: str, code: str, purpose: str) -> EmailVerificationToken:
    try:
        token = EmailVerificationToken.objects.select_related("user").get(
            user__email=email.lower(), code=code, purpose=purpose
        )
    except EmailVerificationToken.DoesNotExist as exc:
        raise ValueError("Codigo invalido.") from exc

    if token.is_used:
        raise ValueError("El codigo ya fue utilizado.")
    if token.is_expired:
        raise ValueError("El codigo ha expirado.")
    return token
