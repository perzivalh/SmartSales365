"""ViewSets and auth endpoints for authx app."""
from django.contrib.auth import get_user_model
from rest_framework import filters, viewsets
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    EmailAwareTokenObtainPairSerializer,
    EmailVerificationSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ResendVerificationSerializer,
    UserSerializer,
)
from .services import send_password_reset_email, send_verification_email


class UserViewSet(viewsets.ModelViewSet):
    """CRUD viewset para usuarios (solo administradores)."""

    serializer_class = UserSerializer
    queryset = get_user_model().objects.all().order_by("email")
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ["email", "first_name", "last_name"]


class EmailVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]
        user = token.user
        user.is_email_verified = True
        user.is_active = True
        user.save(update_fields=["is_email_verified", "is_active", "updated_at"])
        token.is_used = True
        token.save(update_fields=["is_used"])
        return Response({"detail": "Cuenta verificada correctamente."})


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = ResendVerificationSerializer(data=request.data, context={})
        serializer.is_valid(raise_exception=True)
        user = serializer.context["user"]
        send_verification_email(user)
        return Response({"detail": "Se envio un nuevo codigo de verificacion."})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetRequestSerializer(data=request.data, context={})
        serializer.is_valid(raise_exception=True)
        user = serializer.context["user"]
        send_password_reset_email(user)
        return Response({"detail": "Hemos enviado un codigo para restablecer tu contrasena."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Contrasena actualizada. Ya puedes iniciar sesion."})


class EmailAwareTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailAwareTokenObtainPairSerializer
