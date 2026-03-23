import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    !pathname.startsWith("/api/config") &&
    !pathname.startsWith("/api/files/")
  ) {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const demoPassword = process.env.DEMO_PASSWORD;

    if (!demoPassword || token !== demoPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
