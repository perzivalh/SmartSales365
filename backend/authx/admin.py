"""Admin configuration for authx models."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import EmailVerificationToken, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "is_staff",
        "is_email_verified",
        "created_at",
    )
    list_filter = ("role", "is_active", "is_staff", "is_email_verified")
    search_fields = ("email", "first_name", "last_name")
    readonly_fields = ("created_at", "updated_at", "last_login")

    fieldsets = (
        (_("Credenciales"), {"fields": ("email", "password")}),
        (_("Informacion personal"), {"fields": ("first_name", "last_name", "role")}),
        (
            _("Permisos"),
            {"fields": ("is_active", "is_staff", "is_superuser", "is_email_verified", "groups", "user_permissions")},
        ),
        (_("Fechas"), {"fields": ("last_login", "created_at", "updated_at")}),
    )

    add_fieldsets = (
        (
            _("Nuevo usuario"),
            {
                "classes": ("wide",),
                "fields": ("email", "role", "password1", "password2", "is_active", "is_staff"),
            },
        ),
    )

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        if not request.user.is_superuser:
            return tuple(
                (title, {**config, "fields": tuple(field for field in config["fields"] if field != "is_superuser")})
                for title, config in fieldsets
            )
        return fieldsets


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "purpose", "code", "is_used", "expires_at", "created_at")
    list_filter = ("purpose", "is_used")
    search_fields = ("user__email", "code")
    readonly_fields = ("code", "purpose", "expires_at", "created_at")
