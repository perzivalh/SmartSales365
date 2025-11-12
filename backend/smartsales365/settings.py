"""Django settings for SmartSales365 project."""
from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")
load_dotenv()

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "changeme-in-production")
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = [host.strip() for host in os.getenv("ALLOWED_HOSTS", "*").split(",") if host.strip()]

if "*" not in ALLOWED_HOSTS:
  for host in {"localhost", "127.0.0.1", "[::1]", "192.168.0.10"}:
    if host not in ALLOWED_HOSTS:
      ALLOWED_HOSTS.append(host)


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "drf_spectacular",
    "corsheaders",
    "smartsales365.apps.Smartsales365Config",
    "authx",
    "catalog",
    "customers",
    "orders",
    "reports",
    "activity",
    "notifications",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "activity.middleware.AuditLogMiddleware",
]

ROOT_URLCONF = "smartsales365.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "smartsales365.wsgi.application"

def _database_config_from_connection_string(connection_url: str) -> dict[str, object]:
    parsed = urlparse(connection_url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ValueError("DB_CONNECTION_STRING must use the postgres/postgresql scheme.")

    options = {
        key: values[-1]
        for key, values in parse_qs(parsed.query).items()
        if values and values[-1] is not None
    }

    config: dict[str, object] = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": (parsed.path or "").lstrip("/") or os.getenv("DB_NAME", "smartsales365"),
        "USER": parsed.username or os.getenv("DB_USER", "postgres"),
        "PASSWORD": parsed.password or os.getenv("DB_PASS", "postgres"),
        "HOST": parsed.hostname or os.getenv("DB_HOST", "localhost"),
        "PORT": str(parsed.port or os.getenv("DB_PORT", "5432")),
    }
    if options:
        config["OPTIONS"] = options
    return config


db_connection_string = os.getenv("DB_CONNECTION_STRING")

DATABASES = {
    "default": _database_config_from_connection_string(db_connection_string)
    if db_connection_string
    else {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
        "NAME": os.getenv("DB_NAME", "smartsales365"),
        "USER": os.getenv("DB_USER", "postgres"),
        "PASSWORD": os.getenv("DB_PASS", "postgres"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "es-es"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "authx.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=14),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=180),
    "TOKEN_OBTAIN_SERIALIZER": "authx.serializers.EmailAwareTokenObtainPairSerializer",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "SmartSales365 API",
    "DESCRIPTION": "Backend API para la plataforma SmartSales365.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVERS": [
        {"url": "http://localhost:8000", "description": "Servidor local"},
    ],
}

cors_origin_env = os.getenv("CORS_ALLOWED_ORIGINS")

CORS_ALLOWED_ORIGINS = (
    [origin.strip() for origin in cors_origin_env.split(",") if origin.strip()]
    if cors_origin_env
    else [
        "http://localhost:5173",
    ]
)
CORS_ALLOW_CREDENTIALS = True

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "25"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "false").lower() == "true"
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "false").lower() == "true"
DEFAULT_FROM_EMAIL = os.getenv("EMAIL_FROM", EMAIL_HOST_USER)
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "30"))

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", DEFAULT_FROM_EMAIL)
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "SmartSales365")
BREVO_USE_SMTP_FALLBACK = os.getenv("BREVO_USE_SMTP_FALLBACK", "false").lower() == "true"

# Debug print to verify SMTP config in different environments
print(
    "[SMTP CONFIG]",
    f"HOST={EMAIL_HOST}",
    f"PORT={EMAIL_PORT}",
    f"USER={EMAIL_HOST_USER}",
    f"TLS={EMAIL_USE_TLS}",
    f"SSL={EMAIL_USE_SSL}",
    flush=True,
)

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL")
AWS_S3_PUBLIC_DOMAIN = os.getenv("AWS_S3_PUBLIC_DOMAIN")
AWS_S3_UPLOAD_ACL = os.getenv("AWS_S3_UPLOAD_ACL", "public-read")

if AWS_S3_BUCKET and not AWS_S3_PUBLIC_DOMAIN:
    region_segment = f".{AWS_REGION}" if AWS_REGION else ""
    AWS_S3_PUBLIC_DOMAIN = f"https://{AWS_S3_BUCKET}.s3{region_segment}.amazonaws.com"

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLIC_KEY = os.getenv("STRIPE_PUBLIC_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
DEFAULT_CURRENCY = os.getenv("DEFAULT_CURRENCY", "USD").upper()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_CLIENT_EMAIL = os.getenv("FIREBASE_CLIENT_EMAIL")
FIREBASE_PRIVATE_KEY = os.getenv("FIREBASE_PRIVATE_KEY", "")
