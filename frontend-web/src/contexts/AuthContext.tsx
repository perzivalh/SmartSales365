import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ReactNode } from "react";

import { login as loginRequest } from "../api/auth";
import { tokenStorage } from "../utils/tokenStorage";

type AuthContextValue = {
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const tokens = tokenStorage.getTokens();
    if (tokens.accessToken) {
      setAccessToken(tokens.accessToken);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest({ email, password });
    tokenStorage.setTokens(response.access, response.refresh);
    setAccessToken(response.access);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setAccessToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(accessToken),
      accessToken,
      login,
      logout,
    }),
    [accessToken, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };


