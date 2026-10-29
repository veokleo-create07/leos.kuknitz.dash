import { NextResponse, type NextRequest } from "next/server";
import { createStaffSession, hasAuthConfiguration, isValidSharedPassword, STAFF_SESSION_COOKIE, STAFF_SESSION_SECONDS } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.redirect(new URL("/login?error=invalid_request", request.url), 303);
  }

  if (!hasAuthConfiguration()) {
    return NextResponse.redirect(new URL("/login?error=configuration", request.url), 303);
  }

  let password = "";
  try {
    const formData = await request.formData();
    password = String(formData.get("password") ?? "");
  } catch {
    return NextResponse.redirect(new URL("/login?error=invalid_request", request.url), 303);
  }

  let passwordMatches = false;
  try {
    passwordMatches = await isValidSharedPassword(password);
  } catch {
    return NextResponse.redirect(new URL("/login?error=configuration", request.url), 303);
  }

  if (!passwordMatches) {
    return NextResponse.redirect(new URL("/login?error=invalid_credentials", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(STAFF_SESSION_COOKIE, createStaffSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: STAFF_SESSION_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
