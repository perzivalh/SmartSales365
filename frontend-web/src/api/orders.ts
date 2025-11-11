import { api } from "./client";

import type {
  CheckoutPayload,
  CheckoutStartResponse,
  Order,
  OrderFulfillmentStatus,
  PaginatedResponse,
} from "../types/api";

export async function startCheckout(payload: CheckoutPayload): Promise<CheckoutStartResponse> {
  const response = await api.post<CheckoutStartResponse>("/checkout/start/", payload);
  return response.data;
}

export async function confirmCheckout(orderId: string, paymentIntentId?: string): Promise<Order> {
  const response = await api.post<Order>("/checkout/confirm/", {
    order_id: orderId,
    payment_intent_id: paymentIntentId,
  });
  return response.data;
}

export async function getOrders(params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<Order>> {
  const response = await api.get<PaginatedResponse<Order>>("/orders/", { params });
  return response.data;
}

export async function getOrderById(orderId: string): Promise<Order> {
  const response = await api.get<Order>(`/orders/${orderId}/`);
  return response.data;
}

export async function updateOrderFulfillment(orderId: string, status: OrderFulfillmentStatus): Promise<Order> {
  const response = await api.patch<Order>(`/orders/${orderId}/`, {
    fulfillment_status: status,
  });
  return response.data;
}
