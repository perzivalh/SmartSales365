"""Tests for authentication endpoints."""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class JWTAuthTests(APITestCase):
    def setUp(self):
        self.email = "admin@test.com"
        self.password = "Admin123!"
        user = get_user_model().objects.create_user(
            email=self.email,
            password=self.password,
            role="ADMIN",
            is_staff=True,
            is_email_verified=True,
        )
        user.save()

    def test_obtain_jwt_token(self):
        url = reverse("token_obtain_pair")
        response = self.client.post(url, {"email": self.email, "password": self.password}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
