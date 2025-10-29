"""Catalog API tests."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from catalog.models import Category, Product, ProductImage


class ProductAPITests(APITestCase):
    def setUp(self):
        self.admin_email = "admin@example.com"
        self.admin_password = "Admin123!"
        self.admin = get_user_model().objects.create_user(
            email=self.admin_email,
            password=self.admin_password,
            role="ADMIN",
            is_staff=True,
            is_email_verified=True,
        )
        self.category = Category.objects.create(name="Electro", description="Electrodomesticos")

    def _get_token(self) -> str:
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": self.admin_email, "password": self.admin_password},
            format="json",
        )
        return response.data["access"]

    def test_create_product_with_nested_relations(self):
        token = self._get_token()
        url = reverse("product-list")
        payload = {
            "category": str(self.category.id),
            "name": "Lavavajillas Smart",
            "sku": "LAVA-1234",
            "short_description": "Ahorra agua y tiempo.",
            "long_description": "Lavavajillas inteligente con 10 programas.",
            "price": "499.99",
            "stock": 10,
            "width_cm": "60.00",
            "height_cm": "85.00",
            "weight_kg": "55.500",
            "is_active": True,
            "images": [
                {"url": "https://picsum.photos/seed/dw1/800/600", "position": 0, "is_cover": True},
                {"url": "https://picsum.photos/seed/dw2/800/600", "position": 1, "is_cover": False},
            ],
            "features": [
                {"label": "10 programas"},
                {"label": "Motor inverter"},
            ],
        }
        response = self.client.post(
            url,
            payload,
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        product = Product.objects.get(sku="LAVA-1234")
        self.assertEqual(product.images.count(), 2)
        self.assertEqual(product.features.count(), 2)
        cover = product.images.filter(is_cover=True).first()
        self.assertIsNotNone(cover)
        self.assertEqual(product.cover_image_url, cover.url)

    def test_public_product_list_shows_only_active(self):
        active_product = Product.objects.create(
            category=self.category,
            name="Producto Activo",
            sku="PROD-ACT1",
            short_description="Activo",
            long_description="Producto activo visible.",
            price=Decimal("10.00"),
            stock=5,
            is_active=True,
        )
        inactive_product = Product.objects.create(
            category=self.category,
            name="Producto Inactivo",
            sku="PROD-INAC1",
            short_description="Inactivo",
            long_description="Producto inactivo oculto.",
            price=Decimal("12.00"),
            stock=3,
            is_active=False,
        )
        ProductImage.objects.create(product=active_product, url="https://picsum.photos/seed/act/800/600", is_cover=True)
        ProductImage.objects.create(product=inactive_product, url="https://picsum.photos/seed/inac/800/600", is_cover=True)

        response = self.client.get(reverse("product-list"), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        skus = [item["sku"] for item in response.data["results"]]
        self.assertIn(active_product.sku, skus)
        self.assertNotIn(inactive_product.sku, skus)
