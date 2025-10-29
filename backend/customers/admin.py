"""Admin registration for customer profiles."""
from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("user", "phone", "doc_id", "created_at")
    search_fields = ("user__email", "phone", "doc_id")
    readonly_fields = ("created_at",)

