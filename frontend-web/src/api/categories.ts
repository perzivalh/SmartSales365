import { api } from "./client";
import type { Category, PaginatedResponse } from "../types/api";

export type CategoryPayload = {
  name: string;
  description: string;
  image_url?: string | null;
};

export async function getCategories(): Promise<Category[]> {
  const response = await api.get<PaginatedResponse<Category>>("/categories/", {
    params: { page_size: 100 },
  });
  return response.data.results;
}

export async function getCategoryById(id: string): Promise<Category> {
  const response = await api.get<Category>(`/categories/${id}/`);
  return response.data;
}

export async function createCategory(payload: CategoryPayload): Promise<Category> {
  const response = await api.post<Category>("/categories/", payload);
  return response.data;
}

export async function updateCategory(id: string, payload: CategoryPayload): Promise<Category> {
  const response = await api.put<Category>(`/categories/${id}/`, payload);
  return response.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}/`);
}

export type CategoryImageUploadResponse = {
  url: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  key?: string;
};

export async function uploadCategoryImage(file: File): Promise<CategoryImageUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<CategoryImageUploadResponse>("/categories/upload-image/", formData);
  return response.data;
}

