import { api } from "./client";
import type { Customer, PaginatedResponse } from "../types/api";

export type CustomerPayload = {
  user: string;
  phone: string;
  doc_id: string;
};

export async function getCustomers(): Promise<PaginatedResponse<Customer>> {
  const response = await api.get<PaginatedResponse<Customer>>("/customers/");
  return response.data;
}

export async function createCustomer(payload: CustomerPayload): Promise<Customer> {
  const response = await api.post<Customer>("/customers/", payload);
  return response.data;
}

export async function updateCustomer(id: string, payload: CustomerPayload): Promise<Customer> {
  const response = await api.put<Customer>(`/customers/${id}/`, payload);
  return response.data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customers/${id}/`);
}

