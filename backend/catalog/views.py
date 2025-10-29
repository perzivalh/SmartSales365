"""ViewSets for catalog domain."""
from __future__ import annotations

from pathlib import Path
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from rest_framework import filters, status, viewsets
from rest_framework.permissions import BasePermission, SAFE_METHODS, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class AdminOrReadOnly(BasePermission):
    """Allow read-only access to anyone, but restrict modifications to admins."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [AdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = (
        Product.objects.select_related("category")
        .prefetch_related("images", "features")
        .all()
    )
    serializer_class = ProductSerializer
    permission_classes = [AdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "sku"]
    ordering_fields = ["created_at", "price"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        request = self.request
        category_id = request.query_params.get("category_id")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        is_active_param = request.query_params.get("is_active")
        if is_active_param is not None and is_active_param != "":
            if is_active_param.lower() in {"true", "1"}:
                queryset = queryset.filter(is_active=True)
            elif is_active_param.lower() in {"false", "0"}:
                queryset = queryset.filter(is_active=False)
        if not request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        return queryset


class ProductImageUploadView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, *args, **kwargs):
        if not settings.AWS_S3_BUCKET:
            return Response(
                {"detail": "El almacenamiento S3 no esta configurado."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        upload_file = request.FILES.get("file")
        if not upload_file:
            return Response(
                {"detail": "Debes adjuntar un archivo en el campo 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = upload_file.content_type or "application/octet-stream"
        file_extension = Path(upload_file.name).suffix.lower()
        object_key = f"products/{uuid4()}{file_extension}"

        extra_args: dict[str, str] = {"ContentType": content_type}
        acl_value = (settings.AWS_S3_UPLOAD_ACL or "").strip()
        if acl_value and acl_value.lower() not in {"none", "default"}:
            extra_args["ACL"] = acl_value

        try:
            s3_client = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            )
            s3_client.upload_fileobj(upload_file, settings.AWS_S3_BUCKET, object_key, ExtraArgs=extra_args)
        except (BotoCoreError, ClientError) as upload_error:
            return Response(
                {
                    "detail": "No se pudo subir la imagen al almacenamiento.",
                    "error": str(upload_error),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        public_base = (settings.AWS_S3_PUBLIC_DOMAIN or "").rstrip("/")
        public_url = f"{public_base}/{object_key}" if public_base else object_key

        return Response(
            {
                "url": public_url,
                "mime_type": content_type,
                "size_bytes": upload_file.size,
                "key": object_key,
            },
            status=status.HTTP_201_CREATED,
        )


class CategoryImageUploadView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, *args, **kwargs):
        if not settings.AWS_S3_BUCKET:
            return Response(
                {"detail": "El almacenamiento S3 no esta configurado."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        upload_file = request.FILES.get("file")
        if not upload_file:
            return Response(
                {"detail": "Debes adjuntar un archivo en el campo 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = upload_file.content_type or "application/octet-stream"
        file_extension = Path(upload_file.name).suffix.lower()
        object_key = f"categories/{uuid4()}{file_extension}"

        extra_args: dict[str, str] = {"ContentType": content_type}
        acl_value = (settings.AWS_S3_UPLOAD_ACL or "").strip()
        if acl_value and acl_value.lower() not in {"none", "default"}:
            extra_args["ACL"] = acl_value

        try:
            s3_client = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            )
            s3_client.upload_fileobj(upload_file, settings.AWS_S3_BUCKET, object_key, ExtraArgs=extra_args)
        except (BotoCoreError, ClientError) as upload_error:
            return Response(
                {
                    "detail": "No se pudo subir la imagen al almacenamiento.",
                    "error": str(upload_error),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        public_base = (settings.AWS_S3_PUBLIC_DOMAIN or "").rstrip("/")
        public_url = f"{public_base}/{object_key}" if public_base else object_key

        return Response(
            {
                "url": public_url,
                "mime_type": content_type,
                "size_bytes": upload_file.size,
                "key": object_key,
            },
            status=status.HTTP_201_CREATED,
        )


