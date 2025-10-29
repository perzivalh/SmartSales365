const ACCESS_KEY = "smartsales365.accessToken";
const REFRESH_KEY = "smartsales365.refreshToken";

export type StoredTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

const isBrowser = typeof window !== "undefined";

export const tokenStorage = {
  getTokens(): StoredTokens {
    if (!isBrowser) return { accessToken: null, refreshToken: null };
    return {
      accessToken: window.localStorage.getItem(ACCESS_KEY),
      refreshToken: window.localStorage.getItem(REFRESH_KEY),
    };
  },
  setTokens(accessToken: string | null, refreshToken: string | null) {
    if (!isBrowser) return;
    if (accessToken) {
      window.localStorage.setItem(ACCESS_KEY, accessToken);
    } else {
      window.localStorage.removeItem(ACCESS_KEY);
    }
    if (refreshToken) {
      window.localStorage.setItem(REFRESH_KEY, refreshToken);
    } else {
      window.localStorage.removeItem(REFRESH_KEY);
    }
  },
  clear() {
    if (!isBrowser) return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

