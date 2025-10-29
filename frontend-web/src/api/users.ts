import { api } from "./client";
import type { PaginatedResponse, User } from "../types/api";

export type UserPayload = {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  role: "ADMIN" | "CLIENT";
  is_active: boolean;
};

export async function getUsers(): Promise<PaginatedResponse<User>> {
  const response = await api.get<PaginatedResponse<User>>("/users/");
  return response.data;
}

export async function createUser(payload: UserPayload): Promise<User> {
  const response = await api.post<User>("/users/", payload);
  return response.data;
}

export async function updateUser(id: string, payload: UserPayload): Promise<User> {
  const response = await api.put<User>(`/users/${id}/`, payload);
  return response.data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}/`);
}

