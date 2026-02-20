import { NextRequest } from "next/server";

const API_AUTH_COOKIE = "__api_auth";
const CSRF_COOKIE = "__csrf_token";
const CSRF_HEADER = "x-csrf-token";
const API_AUTH_HEADER = "x-api-auth";

type SecurityCheckResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
    };

function isSameOrigin(originValue: string | null, expectedOrigin: string) {
  if (!originValue) {
    return false;
  }

  try {
    return new URL(originValue).origin === expectedOrigin;
  } catch {
    return false;
  }
}

export function verifyApiSecurity(request: NextRequest): SecurityCheckResult {
  const expectedOrigin = request.nextUrl.origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const secFetchSite = request.headers.get("sec-fetch-site");

  const sameOriginByOrigin = isSameOrigin(origin, expectedOrigin);
  const sameOriginByReferer = isSameOrigin(referer, expectedOrigin);
  const fetchSiteAllowed =
    !secFetchSite || secFetchSite === "same-origin" || secFetchSite === "same-site" || secFetchSite === "none";

  if ((!sameOriginByOrigin && !sameOriginByReferer) || !fetchSiteAllowed) {
    return { ok: false, status: 403, error: "Blocked by CSRF origin policy" };
  }

  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "OPTIONS") {
    const apiAuthCookie = request.cookies.get(API_AUTH_COOKIE)?.value;
    const apiAuthHeader = request.headers.get(API_AUTH_HEADER);
    if (!apiAuthCookie || !apiAuthHeader || apiAuthCookie !== apiAuthHeader || apiAuthCookie.length < 32) {
      return { ok: false, status: 401, error: "Invalid API auth session" };
    }

    const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
    const csrfHeader = request.headers.get(CSRF_HEADER);
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return { ok: false, status: 403, error: "Invalid CSRF token" };
    }
  }

  return { ok: true };
}
