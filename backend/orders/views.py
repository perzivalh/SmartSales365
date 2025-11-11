import stripe
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from activity.models import AuditLog
from activity.utils import record_event

from .models import Order
from .serializers import (
    CheckoutConfirmSerializer,
    CheckoutStartResponseSerializer,
    CheckoutStartSerializer,
    OrderSerializer,
    OrderFulfillmentUpdateSerializer,
)
from notifications.models import UserNotification
from notifications.services import send_push_to_user
from .services import handle_stripe_event


class CheckoutViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    def get_serializer_class(self):
        if self.action == "start":
            return CheckoutStartSerializer
        if self.action == "confirm":
            return CheckoutConfirmSerializer
        return CheckoutStartSerializer

    @action(detail=False, methods=["post"], url_path="start")
    def start(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        record_event(
            event_type=AuditLog.EventType.CREATE,
            description=f"Pedido {order.number} iniciado desde checkout.",
            actor=request.user if request.user.is_authenticated else None,
            entity_type="Order",
            entity_id=str(order.id),
            metadata={"stage": "start"},
            request=request,
        )
        response = CheckoutStartResponseSerializer(order)
        return Response(
            {
                "order_id": response.data["id"],
                "order_number": response.data["number"],
                "client_secret": response.data["stripe_client_secret"],
                "total_amount": response.data["total_amount"],
                "currency": response.data["currency"],
                "status": response.data["status"],
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="confirm")
    def confirm(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        record_event(
            event_type=AuditLog.EventType.UPDATE,
            description=f"Pedido {order.number} confirmado.",
            actor=request.user if request.user.is_authenticated else None,
            entity_type="Order",
            entity_id=str(order.id),
            metadata={"stage": "confirm"},
            request=request,
        )
        response = OrderSerializer(order)
        return Response(response.data, status=status.HTTP_200_OK)


class OrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Order.objects.prefetch_related("items", "items__product").order_by("-created_at")
        user = self.request.user
        if not user.is_authenticated:
            return Order.objects.none()
        if user.is_staff:
            return queryset
        queryset = queryset.filter(user=user)
        fulfillment_status = self.request.query_params.get("fulfillment_status")
        if fulfillment_status:
            queryset = queryset.filter(fulfillment_status=fulfillment_status)
        return queryset

    def get_permissions(self):
        if self.action in {"update", "partial_update"}:
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action in {"update", "partial_update"}:
            return OrderFulfillmentUpdateSerializer
        return super().get_serializer_class()

    def perform_update(self, serializer):
        order = self.get_object()
        previous_status = order.fulfillment_status
        updated_order = serializer.save()
        if (
            updated_order.user
            and updated_order.fulfillment_status != previous_status
        ):
            status_label = updated_order.get_fulfillment_status_display()
            transaction.on_commit(
                lambda: send_push_to_user(
                    updated_order.user,
                    "Estado de pedido actualizado",
                    f"Tu orden {updated_order.number} ahora está '{status_label}'.",
                    data={
                        "order_id": str(updated_order.id),
                        "status": updated_order.status,
                        "fulfillment_status": updated_order.fulfillment_status,
                    },
                    category=UserNotification.Category.ORDER_STATUS,
                )
            )


@csrf_exempt
def stripe_webhook(request):
    secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")
    if not secret:
        return JsonResponse({"detail": "Stripe webhook secret no configurado."}, status=500)

    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
    if not sig_header:
        return JsonResponse({"detail": "Encabezado de firma ausente."}, status=400)

    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=secret)
    except ValueError:
        return JsonResponse({"detail": "Payload invalido."}, status=400)
    except stripe.error.SignatureVerificationError:
        return JsonResponse({"detail": "Firma invalida."}, status=400)

    handle_stripe_event(event)
    return HttpResponse(status=200)
