import { NextRequest, NextResponse } from "next/server";

// Public endpoints, health checks, and static assets accessible without authentication
const PUBLIC_PREFIXES = [
  "/api/auth",   // Better Auth authentication handlers
  "/api/health", // Health check API
  "/health",     // Health status UI
  "/img",        // Public images
  "/icons",      // App icons
];

// Auth pages for visitors who are NOT logged in
const AUTH_ROUTES = [
  "/sign-in",
  "/sign-up",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public API and health routes
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 2. Check Better Auth session token cookie (HTTP in dev, Secure in production)
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ??
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const isAuthenticated = Boolean(sessionToken);

  // 3. Handle Root "/"
  if (pathname === "/") {
    const target = isAuthenticated ? "/dashboard" : "/sign-in";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 4. Handle Auth Pages (/sign-in, /sign-up)
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (isAuthRoute) {
    // If already logged in, redirect away from sign-in/sign-up to dashboard
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 5. Protect API routes (/api/v1/*)
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 6. Protect All App Pages (/dashboard, /orgs, etc.)
  if (!isAuthenticated) {
    const signInUrl = new URL("/sign-in", request.url);
    if (pathname !== "/dashboard") {
      signInUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|img/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
