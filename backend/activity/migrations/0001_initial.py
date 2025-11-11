from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("event_type", models.CharField(choices=[("LOGIN", "Inicio de sesion"), ("LOGOUT", "Cierre de sesion"), ("CREATE", "Creacion"), ("UPDATE", "Actualizacion"), ("DELETE", "Eliminacion"), ("SYSTEM_ERROR", "Error del sistema"), ("ACTION", "Accion")], max_length=32)),
                ("entity_type", models.CharField(blank=True, max_length=120)),
                ("entity_id", models.CharField(blank=True, max_length=120)),
                ("description", models.TextField()),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("request_ip", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Registro de bitacora",
                "verbose_name_plural": "Registros de bitacora",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["event_type"], name="activity_a_event_t_7274a4_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["entity_type", "entity_id"], name="activity_a_entity__4f59b1_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["created_at"], name="activity_a_created__ec2d0e_idx"),
        ),
    ]
