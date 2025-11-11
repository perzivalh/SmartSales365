from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.cache import cache
from django.db.models import Case, DecimalField, IntegerField, Max, Sum, Value, When
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from catalog.serializers import ProductSerializer
from orders.models import OrderItem
from .exports import build_excel_export, build_pdf_export
from .serializers import AudioTranscriptionSerializer, DynamicReportRequestSerializer
from .services import (
    DatabaseSchemaIntrospector,
    GeminiRecommendationService,
    GeminiReportService,
    ReportServiceConfigurationError,
    ReportServiceError,
    SQLExecutionError,
    SQLGenerationError,
    SQLExecutor,
)


class DynamicReportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = DynamicReportRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        prompt = serializer.validated_data["prompt_de_usuario"].strip()
        export_format = serializer.validated_data.get("export_format")
        limit = serializer.validated_data.get("limite_filas") or 200

        if not prompt:
            return Response(
                {"detail": "El campo 'prompt_de_usuario' no puede estar vacío."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            gemini_service = GeminiReportService(settings.GEMINI_API_KEY)
        except ReportServiceConfigurationError as error:
            return Response({"detail": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        schema_description = DatabaseSchemaIntrospector().describe()

        try:
            sql_query = gemini_service.generate_sql(prompt, schema_description)
        except SQLGenerationError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except ReportServiceError as error:
            return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

        executor = SQLExecutor(max_rows=limit)
        try:
            columns, rows = executor.execute(sql_query)
        except SQLExecutionError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            summary = gemini_service.generate_summary(prompt, rows)
        except ReportServiceError as error:
            return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

        generated_at = timezone.now()
        response_payload: dict[str, object] = {
            "resumen": summary,
            "consulta_sql": sql_query,
            "columnas": columns,
            "filas": rows,
            "generado_en": generated_at.isoformat(),
        }

        if export_format:
            export_format_lower = export_format.lower()
            if export_format_lower == "xlsx":
                exported_file = build_excel_export(
                    columns,
                    rows,
                    prompt=prompt,
                    summary=summary,
                    generated_at=generated_at,
                )
            elif export_format_lower == "pdf":
                exported_file = build_pdf_export(
                    columns,
                    rows,
                    prompt=prompt,
                    summary=summary,
                    generated_at=generated_at,
                )
            else:
                return Response(
                    {"detail": "Formato de exportación no soportado. Usa 'pdf' o 'xlsx'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            response_payload["exportacion"] = {
                "archivo": exported_file.base64,
                "nombre": exported_file.filename,
                "content_type": exported_file.content_type,
            }

        return Response(response_payload, status=status.HTTP_200_OK)


class AudioTranscriptionView(APIView):
    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = AudioTranscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        audio_file = serializer.validated_data["audio"]

        try:
            gemini_service = GeminiReportService(settings.GEMINI_API_KEY)
        except ReportServiceConfigurationError as error:
            return Response({"detail": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        mime_type = getattr(audio_file, "content_type", None) or "audio/webm"
        try:
            transcript = gemini_service.transcribe_audio(audio_file.read(), mime_type)
        except ReportServiceError as error:
            return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({"transcripcion": transcript}, status=status.HTTP_200_OK)


class SalesRecommendationView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _parse_limit(raw_limit: str | None) -> int:
        try:
            limit = int(raw_limit) if raw_limit is not None else 6
        except (TypeError, ValueError):
            limit = 6
        return max(1, min(limit, 12))

    def get(self, request, *args, **kwargs):
        limit = self._parse_limit(request.query_params.get("limit"))
        user = request.user

        base_queryset = (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related("images", "features")
        )

        annotated_queryset = base_queryset.annotate(
            total_units=Coalesce(Sum("order_items__quantity"), Value(0), output_field=IntegerField()),
            total_revenue=Coalesce(
                Sum("order_items__total_price"),
                Value(Decimal("0.00")),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
        )

        user_order_items = OrderItem.objects.filter(order__user=user)
        user_has_orders = user_order_items.exists()

        latest_user_activity = user_order_items.aggregate(marker=Max("order__updated_at"))["marker"]
        latest_global_activity = OrderItem.objects.aggregate(marker=Max("order__updated_at"))["marker"]

        cache_key_parts = [
            "sales_rec",
            str(user.pk),
            str(limit),
            latest_user_activity.isoformat() if latest_user_activity else "none",
            latest_global_activity.isoformat() if latest_global_activity else "none",
        ]
        cache_key = ":".join(cache_key_parts)

        cached_payload = cache.get(cache_key)
        if cached_payload:
            return Response(cached_payload, status=status.HTTP_200_OK)

        personalized_products: list[Product] = []
        strategy = "top_sellers"

        if user_has_orders:
            category_totals = list(
                user_order_items.values("product__category_id")
                .annotate(total_quantity=Sum("quantity"))
                .order_by("-total_quantity")
            )
            category_ids = [entry["product__category_id"] for entry in category_totals if entry["product__category_id"]]
            if category_ids:
                category_order = Case(
                    *[
                        When(category_id=category_id, then=position)
                        for position, category_id in enumerate(category_ids)
                    ],
                    default=len(category_ids),
                    output_field=IntegerField(),
                )
                personalized_queryset = annotated_queryset.filter(category_id__in=category_ids).annotate(
                    category_rank=category_order
                )
                personalized_products = list(
                    personalized_queryset.order_by(
                        "category_rank",
                        "-total_units",
                        "-created_at",
                    )[:limit]
                )

        top_sellers = list(
            annotated_queryset.order_by("-total_units", "-created_at")[: limit * 2]
        )

        recommendations: list[Product] = []
        if personalized_products:
            strategy = "personalized"
            recommendations.extend(personalized_products)

        if len(recommendations) < limit:
            seen_ids = {product.id for product in recommendations}
            for product in top_sellers:
                if product.id in seen_ids:
                    continue
                recommendations.append(product)
                seen_ids.add(product.id)
                if len(recommendations) >= limit:
                    break

        recommendations = recommendations[:limit]

        product_payload: list[dict[str, object]] = []
        ai_product_payload: list[dict[str, object]] = []

        for product in recommendations:
            serializer = ProductSerializer(product, context={"request": request})
            serialized_product = dict(serializer.data)
            units = int(getattr(product, "total_units", 0) or 0)
            revenue_raw = getattr(product, "total_revenue", Decimal("0"))
            if not isinstance(revenue_raw, Decimal):
                revenue_raw = Decimal(revenue_raw or 0)
            revenue_str = format(revenue_raw, ".2f")
            serialized_product["metrics"] = {
                "units_sold": units,
                "total_revenue": revenue_str,
                "category_name": product.category.name if product.category else None,
            }
            product_payload.append(serialized_product)
            ai_product_payload.append(
                {
                    "name": product.name,
                    "category": product.category.name if product.category else "",
                    "units_sold": units,
                    "total_revenue": float(revenue_raw),
                }
            )

        summary_message = ""
        try:
            recommendation_service = GeminiRecommendationService(settings.GEMINI_API_KEY)
            summary_message = recommendation_service.build_recommendation_message(
                customer_name=(user.first_name or user.last_name or user.email),
                strategy=strategy,
                products=ai_product_payload,
            )
        except ReportServiceConfigurationError:
            summary_message = ""
        except ReportServiceError:
            summary_message = ""

        if not summary_message:
            summary_message = (
                "Te mostramos productos destacados basados en " +
                ("tus compras recientes." if strategy == "personalized" else "los articulos mas vendidos.")
            )

        response_payload = {
            "strategy": strategy,
            "summary": summary_message,
            "products": product_payload,
        }
        cache.set(cache_key, response_payload, timeout=600)

        return Response(response_payload, status=status.HTTP_200_OK)
