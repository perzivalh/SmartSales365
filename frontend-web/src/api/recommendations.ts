import { api } from "./client";
import type { ProductRecommendationsResponse } from "../types/api";

export async function getProductRecommendations(limit?: number): Promise<ProductRecommendationsResponse> {
  const response = await api.get<ProductRecommendationsResponse>("/recomendaciones/productos/", {
    params: limit ? { limit } : undefined,
  });
  return response.data;
}
