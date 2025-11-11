from django.conf import settings
from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PushToken",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("token", models.CharField(max_length=255, unique=True)),
                ("platform", models.CharField(max_length=20, choices=[("android", "Android"), ("ios", "IOS"), ("web", "Web")])),
                ("device_name", models.CharField(max_length=120, blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="push_tokens",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
        migrations.AddIndex(
            model_name="pushtoken",
            index=models.Index(fields=["platform"], name="notifications_platform_idx"),
        ),
        migrations.AddIndex(
            model_name="pushtoken",
            index=models.Index(fields=["user", "platform"], name="notifications_user_platform_idx"),
        ),
    ]
