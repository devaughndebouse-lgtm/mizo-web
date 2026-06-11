import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  const access = request.cookies.get("mizo_access")?.value;
  const accessTrack = request.cookies.get("mizo_track")?.value;
  const requestedTrack =
    request.nextUrl.searchParams.get("track") === "master" ? "master" : "journeyman";

  if (access === "1" && (requestedTrack !== "master" || accessTrack === "master")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = requestedTrack === "master" ? "/master-login" : "/login";
  url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/app/:path*"],
};
