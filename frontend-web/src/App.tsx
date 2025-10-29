import { Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "./components/layout/AdminLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { StoreLayout } from "./components/layout/StoreLayout";
import { CategoriesPage } from "./pages/admin/CategoriesPage";
import { ProductsPage } from "./pages/admin/ProductsPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { CategoryListingPage } from "./pages/store/CategoryListingPage";
import { HomePage } from "./pages/store/HomePage";
import { ProductDetailPage } from "./pages/store/ProductDetailPage";

export default function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="categories/:categoryId" element={<CategoryListingPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/products" element={<ProductsPage />} />
        <Route path="/admin/categories" element={<CategoriesPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}



