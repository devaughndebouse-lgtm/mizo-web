import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const isStudy = req.nextUrl.pathname.startsWith("/study");

  if (!isStudy) return NextResponse.next();

  // Cookie set after successful payment/verify
  const sub = req.cookies.get("mizo_sub")?.value;

  if (!sub) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("reason", "subscribe");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/study/:path*"],
};