"""ViewSets and auth endpoints for authx app."""
from django.contrib.auth import get_user_model
from rest_framework import filters
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import status

from activity.mixins import AuditableModelViewSet
from activity.models import AuditLog
from activity.utils import record_event

from .serializers import (
    EmailAwareTokenObtainPairSerializer,
    EmailVerificationSerializer,
    CurrentUserSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ResendVerificationSerializer,
    RegisterSerializer,
    UserSerializer,
    ChangePasswordSerializer,
)
from .services import send_password_reset_email, send_verification_email


class UserViewSet(AuditableModelViewSet):
    """CRUD viewset para usuarios (solo administradores)."""

    serializer_class = UserSerializer
    queryset = get_user_model().objects.all().order_by("email")
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ["email", "first_name", "last_name"]
    audit_entity = "Usuario"


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

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = serializer.user
        record_event(
            event_type=AuditLog.EventType.LOGIN,
            description="Inicio de sesion exitoso.",
            actor=user,
            entity_type="Usuario",
            entity_id=str(user.id),
            metadata={"email": user.email},
            request=request,
        )
        return Response(data, status=status.HTTP_200_OK)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        record_event(
            event_type=AuditLog.EventType.CREATE,
            description="Registro de usuario desde el portal publico.",
            actor=user,
            entity_type="Usuario",
            entity_id=str(user.id),
            metadata={"email": user.email},
            request=request,
        )
        return Response(
            {"detail": "Cuenta creada. Revisa tu correo para verificarla.", "email": user.email},
            status=201,
        )


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = CurrentUserSerializer(request.user)
        return Response(serializer.data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        record_event(
            event_type=AuditLog.EventType.LOGOUT,
            description="Cierre de sesion.",
            actor=user,
            entity_type="Usuario",
            entity_id=str(user.id),
            metadata={"email": user.email},
            request=request,
        )
        return Response({"detail": "Sesion finalizada."}, status=status.HTTP_200_OK)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Contrasena actualizada correctamente."})
