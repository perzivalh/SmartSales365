import { api } from "./client";

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access: string;
  refresh: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  doc_id?: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "ADMIN" | "CLIENT";
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/auth/login/", payload, {
    headers: { Authorization: undefined },
  });
  return response.data;
}

export async function register(payload: RegisterPayload): Promise<{ detail: string; email: string }> {
  const response = await api.post<{ detail: string; email: string }>("/auth/register/", payload, {
    headers: { Authorization: undefined },
  });
  return response.data;
}

export type VerifyEmailPayload = {
  email: string;
  code: string;
};

export async function verifyEmail(payload: VerifyEmailPayload): Promise<void> {
  await api.post("/auth/verify/", payload, {
    headers: { Authorization: undefined },
  });
}

export async function resendVerification(email: string): Promise<void> {
  await api.post(
    "/auth/resend-verification/",
    { email },
    {
      headers: { Authorization: undefined },
    },
  );
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post(
    "/auth/password/reset/",
    { email },
    {
      headers: { Authorization: undefined },
    },
  );
}

export type PasswordResetConfirmPayload = {
  email: string;
  code: string;
  password: string;
};

export async function confirmPasswordReset(payload: PasswordResetConfirmPayload): Promise<void> {
  await api.post("/auth/password/confirm/", payload, {
    headers: { Authorization: undefined },
  });
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await api.get<CurrentUser>("/auth/me/");
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout/", {});
}
