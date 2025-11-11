import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ReactNode } from "react";

import { getCurrentUser, login as loginRequest, logout as logoutRequest } from "../api/auth";
import { getJwtExpiration, isJwtExpired } from "../utils/jwt";
import { tokenStorage } from "../utils/tokenStorage";

type AuthContextValue = {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: AuthUser | null;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSessionExpired: () => void;
  refreshProfile: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

const isBrowser = typeof window !== "undefined";

export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "ADMIN" | "CLIENT";
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
};

export function AuthProvider({ children }: Props) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const expirationTimer = useRef<number | null>(null);

  useEffect(() => {
    const tokens = tokenStorage.getTokens();
    if (tokens.accessToken) {
      if (isJwtExpired(tokens.accessToken)) {
        tokenStorage.clear("expired");
      } else {
        setAccessToken(tokens.accessToken);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = tokenStorage.subscribe((tokens, context) => {
      setAccessToken(tokens.accessToken);
      if (!tokens.accessToken) {
        setUser(null);
      }
      if (context.reason === "expired") {
        setSessionExpired(true);
      }
      if (context.reason === "logout" || context.reason === "set") {
        setSessionExpired(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isBrowser) return undefined;
    if (expirationTimer.current) {
      window.clearTimeout(expirationTimer.current);
      expirationTimer.current = null;
    }
    if (!accessToken) {
      return undefined;
    }

    const expiration = getJwtExpiration(accessToken);
    if (!expiration) {
      return undefined;
    }

    const delay = Math.max(expiration - Date.now() - 5000, 0);
    if (delay === 0) {
      tokenStorage.clear("expired");
      return undefined;
    }

    const timer = window.setTimeout(() => {
      tokenStorage.clear("expired");
    }, delay);
    expirationTimer.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (expirationTimer.current === timer) {
        expirationTimer.current = null;
      }
    };
  }, [accessToken]);

  const refreshProfile = useCallback(async (): Promise<AuthUser | null> => {
    if (!accessToken) {
      setUser(null);
      return null;
    }
    try {
      const profile = await getCurrentUser();
      setUser(profile);
      return profile;
    } catch (error) {
      console.error("No se pudo cargar el perfil del usuario.", error);
      tokenStorage.clear("logout");
      setUser(null);
      return null;
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      void refreshProfile();
    } else {
      setUser(null);
    }
  }, [accessToken, refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest({ email, password });
    tokenStorage.setTokens(response.access, response.refresh);
    setSessionExpired(false);
    setAccessToken(response.access);
    await refreshProfile();
  }, [refreshProfile]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.error("No se pudo registrar el cierre de sesion.", error);
    } finally {
      tokenStorage.clear("logout");
      setAccessToken(null);
      setUser(null);
      setSessionExpired(false);
    }
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(accessToken),
      accessToken,
      user,
      sessionExpired,
      login,
      logout,
      clearSessionExpired,
      refreshProfile,
    }),
    [accessToken, clearSessionExpired, login, logout, refreshProfile, sessionExpired, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
