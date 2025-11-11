from django.contrib import admin

from .models import PushToken, UserNotification


@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "platform", "device_name", "updated_at")
    search_fields = ("user__email", "device_name", "token")
    list_filter = ("platform",)


@admin.register(UserNotification)
class UserNotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "category", "is_read", "created_at")
    search_fields = ("title", "body", "user__email")
    list_filter = ("category", "is_read")
