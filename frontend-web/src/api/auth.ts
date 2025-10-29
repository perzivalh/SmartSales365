import { api } from "./client";

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access: string;
  refresh: string;
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/auth/login/", payload, {
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
