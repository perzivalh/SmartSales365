"""Seed command to populate demo data."""
from __future__ import annotations

from decimal import Decimal
from typing import Dict, List

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from authx.models import User
from catalog.models import Category, Product
from catalog.serializers import ProductSerializer
from customers.models import Customer


class Command(BaseCommand):
    help = "Crea datos de demostracion para SmartSales365."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Iniciando seed de datos...")
        admin_user = self._ensure_admin()
        categories = self._ensure_categories()
        self._ensure_products(categories)
        self._ensure_customers()
        self.stdout.write(self.style.SUCCESS(f"Seed completado. Superusuario: {admin_user.email} / Admin123!"))

    def _ensure_admin(self) -> User:
        user_model = get_user_model()
        admin_email = "admin@demo.com"
        admin_password = "Admin123!"
        admin_user, created = user_model.objects.get_or_create(
            email=admin_email,
            defaults={
                "first_name": "Admin",
                "last_name": "Demo",
                "role": User.Roles.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_email_verified": True,
            },
        )
        if created:
            admin_user.set_password(admin_password)
            admin_user.save()
            self.stdout.write("Superusuario admin@demo.com creado.")
        elif not admin_user.check_password(admin_password):
            admin_user.set_password(admin_password)
            admin_user.save()
            self.stdout.write("Contrasena del superusuario restablecida.")
        return admin_user

    def _ensure_categories(self) -> Dict[str, Category]:
        categories_data = [
            {
                "name": "Electrodomesticos",
                "description": "Linea blanca y equipos inteligentes para el hogar.",
            },
            {
                "name": "Cocina Inteligente",
                "description": "Equipos de cocina conectados y de alto rendimiento.",
            },
            {
                "name": "Cuidado del Hogar",
                "description": "Soluciones para limpieza y confort en casa.",
            },
        ]
        categories: Dict[str, Category] = {}
        for data in categories_data:
            category, _ = Category.objects.get_or_create(
                name=data["name"],
                defaults={"description": data["description"]},
            )
            categories[data["name"]] = category
        self.stdout.write(f"{len(categories)} categorias listas.")
        return categories

    def _ensure_products(self, categories: Dict[str, Category]) -> None:
        products_data: List[Dict] = [
            {
                "name": "Refrigerador Side by Side",
                "sku": "REF-SS365-01",
                "category": categories["Electrodomesticos"],
                "short_description": "Tecnologia inverter con ahorro energetico.",
                "long_description": "Refrigerador de gran capacidad con pantalla tactil y dispensador de agua.",
                "price": Decimal("1299.00"),
                "stock": 15,
                "width_cm": Decimal("90.0"),
                "height_cm": Decimal("178.0"),
                "weight_kg": Decimal("95.0"),
                "images": [
                    {"url": "https://picsum.photos/seed/ref1/800/600", "position": 0, "is_cover": True},
                    {"url": "https://picsum.photos/seed/ref2/800/600", "position": 1},
                ],
                "features": ["Motor digital inverter", "Pantalla tactil", "Dispensador de agua"],
            },
            {
                "name": "Lavadora Carga Frontal 12kg",
                "sku": "LAV-FR365-02",
                "category": categories["Electrodomesticos"],
                "short_description": "Lavado rapido con vapor.",
                "long_description": "Equipo eficiente con 14 ciclos de lavado y conectividad Wi-Fi.",
                "price": Decimal("899.00"),
                "stock": 25,
                "width_cm": Decimal("60.0"),
                "height_cm": Decimal("85.0"),
                "weight_kg": Decimal("70.0"),
                "images": [
                    {"url": "https://picsum.photos/seed/lav1/800/600", "position": 0, "is_cover": True},
                    {"url": "https://picsum.photos/seed/lav2/800/600", "position": 1},
                ],
                "features": ["Funcion vapor", "Wi-Fi integrado", "Tambor inoxidable"],
            },
            {
                "name": "Microondas Inteligente 1.1 pies",
                "sku": "MIC-CO365-03",
                "category": categories["Cocina Inteligente"],
                "short_description": "Control por voz y recetario inteligente.",
                "long_description": "Microondas con integracion Alexa/Google y sensores de coccion.",
                "price": Decimal("199.00"),
                "stock": 40,
                "width_cm": Decimal("45.0"),
                "height_cm": Decimal("30.0"),
                "weight_kg": Decimal("18.0"),
                "images": [
                    {"url": "https://picsum.photos/seed/mic1/800/600", "position": 0, "is_cover": True},
                    {"url": "https://picsum.photos/seed/mic2/800/600", "position": 1},
                ],
                "features": ["Control por voz", "Sensor automatico", "Programas personalizados"],
            },
            {
                "name": "Horno Electrico Premium",
                "sku": "HOR-EL365-04",
                "category": categories["Cocina Inteligente"],
                "short_description": "Conveccion y limpieza pirolitica.",
                "long_description": "Horno electrico de acero inoxidable con conectividad movil.",
                "price": Decimal("749.00"),
                "stock": 12,
                "width_cm": Decimal("59.0"),
                "height_cm": Decimal("60.0"),
                "weight_kg": Decimal("55.0"),
                "images": [
                    {"url": "https://picsum.photos/seed/hor1/800/600", "position": 0, "is_cover": True},
                    {"url": "https://picsum.photos/seed/hor2/800/600", "position": 1},
                ],
                "features": ["Conveccion", "Limpieza pirolitica", "Control remoto"],
            },
            {
                "name": "Licuadora Power Blender",
                "sku": "LIC-PW365-05",
                "category": categories["Cocina Inteligente"],
                "short_description": "Motor de alto desempeno con 10 velocidades.",
                "long_description": "Incluye vaso Tritan y programas automaticos para smoothies.",
                "price": Decimal("120.00"),
                "stock": 35,
                "width_cm": Decimal("20.0"),
                "height_cm": Decimal("42.0"),
                "weight_kg": Decimal("6.0"),
                "images": [
                    {"url": "https://picsum.photos/seed/lic1/800/600", "position": 0, "is_cover": True},
                ],
                "features": ["Motor 1500W", "Programas automaticos", "Vaso Tritan"],
            },
            {
                "name": "Aspiradora Robot Pro",
                "sku": "ASP-RB365-06",
                "category": categories["Cuidado del Hogar"],
                "short_description": "Mapeo laser y fregado inteligente.",
                "long_description": "Aspiradora 2 en 1 con app movil y programacion semanal.",
                "price": Decimal("459.00"),
                "stock": 20,
                "width_cm": Decimal("35.0"),
                "height_cm": Decimal("10.0"),
                "weight_kg": Decimal("4.5"),
                "images": [
                    {"url": "https://picsum.photos/seed/asp1/800/600", "position": 0, "is_cover": True},
                    {"url": "https://picsum.photos/seed/asp2/800/600", "position": 1},
                ],
                "features": ["Mapeo laser", "Control por app", "Fregado inteligente"],
            },
            {
                "name": "Purificador de Aire HEPA",
                "sku": "PUR-AR365-07",
                "category": categories["Cuidado del Hogar"],
                "short_description": "Cobertura para habitaciones grandes.",
                "long_description": "Elimina el 99.97% de particulas con sensores de calidad del aire.",
                "price": Decimal("320.00"),
                "stock": 28,
                "width_cm": Decimal("30.0"),
                "height_cm": Decimal("60.0"),
                "weight_kg": Decimal("8.0"),
                "images": [
                    {"url": "https://picsum.photos/seed/pur1/800/600", "position": 0, "is_cover": True},
                ],
                "features": ["Filtro HEPA H13", "Monitor de calidad del aire", "Modo nocturno"],
            },
            {
                "name": "Cafetera Espresso Automatica",
                "sku": "CAF-AU365-08",
                "category": categories["Cocina Inteligente"],
                "short_description": "Espresso y cappuccino con un toque.",
                "long_description": "Molinillo ceramico integrado y perfiles personalizados.",
                "price": Decimal("599.00"),
                "stock": 18,
                "width_cm": Decimal("28.0"),
                "height_cm": Decimal("38.0"),
                "weight_kg": Decimal("9.0"),
                "images": [
                    {"url": "https://picsum.photos/seed/caf1/800/600", "position": 0, "is_cover": True},
                    {"url": "https://picsum.photos/seed/caf2/800/600", "position": 1},
                ],
                "features": ["Molinillo ceramico", "Espuma automatica", "Perfiles personalizados"],
            },
            {
                "name": "Aire Acondicionado Smart 12K",
                "sku": "AIR-SM365-09",
                "category": categories["Electrodomesticos"],
                "short_description": "Control remoto via app y asistentes de voz.",
                "long_description": "Modo eco, autolimpieza y programacion semanal.",
                "price": Decimal("699.00"),
                "stock": 22,
                "width_cm": Decimal("80.0"),
                "height_cm": Decimal("28.0"),
                "weight_kg": Decimal("35.0"),
                "images": [
                    {"url": "https://picsum.photos/seed/air1/800/600", "position": 0, "is_cover": True},
                ],
                "features": ["Control por voz", "Modo eco", "Autolimpieza"],
            },
            {
                "name": "Secadora de Ropa Premium",
                "sku": "SEC-PR365-10",
                "category": categories["Electrodomesticos"],
                "short_description": "Bomba de calor con ahorro energetico.",
                "long_description": "15 programas con sensor de humedad y conectividad movil.",
                "price": Decimal("849.00"),
                "stock": 14,
                "width_cm": Decimal("60.0"),
                "height_cm": Decimal("85.0"),
                "weight_kg": Decimal("62.0"),
                "images": [
                    {"url": "https://picsum.photos/seed/sec1/800/600", "position": 0, "is_cover": True},
                ],
                "features": ["Bomba de calor", "Sensor de humedad", "App movil"],
            },
            {
                "name": "Robot de Cocina Multifuncion",
                "sku": "ROB-CO365-11",
                "category": categories["Cocina Inteligente"],
                "short_description": "Procesa, cocina y pesa en un solo equipo.",
                "long_description": "Pantalla tactil con recetas guiadas paso a paso.",
                "price": Decimal("990.00"),
                "stock": 10,
                "width_cm": Decimal("33.0"),
                "height_cm": Decimal("32.0"),
                "weight_kg": Decimal("7.5"),
                "images": [
                    {"url": "https://picsum.photos/seed/rob1/800/600", "position": 0, "is_cover": True},
                ],
                "features": ["Balanza integrada", "Recetas guiadas", "Pantalla tactil"],
            },
            {
                "name": "Plancha a Vapor ProCare",
                "sku": "PLA-PC365-12",
                "category": categories["Cuidado del Hogar"],
                "short_description": "Suela ceramica con vapor continuo.",
                "long_description": "Sistema antigoteo, golpe de vapor y autoapagado.",
                "price": Decimal("89.00"),
                "stock": 50,
                "width_cm": Decimal("12.0"),
                "height_cm": Decimal("15.0"),
                "weight_kg": Decimal("1.5"),
                "images": [
                    {"url": "https://picsum.photos/seed/pla1/800/600", "position": 0, "is_cover": True},
                ],
                "features": ["Suela ceramica", "Golpe de vapor", "Autoapagado"],
            },
        ]

        created_count = 0
        for product_data in products_data:
            product_payload = {
                "category": product_data["category"].pk,
                "name": product_data["name"],
                "sku": product_data["sku"],
                "short_description": product_data["short_description"],
                "long_description": product_data["long_description"],
                "price": product_data["price"],
                "stock": product_data["stock"],
                "width_cm": product_data["width_cm"],
                "height_cm": product_data["height_cm"],
                "weight_kg": product_data["weight_kg"],
                "is_active": True,
                "images": product_data["images"],
                "features": [{"label": feature} for feature in product_data["features"]],
            }
            instance = Product.objects.filter(sku=product_data["sku"]).first()
            serializer = ProductSerializer(instance=instance, data=product_payload)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            created_count += 1 if instance is None else 0

        self.stdout.write(f"{created_count} productos creados o actualizados.")

    def _ensure_customers(self) -> None:
        user_model = get_user_model()
        customers_data = [
            {
                "email": "cliente1@demo.com",
                "first_name": "Laura",
                "last_name": "Garcia",
                "phone": "+34 600 111 222",
                "doc_id": "DNI12345678",
            },
            {
                "email": "cliente2@demo.com",
                "first_name": "Carlos",
                "last_name": "Ruiz",
                "phone": "+34 600 222 333",
                "doc_id": "DNI87654321",
            },
            {
                "email": "cliente3@demo.com",
                "first_name": "Ana",
                "last_name": "Martinez",
                "phone": "+34 600 333 444",
                "doc_id": "DNI56781234",
            },
        ]
        for data in customers_data:
            user, created = user_model.objects.get_or_create(
                email=data["email"],
                defaults={
                    "first_name": data["first_name"],
                    "last_name": data["last_name"],
                    "role": User.Roles.CLIENT,
                    "is_active": True,
                    "is_email_verified": True,
                },
            )
            if created:
                user.set_password("Client123!")
                user.save()
            Customer.objects.get_or_create(
                user=user,
                defaults={"phone": data["phone"], "doc_id": data["doc_id"]},
            )
        self.stdout.write("Clientes de demostracion listos.")
