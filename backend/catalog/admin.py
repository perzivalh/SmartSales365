﻿"""Admin registration for catalog models."""
from django.contrib import admin

from .models import Category, Product, ProductFeature, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


class ProductFeatureInline(admin.TabularInline):
    model = ProductFeature
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "category", "price", "stock", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("name", "sku")
    inlines = [ProductImageInline, ProductFeatureInline]
    readonly_fields = ("created_at", "updated_at")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "image_url", "created_at")
    search_fields = ("name",)
    readonly_fields = ("created_at",)
