"""Helpers to send push notifications via Firebase."""
from __future__ import annotations

import logging
from typing import Iterable, Mapping, Sequence

import firebase_admin
from django.conf import settings
from firebase_admin import credentials, messaging

from .models import PushToken, UserNotification
from django.contrib.auth import get_user_model

LOGGER = logging.getLogger(__name__)
_firebase_app = None
User = get_user_model()


def _create_notifications_for_users(
    user_ids: Sequence[str],
    title: str,
    body: str,
    data: Mapping[str, str] | None,
    category: str,
) -> None:
    if not user_ids:
        return
    users = User.objects.filter(id__in=user_ids)
    notifications = [
        UserNotification(
            user=user,
            title=title,
            body=body,
            category=category,
            data=data or {},
        )
        for user in users
    ]
    if notifications:
        UserNotification.objects.bulk_create(notifications)


def _initialize_firebase() -> None:
    global _firebase_app
    if _firebase_app is not None:
        return

    project_id = getattr(settings, "FIREBASE_PROJECT_ID", None)
    client_email = getattr(settings, "FIREBASE_CLIENT_EMAIL", None)
    private_key = getattr(settings, "FIREBASE_PRIVATE_KEY", None)

    if not all([project_id, client_email, private_key]):
        LOGGER.warning("Firebase credentials not configured. Push notifications disabled.")
        return

    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": project_id,
            "private_key_id": "ignored",
            "private_key": private_key.replace("\\n", "\n"),
            "client_email": client_email,
            "client_id": "ignored",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "",
        }
    )
    _firebase_app = firebase_admin.initialize_app(cred, {"projectId": project_id})


def _ensure_firebase() -> bool:
    if _firebase_app is not None:
        return True
    _initialize_firebase()
    return _firebase_app is not None


def send_push_to_tokens(tokens: Iterable[str], title: str, body: str, data: Mapping[str, str] | None = None) -> None:
    tokens_list = [token for token in tokens if token]
    if not tokens_list:
        return
    if not _ensure_firebase():
        return
    message = messaging.MulticastMessage(
        tokens=tokens_list,
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
    )
    try:
        send_multicast = getattr(messaging, "send_multicast", None)
        if callable(send_multicast):
            send_multicast(message, app=_firebase_app)
        else:
            messaging.send_each_for_multicast(message, app=_firebase_app)
    except Exception as exc:
        LOGGER.exception("Error sending push notification: %s", exc)


def send_push_to_user(
    user,
    title: str,
    body: str,
    data: Mapping[str, str] | None = None,
    category: str = UserNotification.Category.SYSTEM,
) -> None:
    if user is None:
        return
    _create_notifications_for_users([user.id], title, body, data, category)
    tokens = PushToken.objects.filter(user=user).values_list("token", flat=True)
    send_push_to_tokens(tokens, title, body, data=data)


def send_push_to_all(
    title: str,
    body: str,
    data: Mapping[str, str] | None = None,
    category: str = UserNotification.Category.SYSTEM,
) -> None:
    tokens = PushToken.objects.values_list("token", flat=True)
    send_push_to_tokens(tokens, title, body, data=data)
    user_ids = (
        PushToken.objects.exclude(user__isnull=True)
        .values_list("user_id", flat=True)
        .distinct()
    )
    _create_notifications_for_users(list(user_ids), title, body, data, category)
