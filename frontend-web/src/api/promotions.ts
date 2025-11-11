import { api } from "./client";
import type { PaginatedResponse, Promotion } from "../types/api";

export type PromotionPayload = {
  name: string;
  description?: string;
  discount_type: "PERCENT" | "AMOUNT";
  discount_value: number;
  scope: "GLOBAL" | "CATEGORY" | "PRODUCT";
  categories?: string[];
  products?: string[];
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
};

export type PromotionQuery = {
  search?: string;
  scope?: string;
  status?: "active" | "inactive";
  ordering?: string;
  page?: number;
  page_size?: number;
};

export async function getPromotions(query: PromotionQuery = {}): Promise<PaginatedResponse<Promotion>> {
  const response = await api.get<PaginatedResponse<Promotion>>("/promotions/", {
    params: query,
  });
  return response.data;
}

export async function createPromotion(payload: PromotionPayload): Promise<Promotion> {
  const response = await api.post<Promotion>("/promotions/", payload);
  return response.data;
}

export async function updatePromotion(id: string, payload: PromotionPayload): Promise<Promotion> {
  const response = await api.put<Promotion>(`/promotions/${id}/`, payload);
  return response.data;
}

export async function deletePromotion(id: string): Promise<void> {
  await api.delete(`/promotions/${id}/`);
}
