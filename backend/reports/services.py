from __future__ import annotations

import json
import re
from typing import Any, Iterable, Sequence

import google.generativeai as genai
from django.core.serializers.json import DjangoJSONEncoder
from django.db import connection
from django.db.utils import DatabaseError
from google.api_core.exceptions import GoogleAPIError


class ReportServiceError(Exception):
    """Base exception for report service errors."""


class ReportServiceConfigurationError(ReportServiceError):
    """Raised when the report service is misconfigured."""


class SQLGenerationError(ReportServiceError):
    """Raised when the SQL statement cannot be generated or validated."""


class SQLExecutionError(ReportServiceError):
    """Raised when executing the generated SQL fails."""


def extract_sql(candidate: str) -> str:
    pattern = re.compile(r"```(?:sql)?\s*(.*?)```", re.IGNORECASE | re.DOTALL)
    match = pattern.search(candidate)
    sql = match.group(1) if match else candidate
    sql = sql.strip()
    if sql.endswith(";"):
        sql = sql[:-1]
    return sql.strip()


def validate_sql(sql: str) -> str:
    if not sql:
        raise SQLGenerationError("La consulta SQL generada está vacía.")

    lowered = sql.lower()
    if not lowered.startswith("select"):
        raise SQLGenerationError("Solo se permiten consultas SELECT.")

    forbidden_keywords = {"insert", "update", "delete", "drop", "alter", "truncate", "grant", "revoke"}
    for keyword in forbidden_keywords:
        if re.search(rf"\b{keyword}\b", lowered):
            raise SQLGenerationError("Se detectaron operaciones no permitidas en la consulta generada.")

    if ";" in sql:
        raise SQLGenerationError("No se permiten múltiples sentencias SQL.")

    return sql


class DatabaseSchemaIntrospector:
    """Utility to introspect database schema descriptions."""

    def __init__(self, schema: str = "public") -> None:
        self.schema = schema

    def describe(self) -> str:
        query = """
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = %s
            ORDER BY table_name, ordinal_position
        """
        schema_map: dict[str, list[str]] = {}
        with connection.cursor() as cursor:
            cursor.execute(query, [self.schema])
            for table_name, column_name, data_type in cursor.fetchall():
                schema_map.setdefault(table_name, []).append(f"- {column_name} ({data_type})")

        if not schema_map:
            return "No hay tablas disponibles en el esquema pA?blico."

        lines: list[str] = []
        for table_name, columns in schema_map.items():
            lines.append(f"Tabla: {table_name}")
            lines.extend(columns)
        return "\n".join(lines)


class GeminiReportService:
    """Facilitates SQL generation and narrative summaries via Gemini models."""

    def __init__(
        self,
        api_key: str | None,
        sql_model_name: str = "gemini-2.5-pro",
        summary_model_name: str = "gemini-2.5-flash",
        preview_row_limit: int = 50,
    ) -> None:
        if not api_key:
            raise ReportServiceConfigurationError("La clave GEMINI_API_KEY no estA? configurada.")

        self.preview_row_limit = preview_row_limit
        genai.configure(api_key=api_key)
        self.sql_model = genai.GenerativeModel(
            sql_model_name,
            system_instruction=(
                "Eres un asistente experto en anA?lisis de datos. "
                "Devuelves A?nicamente consultas SQL vA?lidas para PostgreSQL basadas en la pregunta del usuario "
                "y en el esquema proporcionado. Las consultas deben ser de solo lectura (SELECT) y evitar "
                "modificaciones, creaciA3n o eliminaciA3n de datos."
            ),
            generation_config={
                "temperature": 0.0,
                "top_p": 0.9,
                "top_k": 40,
            },
        )
        self.summary_model = genai.GenerativeModel(
            summary_model_name,
            system_instruction=(
                "Eres un analista de negocio que entrega hallazgos extremadamente concisos en espaA?ol. "
                "Respondes siempre con una lista de hasta cuatro viA?etas que destaquen KPI clave directamente, "
                "sin introducciones ni texto de relleno."
            ),
            generation_config={
                "temperature": 0.3,
                "top_p": 0.9,
                "top_k": 40,
            },
        )
        self.transcription_model = genai.GenerativeModel(
            summary_model_name,
            system_instruction=(
                "Eres un asistente de transcripciA3n. Devuelves A?nicamente la transcripciA3n literal del audio en espaA?ol "
                "sin comentarios adicionales."
            ),
            generation_config={
                "temperature": 0.0,
                "top_p": 0.95,
                "top_k": 40,
            },
        )

    def generate_sql(self, user_prompt: str, schema_description: str) -> str:
        prompt = (
            "Esquema disponible:\n"
            f"{schema_description}\n\n"
            "Instrucciones:\n"
            "- Devuelve A?nicamente una consulta SQL vA?lida para PostgreSQL.\n"
            "- No incluyas comentarios, explicaciones ni texto adicional.\n"
            "- Limita la consulta a lectura (SELECT) y evita subconsultas peligrosas.\n"
            "- Si es pertinente, utiliza LIMIT para restringir el nA?mero de filas.\n\n"
            f"Pregunta del usuario:\n{user_prompt}"
        )
        try:
            response = self.sql_model.generate_content(prompt)
        except GoogleAPIError as error:
            raise SQLGenerationError("No fue posible generar la consulta SQL.") from error

        sql_text = (response.text or "").strip()
        sql_statement = extract_sql(sql_text)
        return validate_sql(sql_statement)

    def generate_summary(self, user_prompt: str, rows: Sequence[dict[str, Any]]) -> str:
        if not rows:
            return "No se encontraron datos para la consulta solicitada."

        preview_rows = rows[: self.preview_row_limit]
        data_preview = json.dumps(preview_rows, ensure_ascii=False, cls=DjangoJSONEncoder, indent=2)
        prompt = (
            "Pregunta del usuario:\n"
            f"{user_prompt}\n\n"
            "Datos tabulares en formato JSON (previsualizaciA3n):\n"
            f"{data_preview}\n\n"
            "Genera un resumen ejecutivo extremadamente conciso en espaA?ol. Sigue estas reglas:\n"
            "- No incluyas introducciones, saludos ni texto de relleno.\n"
            "- Devuelve exactamente una lista con hasta cuatro viA?etas (formato Markdown) que destaquen los KPI o tendencias clave.\n"
            "- Cada viA?eta debe comenzar con el indicador (por ejemplo: **Ventas totales:** ...) seguido de una breve interpretaciA3n.\n"
            "- Prioriza cifras y comparaciones relevantes; omite detalles irrelevantes.\n"
            "- Si no hay datos, devuelve solo \"Sin resultados\".\n"
        )
        try:
            response = self.summary_model.generate_content(prompt)
        except GoogleAPIError as error:
            raise ReportServiceError("No fue posible generar el resumen narrativo.") from error

        summary = (response.text or "").strip()
        if not summary:
            raise ReportServiceError("El modelo no devolviA3 un resumen narrativo.")
        return summary

    def transcribe_audio(self, audio_bytes: bytes, mime_type: str) -> str:
        try:
            response = self.transcription_model.generate_content(
                [
                    {
                        "role": "user",
                        "parts": [
                            {"text": "Transcribe este audio al espaA?ol. Devuelve solo el texto."},
                            {"mime_type": mime_type, "data": audio_bytes},
                        ],
                    }
                ]
            )
        except GoogleAPIError as error:
            raise ReportServiceError("No fue posible transcribir el audio enviado.") from error

        transcript = (response.text or "").strip()
        if not transcript:
            raise ReportServiceError("La transcripciA3n retornA3 vacA-a.")
        return transcript


