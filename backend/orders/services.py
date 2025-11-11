from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict

import stripe
from django.conf import settings
from django.db import transaction
from rest_framework import serializers

from .models import Order, OrderPayment

@dataclass
class StripeConfig:
    secret_key: str


def _get_stripe_config() -> StripeConfig:
    secret_key = getattr(settings, "STRIPE_SECRET_KEY", "")
    if not secret_key:
        raise serializers.ValidationError("Stripe no esta configurado en el servidor.")
    return StripeConfig(secret_key=secret_key)


def _with_stripe_key() -> None:
    config = _get_stripe_config()
    stripe.api_key = config.secret_key


def create_stripe_payment_intent(
    *,
    amount_cents: int,
    currency: str,
    receipt_email: str,
    description: str,
    metadata: Dict[str, Any] | None = None,
) -> stripe.PaymentIntent:
    _with_stripe_key()
    try:
        return stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency.lower(),
            receipt_email=receipt_email,
            description=description,
            metadata=metadata or {},
            automatic_payment_methods={"enabled": True},
        )
    except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
        message = getattr(exc, "user_message", None) or str(exc)
        raise serializers.ValidationError(message) from exc


def retrieve_payment_intent(payment_intent_id: str) -> stripe.PaymentIntent:
    _with_stripe_key()
    try:
        return stripe.PaymentIntent.retrieve(payment_intent_id, expand=["charges", "latest_charge"])
    except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
        message = getattr(exc, "user_message", None) or str(exc)
        raise serializers.ValidationError(message) from exc


def extract_receipt_url(payment_intent: stripe.PaymentIntent) -> str | None:
    charge = None
    if getattr(payment_intent, "charges", None) and payment_intent.charges.data:
        charge = payment_intent.charges.data[0]
    elif getattr(payment_intent, "latest_charge", None):
        try:
            charge_id = payment_intent.latest_charge
            if isinstance(charge_id, str):
                charge = stripe.Charge.retrieve(charge_id)
            elif getattr(charge_id, "id", None):
                charge = stripe.Charge.retrieve(charge_id.id)
        except Exception:
            charge = None
    if charge:
        return charge.get("receipt_url")
    return None


def _record_payment(order: Order, payment_intent: stripe.PaymentIntent, status: str) -> None:
    receipt_url = extract_receipt_url(payment_intent)

    with transaction.atomic():
        order.refresh_from_db()
        if status == "succeeded" and order.status != Order.Status.PAID:
            order.mark_as_paid(receipt_url=receipt_url)
        elif status == "failed":
            order.mark_as_failed()

        amount_cents = getattr(payment_intent, "amount_received", None) or payment_intent.amount or 0

        OrderPayment.objects.update_or_create(
            order=order,
            stripe_payment_intent_id=payment_intent.id,
            defaults={
                "status": status,
                "amount": Decimal(amount_cents) / Decimal("100"),
                "currency": payment_intent.currency.upper(),
                "receipt_url": receipt_url or "",
                "payload": payment_intent.to_dict(),
            },
        )


def handle_stripe_event(event: stripe.Event) -> None:
    _with_stripe_key()
    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type in {"payment_intent.succeeded", "payment_intent.payment_failed"}:
        payment_intent = stripe.PaymentIntent.construct_from(data_object, stripe.api_key)  # type: ignore[arg-type]
        order = Order.objects.filter(stripe_payment_intent_id=payment_intent.id).first()
        if order:
            status = "succeeded" if event_type == "payment_intent.succeeded" else "failed"
            _record_payment(order, payment_intent, status)
