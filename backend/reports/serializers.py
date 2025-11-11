from __future__ import annotations

from rest_framework import serializers


class DynamicReportRequestSerializer(serializers.Serializer):
    prompt_de_usuario = serializers.CharField(max_length=1000)
    export_format = serializers.ChoiceField(
        choices=("pdf", "xlsx"),
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    limite_filas = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=1000,
        default=200,
    )


class AudioTranscriptionSerializer(serializers.Serializer):
    audio = serializers.FileField()
