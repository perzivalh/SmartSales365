import uuid

import django.db.models.deletion
from django.db import migrations, models

import authx.managers


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("email", models.EmailField(max_length=255, unique=True)),
                ("first_name", models.CharField(blank=True, max_length=150)),
                ("last_name", models.CharField(blank=True, max_length=150)),
                (
                    "role",
                    models.CharField(
                        choices=[("ADMIN", "Administrador"), ("CLIENT", "Cliente")],
                        default="CLIENT",
                        max_length=20,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("is_staff", models.BooleanField(default=False)),
                ("is_email_verified", models.BooleanField(default=False)),
                (
                    "is_superuser",
                    models.BooleanField(
                        default=False,
                        help_text="Designates that this user has all permissions without explicitly assigning them.",
                        verbose_name="superuser status",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "groups",
                    models.ManyToManyField(
                        blank=True,
                        help_text="The groups this user belongs to.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.group",
                        verbose_name="groups",
                    ),
                ),
                (
                    "user_permissions",
                    models.ManyToManyField(
                        blank=True,
                        help_text="Specific permissions for this user.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.permission",
                        verbose_name="user permissions",
                    ),
                ),
            ],
            options={
                "ordering": ["email"],
                "verbose_name": "Usuario",
                "verbose_name_plural": "Usuarios",
            },
            managers=[
                ("objects", authx.managers.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name="EmailVerificationToken",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=6)),
                (
                    "purpose",
                    models.CharField(
                        choices=[("REGISTER", "Registro"), ("PASSWORD_RESET", "Recuperacion de contrasena")],
                        max_length=32,
                    ),
                ),
                ("expires_at", models.DateTimeField()),
                ("is_used", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="verification_tokens",
                        to="authx.user",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Token de verificacion",
                "verbose_name_plural": "Tokens de verificacion",
            },
        ),
        migrations.AddIndex(
            model_name="emailverificationtoken",
            index=models.Index(fields=["user", "purpose", "is_used"], name="authx_email_user_pu_9acf76_idx"),
        ),
    ]
