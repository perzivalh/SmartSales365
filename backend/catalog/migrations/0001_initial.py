import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=120, unique=True)),
                ("description", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["name"],
                "verbose_name": "Categoria",
                "verbose_name_plural": "Categorias",
            },
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=160)),
                ("sku", models.CharField(max_length=64, unique=True)),
                ("short_description", models.CharField(blank=True, max_length=300)),
                ("long_description", models.TextField(blank=True)),
                ("price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("stock", models.PositiveIntegerField()),
                ("width_cm", models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ("height_cm", models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ("weight_kg", models.DecimalField(decimal_places=3, default=0, max_digits=8)),
                ("is_active", models.BooleanField(default=True)),
                ("cover_image_url", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="products",
                        to="catalog.category",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Producto",
                "verbose_name_plural": "Productos",
            },
        ),
        migrations.CreateModel(
            name="ProductImage",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("url", models.TextField()),
                ("position", models.PositiveSmallIntegerField(default=0)),
                ("is_cover", models.BooleanField(default=False)),
                ("mime_type", models.CharField(blank=True, max_length=64, null=True)),
                ("size_bytes", models.IntegerField(blank=True, null=True)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="images",
                        to="catalog.product",
                    ),
                ),
            ],
            options={
                "ordering": ["position", "id"],
                "verbose_name": "Imagen de producto",
                "verbose_name_plural": "Imagenes de producto",
            },
        ),
        migrations.CreateModel(
            name="ProductFeature",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("label", models.CharField(max_length=120)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="features",
                        to="catalog.product",
                    ),
                ),
            ],
            options={
                "ordering": ["label"],
                "verbose_name": "Caracteristica",
                "verbose_name_plural": "Caracteristicas",
            },
        ),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.CheckConstraint(check=models.Q(("price__gt", 0)), name="product_price_gt_zero"),
        ),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.CheckConstraint(check=models.Q(("stock__gt", 0)), name="product_stock_gt_zero"),
        ),
        migrations.AddConstraint(
            model_name="productimage",
            constraint=models.CheckConstraint(
                check=models.Q(("size_bytes__lte", 10485760)) | models.Q(("size_bytes__isnull", True)),
                name="product_image_max_size",
            ),
        ),
    ]
