import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Gate the simulator behind the cookie set after successful Stripe verification.
  if (!pathname.startsWith("/app")) return NextResponse.next();

  const access = request.cookies.get("mizo_access")?.value;

  if (!access) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("reason", "subscribe");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};