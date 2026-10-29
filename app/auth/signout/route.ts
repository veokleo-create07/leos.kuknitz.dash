import { NextResponse, type NextRequest } from "next/server";
import { STAFF_SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/login?message=signed_out", request.url), 303);
  response.cookies.set(STAFF_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
