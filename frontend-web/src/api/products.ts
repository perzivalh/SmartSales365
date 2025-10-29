import { api } from "./client";
import type { PaginatedResponse, Product } from "../types/api";

export type ProductPayload = {
  category: string;
  name: string;
  sku: string;
  short_description: string;
  long_description: string;
  price: number;
  stock: number;
  width_cm: number;
  height_cm: number;
  weight_kg: number;
  is_active: boolean;
  images: {
    id?: string;
    url: string;
    position: number;
    is_cover: boolean;
    mime_type?: string | null;
    size_bytes?: number | null;
  }[];
  features: {
    id?: string;
    label: string;
  }[];
};

export type ProductQuery = {
  search?: string;
  category_id?: string;
  is_active?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
};

export async function getProducts(query: ProductQuery = {}): Promise<PaginatedResponse<Product>> {
  const response = await api.get<PaginatedResponse<Product>>("/products/", {
    params: query,
  });
  return response.data;
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const response = await api.post<Product>("/products/", payload);
  return response.data;
}

export async function updateProduct(id: string, payload: ProductPayload): Promise<Product> {
  const response = await api.put<Product>(`/products/${id}/`, payload);
  return response.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}/`);
}

export type ProductImageUploadResponse = {
  url: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  key?: string;
};

export async function uploadProductImage(file: File): Promise<ProductImageUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<ProductImageUploadResponse>("/products/upload-image/", formData);
  return response.data;
}
export async function getProductById(id: string): Promise<Product> {
  const response = await api.get<Product>(`/products/${id}/`);
  return response.data;
}

