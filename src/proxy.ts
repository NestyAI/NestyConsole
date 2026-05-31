import { NextResponse, type NextRequest } from "next/server";

import { getSessionFromRequest } from "@/lib/auth/session";

function isStaticAsset(pathname: string): boolean {
  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

function isProtectedPage(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }
  return (
    pathname.startsWith("/chat") ||
    pathname.startsWith("/status") ||
    pathname.startsWith("/models") ||
    pathname.startsWith("/settings")
  );
}

function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/favicon.ico" || pathname.startsWith("/_next") || isStaticAsset(pathname);
}

function isPublicApiPath(pathname: string): boolean {
  return pathname === "/api/auth/login" || pathname === "/api/auth/logout" || pathname === "/api/auth/me";
}

function unauthorizedApiResponse() {
  return NextResponse.json(
    {
      error: {
        code: "unauthorized",
        message: "Authentication required.",
        type: "console_error"
      }
    },
    { status: 401 }
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/") && isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return unauthorizedApiResponse();
    }

    if (isProtectedPage(pathname)) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname === "/login") {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
