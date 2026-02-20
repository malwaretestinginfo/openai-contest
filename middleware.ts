import { NextRequest, NextResponse } from "next/server";

const API_AUTH_COOKIE = "__api_auth";
const CSRF_COOKIE = "__csrf_token";

function createToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function withSecurityCookies(request: NextRequest, response: NextResponse) {
  const secure = process.env.NODE_ENV === "production";
  const hasApiAuth = Boolean(request.cookies.get(API_AUTH_COOKIE)?.value);
  const hasCsrf = Boolean(request.cookies.get(CSRF_COOKIE)?.value);

  if (!hasApiAuth) {
    response.cookies.set(API_AUTH_COOKIE, createToken(), {
      httpOnly: false,
      secure,
      sameSite: "strict",
      path: "/"
    });
  }

  if (!hasCsrf) {
    response.cookies.set(CSRF_COOKIE, createToken(), {
      httpOnly: false,
      secure,
      sameSite: "strict",
      path: "/"
    });
  }
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  withSecurityCookies(request, response);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
