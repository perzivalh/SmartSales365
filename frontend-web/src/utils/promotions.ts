import type { Product, ProductPromotionSummary } from "../types/api";

export type PromotionPricing = {
  hasPromotion: boolean;
  finalPrice: number;
  originalPrice: number;
  discountAmount: number;
  label: string | null;
  summary: ProductPromotionSummary | null | undefined;
};

function parseNumeric(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function resolvePromotionPricing(product: Product): PromotionPricing {
  const originalPrice = parseNumeric(product.price);
  const summary = product.active_promotion;
  const discountValue = summary?.discount_amount ? parseNumeric(summary.discount_amount) : 0;
  const finalFromSummary = summary?.final_price ? parseNumeric(summary.final_price) : null;
  let finalPrice = finalFromSummary ?? originalPrice - discountValue;
  if (finalPrice < 0) finalPrice = 0;
  const hasPromotion = Boolean(summary) && finalPrice < originalPrice - 0.0001;
  return {
    hasPromotion,
    finalPrice: hasPromotion ? finalPrice : originalPrice,
    originalPrice,
    discountAmount: hasPromotion ? originalPrice - finalPrice : 0,
    label: summary?.name ?? null,
    summary,
  };
}
