from decimal import Decimal
from typing import Dict

from django.conf import settings
from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from catalog.models import Product
from catalog.promotion_service import PromotionPricingEngine
from .models import Order, OrderItem, OrderPayment
from notifications.models import UserNotification
from notifications.services import send_push_to_user

from .services import (
    create_stripe_payment_intent,
    retrieve_payment_intent,
    extract_receipt_url,
)


class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_id",
            "product_name",
            "product_sku",
            "unit_price",
            "quantity",
            "total_price",
            "discount_amount",
            "promotion_snapshot",
        )


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "number",
            "status",
            "customer_name",
            "customer_email",
            "customer_phone",
            "shipping_address_line1",
            "shipping_address_line2",
            "shipping_city",
            "shipping_state",
            "shipping_postal_code",
            "shipping_country",
            "notes",
            "subtotal_amount",
            "tax_amount",
            "shipping_amount",
            "total_amount",
            "discount_amount",
            "currency",
            "receipt_url",
            "paid_at",
            "fulfillment_status",
            "created_at",
            "updated_at",
            "items",
        )


class CheckoutCartItemSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=50)


class CheckoutCustomerSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(max_length=160)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)


class CheckoutAddressSerializer(serializers.Serializer):
    line1 = serializers.CharField(max_length=160)
    line2 = serializers.CharField(max_length=160, required=False, allow_blank=True)
    city = serializers.CharField(max_length=80)
    state = serializers.CharField(max_length=80, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    country = serializers.CharField(max_length=2)


class CheckoutStartSerializer(serializers.Serializer):
    cart = CheckoutCartItemSerializer(many=True)
    customer = CheckoutCustomerSerializer()
    shipping_address = CheckoutAddressSerializer()
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_cart(self, value):
        if not value:
            raise serializers.ValidationError("El carrito no puede estar vacio.")

        aggregated: Dict[str, int] = {}
        for item in value:
            product_id = str(item["product_id"])
            aggregated[product_id] = aggregated.get(product_id, 0) + item["quantity"]

        product_ids = list(aggregated.keys())
        products = Product.objects.filter(id__in=product_ids, is_active=True)
        found: Dict[str, Product] = {str(product.id): product for product in products}
        missing = [product_id for product_id in product_ids if product_id not in found]
        if missing:
            raise serializers.ValidationError("Algunos productos del carrito no estan disponibles.")

        for product_id, quantity in aggregated.items():
            product = found[product_id]
            if product.stock < quantity:
                raise serializers.ValidationError(
                    f"No hay stock suficiente para {product.name}. Disponible: {product.stock}."
                )

        self.context["products"] = found
        self.context["cart_aggregated"] = aggregated
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        products = self.context["products"]
        cart = validated_data["cart"]
        aggregated = self.context["cart_aggregated"]
        customer = validated_data["customer"]
        shipping_address = validated_data["shipping_address"]
        notes = validated_data.get("notes") or ""
        pricing_engine = PromotionPricingEngine(products.values())

        subtotal = Decimal("0.00")
        discount_total = Decimal("0.00")
        cart_metadata = []
        for product_id, quantity in aggregated.items():
            product = products[product_id]
            unit_price = Decimal(product.price)
            pricing = pricing_engine.get(product)
            discount_per_unit = Decimal("0.00")
            promotion_snapshot: dict[str, str] = {}
            if pricing:
                discount_per_unit = pricing.discount_per_unit
                unit_price = pricing.final_price
                promotion_snapshot = pricing.as_public_dict()
            original_line_total = Decimal(product.price) * quantity
            subtotal += original_line_total
            line_discount_total = discount_per_unit * quantity
            discount_total += line_discount_total
            cart_metadata.append(
                {
                    "product_id": product_id,
                    "name": product.name,
                    "sku": product.sku,
                    "unit_price": str(product.price),
                    "quantity": quantity,
                    "line_total": str(original_line_total),
                    "discount_applied": str(line_discount_total),
                    "promotion": promotion_snapshot,
                }
            )

        tax_amount = Decimal("0.00")
        shipping_amount = Decimal("0.00")
        total = subtotal - discount_total + tax_amount + shipping_amount
        if total <= 0:
            raise serializers.ValidationError("El total a pagar debe ser mayor a cero.")

        currency = getattr(settings, "DEFAULT_CURRENCY", "USD").upper()

        with transaction.atomic():
            order = Order.objects.create(
                user=user,
                customer_email=customer["email"],
                customer_name=customer["name"],
                customer_phone=customer.get("phone", ""),
                shipping_address_line1=shipping_address["line1"],
                shipping_address_line2=shipping_address.get("line2", ""),
                shipping_city=shipping_address["city"],
                shipping_state=shipping_address.get("state", ""),
                shipping_postal_code=shipping_address.get("postal_code", ""),
                shipping_country=shipping_address["country"].upper(),
                notes=notes,
                subtotal_amount=subtotal,
                tax_amount=tax_amount,
                shipping_amount=shipping_amount,
                discount_amount=discount_total,
                total_amount=total,
                currency=currency,
                metadata={"cart": cart_metadata},
            )

            order_items = []
            for product_id, quantity in aggregated.items():
                product = products[product_id]
                pricing = pricing_engine.get(product)
                promotion_snapshot: dict[str, str] = {}
                unit_price = Decimal(product.price)
                discount_per_unit = Decimal("0.00")
                if pricing:
                    promotion_snapshot = pricing.as_public_dict()
                    unit_price = pricing.final_price
                    discount_per_unit = pricing.discount_per_unit
                line_total = unit_price * quantity
                order_items.append(
                    OrderItem(
                        order=order,
                        product=product,
                        product_name=product.name,
                        product_sku=product.sku,
                        unit_price=unit_price,
                        quantity=quantity,
                        total_price=line_total,
                        discount_amount=discount_per_unit * quantity,
                        promotion_snapshot=promotion_snapshot,
                    ),
                )

            OrderItem.objects.bulk_create(order_items)

            amount_cents = int(total * Decimal("100"))
            payment_intent = create_stripe_payment_intent(
                amount_cents=amount_cents,
                currency=order.currency,
                receipt_email=order.customer_email,
                description=f"Orden {order.number}",
                metadata={
                    "order_id": str(order.id),
                    "order_number": order.number,
                },
            )

            order.stripe_payment_intent_id = payment_intent.id
            order.stripe_client_secret = payment_intent.client_secret
            order.save(update_fields=[
                "stripe_payment_intent_id",
                "stripe_client_secret",
                "updated_at",
            ])

        return order


class CheckoutStartResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = (
            "id",
            "number",
            "stripe_client_secret",
            "total_amount",
            "currency",
            "status",
        )
        read_only_fields = fields


class CheckoutConfirmSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    payment_intent_id = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        try:
            order = Order.objects.get(id=attrs["order_id"])
        except Order.DoesNotExist as exc:
            raise serializers.ValidationError("La orden no existe.") from exc

        if order.status == Order.Status.PAID:
            attrs["order"] = order
            attrs["payment_intent_id"] = order.stripe_payment_intent_id
            return attrs

        payment_intent_id = attrs.get("payment_intent_id") or order.stripe_payment_intent_id
        if not payment_intent_id:
            raise serializers.ValidationError("No se encontro el identificador del pago.")

        attrs["order"] = order
        attrs["payment_intent_id"] = payment_intent_id
        return attrs

    def save(self):
        order: Order = self.validated_data["order"]
        payment_intent_id: str = self.validated_data["payment_intent_id"]

        payment_intent = retrieve_payment_intent(payment_intent_id)
        status = payment_intent.status

        if status != "succeeded":
            if status in {"processing", "requires_confirmation"}:
                raise serializers.ValidationError("El pago se esta procesando. Intenta nuevamente en unos segundos.")
            order.mark_as_failed()
            if order.user:
                send_push_to_user(
                    order.user,
                    "Pago rechazado",
                    f"La orden {order.number} no pudo completarse.",
                    data={"order_id": str(order.id), "status": order.status},
                    category=UserNotification.Category.PAYMENT,
                )
            raise serializers.ValidationError("El pago no se ha completado. Intenta nuevamente.")

        receipt_url = extract_receipt_url(payment_intent)

        with transaction.atomic():
            order.refresh_from_db()
            if order.status != Order.Status.PAID:
                order.mark_as_paid(receipt_url=receipt_url)
                OrderPayment.objects.create(
                    order=order,
                    stripe_payment_intent_id=payment_intent.id,
                    status=status,
                    amount=Decimal(payment_intent.amount) / Decimal("100"),
                    currency=payment_intent.currency.upper(),
                    receipt_url=receipt_url or "",
                    payload=payment_intent.to_dict(),
                )

                product_quantities = {item.product_id: item.quantity for item in order.items.all()}
                product_ids = list(product_quantities.keys())
                for product in Product.objects.select_for_update().filter(id__in=product_ids):
                    quantity = product_quantities[product.id]
                    if product.stock < quantity:
                        raise serializers.ValidationError(
                            f"El producto {product.name} no tiene stock suficiente para completar el pedido."
                        )
                    product.stock = F("stock") - quantity
                    product.save(update_fields=["stock"])

        if order.user:
            transaction.on_commit(
                lambda: send_push_to_user(
                    order.user,
                    "Pago confirmado",
                    f"Hemos recibido tu pago. Orden {order.number}.",
                    data={"order_id": str(order.id), "status": order.status},
                    category=UserNotification.Category.PAYMENT,
                )
            )

        return order


class OrderFulfillmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ("fulfillment_status",)
