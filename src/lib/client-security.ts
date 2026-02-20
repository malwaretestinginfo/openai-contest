const CSRF_COOKIE = "__csrf_token";
const API_AUTH_COOKIE = "__api_auth";

function generateToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Strict`;
}

export function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${name}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(prefix.length));
}

export function getCsrfToken(): string {
  return getCookieValue(CSRF_COOKIE) ?? "";
}

export function getApiAuthToken(): string {
  return getCookieValue(API_AUTH_COOKIE) ?? "";
}

export function ensureSecurityCookies() {
  const csrf = getCookieValue(CSRF_COOKIE);
  const apiAuth = getCookieValue(API_AUTH_COOKIE);

  if (!csrf) {
    setCookie(CSRF_COOKIE, generateToken());
  }

  if (!apiAuth) {
    setCookie(API_AUTH_COOKIE, generateToken());
  }
}

export function getSecurityHeaders() {
  ensureSecurityCookies();
  const csrf = getCsrfToken();
  const apiAuth = getApiAuthToken();
  return {
    "x-csrf-token": csrf,
    "x-api-auth": apiAuth
  };
}
