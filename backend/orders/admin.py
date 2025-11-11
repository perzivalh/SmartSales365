from django.contrib import admin

from .models import Order, OrderItem, OrderPayment


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_name", "product_sku", "unit_price", "quantity", "total_price")


class OrderPaymentInline(admin.TabularInline):
    model = OrderPayment
    extra = 0
    readonly_fields = ("stripe_payment_intent_id", "status", "amount", "currency", "receipt_url", "created_at")
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("number", "customer_name", "customer_email", "status", "total_amount", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("number", "customer_email", "customer_name", "stripe_payment_intent_id")
    inlines = [OrderItemInline, OrderPaymentInline]
    readonly_fields = (
        "number",
        "stripe_payment_intent_id",
        "stripe_client_secret",
        "receipt_url",
        "paid_at",
        "created_at",
        "updated_at",
    )


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "product_name", "quantity", "unit_price", "total_price")
    search_fields = ("product_name", "product_sku")


@admin.register(OrderPayment)
class OrderPaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "stripe_payment_intent_id", "status", "amount", "currency", "created_at")
    search_fields = ("stripe_payment_intent_id", "order__number")
    list_filter = ("status", "currency")
