import axios, { AxiosError, AxiosHeaders } from "axios";
import type { AxiosRequestConfig } from "axios";

import { isJwtExpired } from "../utils/jwt";
import { tokenStorage } from "../utils/tokenStorage";

const baseURL = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

const api = axios.create({
  baseURL,
  timeout: 15000,
});

function ensureHeaders(headers: AxiosRequestConfig["headers"]) {
  if (!headers) {
    return new AxiosHeaders();
  }
  if (headers instanceof AxiosHeaders) {
    return headers;
  }
  if (typeof headers === "string") {
    return new AxiosHeaders(headers);
  }
  return new AxiosHeaders(headers as Record<string, string | number | boolean>);
}

function isAuthRefreshUrl(url?: string) {
  return typeof url === "string" && url.includes("/auth/refresh/");
}

function isAuthLoginUrl(url?: string) {
  return typeof url === "string" && url.includes("/auth/login/");
}

api.interceptors.request.use((config) => {
  const { accessToken } = tokenStorage.getTokens();
  if (accessToken) {
    if (isJwtExpired(accessToken)) {
      tokenStorage.clear("expired");
      return config;
    }
    const headers = ensureHeaders(config.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    // eslint-disable-next-line no-param-reassign
    config.headers = headers;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    const { refreshToken } = tokenStorage.getTokens();
    if (!refreshToken) {
      return null;
    }
    refreshPromise = api
      .post<{ access: string }>(
        "/auth/refresh/",
        { refresh: refreshToken },
        {
          headers: { Authorization: undefined },
        },
      )
      .then((response) => {
        const newAccess = response.data.access;
        tokenStorage.setTokens(newAccess, refreshToken);
        return newAccess;
      })
      .catch(() => {
        tokenStorage.clear("expired");
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (isAuthLoginUrl(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (isAuthRefreshUrl(originalRequest.url)) {
      tokenStorage.clear("expired");
      return Promise.reject(error);
    }

    if (!originalRequest._retry) {
      originalRequest._retry = true;
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        const headers = ensureHeaders(originalRequest.headers);
        headers.set("Authorization", `Bearer ${newAccess}`);
        originalRequest.headers = headers;
        return api(originalRequest);
      }
      tokenStorage.clear("expired");
      const method = (originalRequest.method ?? "get").toLowerCase();
      if (method === "get") {
        const headers = ensureHeaders(originalRequest.headers);
        headers.delete("Authorization");
        originalRequest.headers = headers;
        return api(originalRequest);
      }
    } else {
      tokenStorage.clear("expired");
    }

    return Promise.reject(error);
  },
);

export { api };
