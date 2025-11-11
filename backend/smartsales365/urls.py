"""URL configuration for SmartSales365."""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from authx.views import (
    EmailAwareTokenObtainPairView,
    EmailVerificationView,
    CurrentUserView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ResendVerificationView,
    RegisterView,
    LogoutView,
    PasswordChangeView,
    UserViewSet,
)
from catalog.views import (
    CategoryImageUploadView,
    CategoryViewSet,
    ProductImageUploadView,
    ProductViewSet,
    PromotionViewSet,
)
from customers.views import CustomerViewSet
from activity.views import AuditLogViewSet
from orders.views import CheckoutViewSet, OrderViewSet, stripe_webhook
from notifications.views import PushTokenViewSet, UserNotificationViewSet
from reports.views import AudioTranscriptionView, DynamicReportView, SalesRecommendationView


router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"promotions", PromotionViewSet, basename="promotion")
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"checkout", CheckoutViewSet, basename="checkout")
router.register(r"audit-logs", AuditLogViewSet, basename="audit-log")
router.register(r"push-tokens", PushTokenViewSet, basename="push-token")
router.register(r"notifications", UserNotificationViewSet, basename="notification")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", EmailAwareTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/me/", CurrentUserView.as_view(), name="current_user"),
    path("api/auth/logout/", LogoutView.as_view(), name="logout"),
    path("api/auth/password/change/", PasswordChangeView.as_view(), name="password_change"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/verify/", EmailVerificationView.as_view(), name="email_verify"),
    path("api/auth/resend-verification/", ResendVerificationView.as_view(), name="resend_verification"),
    path("api/auth/password/reset/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("api/auth/password/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    path("api/products/upload-image/", ProductImageUploadView.as_view(), name="product-image-upload"),
    path("api/categories/upload-image/", CategoryImageUploadView.as_view(), name="category-image-upload"),
    path("api/stripe/webhook/", stripe_webhook, name="stripe-webhook"),
    path("api/reportes/dinamicos/", DynamicReportView.as_view(), name="dynamic-reports"),
    path("api/reportes/transcribir/", AudioTranscriptionView.as_view(), name="dynamic-reports-transcribe"),
    path("api/recomendaciones/productos/", SalesRecommendationView.as_view(), name="sales-recommendations"),
    path("api/", include(router.urls)),
]
