"""URL configuration for SmartSales365."""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from authx.views import (
    EmailAwareTokenObtainPairView,
    EmailVerificationView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ResendVerificationView,
    UserViewSet,
)
from catalog.views import CategoryImageUploadView, CategoryViewSet, ProductImageUploadView, ProductViewSet
from customers.views import CustomerViewSet


router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"customers", CustomerViewSet, basename="customer")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", EmailAwareTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/verify/", EmailVerificationView.as_view(), name="email_verify"),
    path("api/auth/resend-verification/", ResendVerificationView.as_view(), name="resend_verification"),
    path("api/auth/password/reset/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("api/auth/password/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    path("api/products/upload-image/", ProductImageUploadView.as_view(), name="product-image-upload"),
    path("api/categories/upload-image/", CategoryImageUploadView.as_view(), name="category-image-upload"),
    path("api/", include(router.urls)),
]
