import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set({
    name: "mizo_access",
    value: "",
    path: "/",
    maxAge: 0,
  });
  return res;
}