def extract_sql(candidate: str) -> str:
    pattern = re.compile(r"```(?:sql)?\s*(.*?)```", re.IGNORECASE | re.DOTALL)
    match = pattern.search(candidate)
    sql = match.group(1) if match else candidate
    sql = sql.strip()
    if sql.endswith(";"):
        sql = sql[:-1]
    return sql.strip()


class GeminiRecommendationService:
    """Generates personalized sales recommendations using Gemini models."""

    def __init__(self, api_key: str | None, model_name: str = "gemini-2.5-flash") -> None:
        if not api_key:
            raise ReportServiceConfigurationError("La clave GEMINI_API_KEY no esta configurada.")

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name,
            system_instruction=(
                "Eres un asesor comercial que sugiere productos de ecommerce de forma breve y accionable. "
                "Tu estilo es directo, profesional y en espanol neutro. "
                "Siempre explicas por que los productos recomendados son relevantes para el cliente."
            ),
            generation_config={
                "temperature": 0.45,
                "top_p": 0.9,
                "top_k": 40,
            },
        )

    def build_recommendation_message(
        self,
        *,
        customer_name: str | None,
        strategy: str,
        products: Sequence[dict[str, Any]],
    ) -> str:
        if not products:
            return "Aún no contamos con datos suficientes para sugerirte productos relevantes."

        readable_strategy = "tendencias generales" if strategy == "top_sellers" else "preferencias personales"
        prompt = (
            "Contexto del usuario:\n"
            f"- Nombre: {customer_name or 'Cliente'}\n"
            f"- Estrategia aplicada: {readable_strategy}\n\n"
            "Productos recomendados en formato JSON:\n"
            f"{json.dumps(products, ensure_ascii=False, indent=2)}\n\n"
            "Redacta un mensaje conciso (maximo 3 oraciones) en espanol que explique por que estos productos son una buena opcion. "
            "Incluye al menos una mencion categorica (por ejemplo, 'hogar', 'oficina', etc.) cuando exista. "
            "Evita saludos iniciales y CTA finales."
        )

        try:
            response = self.model.generate_content(prompt)
        except GoogleAPIError as error:
            raise ReportServiceError("No fue posible generar la explicacion de recomendaciones.") from error

        summary = (response.text or "").strip()
        if not summary:
            raise ReportServiceError("La respuesta del modelo de recomendaciones llego vacia.")

        return summary

class SQLExecutor:
    """Executes SQL statements safely and serializes their result."""

    def __init__(self, max_rows: int = 200) -> None:
        self.max_rows = max_rows

    def execute(self, sql: str) -> tuple[list[str], list[dict[str, Any]]]:
        sanitized_sql = validate_sql(sql)
        try:
            with connection.cursor() as cursor:
                cursor.execute(sanitized_sql)
                raw_rows = cursor.fetchmany(self.max_rows)
                columns = [column[0] for column in (cursor.description or [])]
        except DatabaseError as error:
            raise SQLExecutionError("La consulta generada no pudo ejecutarse.") from error

        rows = [dict(zip(columns, row)) for row in raw_rows]
        normalized_rows = self._normalize(rows)
        return columns, normalized_rows

    @staticmethod
    def _normalize(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
        serialized = json.dumps(list(rows), cls=DjangoJSONEncoder, ensure_ascii=False)
        return json.loads(serialized)
