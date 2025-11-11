import { Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "./components/layout/AdminLayout";
import { AdminRoute } from "./components/layout/AdminRoute";
import { StoreLayout } from "./components/layout/StoreLayout";
import { CategoriesPage } from "./pages/admin/CategoriesPage";
import { ProductsPage } from "./pages/admin/ProductsPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { OrdersPage } from "./pages/admin/OrdersPage";
import { ReportsPage } from "./pages/admin/ReportsPage";
import { BitacoraPage } from "./pages/admin/BitacoraPage";
import { PromotionsPage } from "./pages/admin/PromotionsPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { CategoryListingPage } from "./pages/store/CategoryListingPage";
import { CartPage } from "./pages/store/CartPage";
import { CheckoutPage } from "./pages/store/CheckoutPage";
import { OrdersHistoryPage } from "./pages/store/OrdersHistoryPage";
import { FavoritesPage } from "./pages/store/FavoritesPage";
import { HomePage } from "./pages/store/HomePage";
import { ProductDetailPage } from "./pages/store/ProductDetailPage";

export default function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="orders" element={<OrdersHistoryPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="categories/:categoryId" element={<CategoryListingPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin/reports" element={<ReportsPage />} />
        <Route path="/admin/products" element={<ProductsPage />} />
        <Route path="/admin/promotions" element={<PromotionsPage />} />
        <Route path="/admin/orders" element={<OrdersPage />} />
        <Route path="/admin/categories" element={<CategoriesPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/bitacora" element={<BitacoraPage />} />
        <Route path="/admin" element={<Navigate to="/admin/reports" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}








