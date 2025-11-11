function decodeBase64Url(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const base64 = `${normalized}${padding}`;
  if (typeof globalThis !== "undefined" && typeof globalThis.atob === "function") {
    return globalThis.atob(base64);
  }
  throw new Error("Base64 decoding no soportado en este entorno.");
}

export function getJwtExpiration(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const decoded = decodeBase64Url(payload);
    const data = JSON.parse(decoded) as { exp?: number };
    if (typeof data.exp !== "number") return null;
    return data.exp * 1000;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, offsetSeconds = 30): boolean {
  const expiration = getJwtExpiration(token);
  if (!expiration) return false;
  return expiration <= Date.now() + offsetSeconds * 1000;
}
