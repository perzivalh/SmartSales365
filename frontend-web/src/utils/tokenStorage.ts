const ACCESS_KEY = "smartsales365.accessToken";
const REFRESH_KEY = "smartsales365.refreshToken";

export type StoredTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

export type TokenChangeReason = "set" | "logout" | "expired";
export type TokenListener = (tokens: StoredTokens, context: { reason: TokenChangeReason }) => void;

const isBrowser = typeof window !== "undefined";
const listeners = new Set<TokenListener>();

function readTokens(): StoredTokens {
  if (!isBrowser) return { accessToken: null, refreshToken: null };
  return {
    accessToken: window.localStorage.getItem(ACCESS_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_KEY),
  };
}

function notify(reason: TokenChangeReason) {
  if (!isBrowser) return;
  const tokens = readTokens();
  listeners.forEach((listener) => {
    listener(tokens, { reason });
  });
}

export const tokenStorage = {
  getTokens(): StoredTokens {
    return readTokens();
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
    notify("set");
  },
  clear(reason: TokenChangeReason = "logout") {
    if (!isBrowser) return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    notify(reason);
  },
  subscribe(listener: TokenListener) {
    if (!isBrowser) {
      return () => {};
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
