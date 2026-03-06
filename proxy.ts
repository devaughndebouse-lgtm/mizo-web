import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect the simulator area
  if (!pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  const access = request.cookies.get("mizo_access")?.value;

  if (access === "1") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("reason", "subscribe");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/app/:path*"],
};