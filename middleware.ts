import { NextResponse, type NextRequest } from "next/server";

const cookieName = "leo_staff_session";
const loginPath = "/login";
const sessionSeconds = 60 * 60 * 8;

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function validSession(token: string | undefined) {
  const secret = process.env.STAFF_SESSION_SECRET;
  const passwordHash = process.env.STAFF_SHARED_PASSWORD_HASH;
  if (!secret || secret.length < 32 || !passwordHash || !token) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(`${secret}:${passwordHash}`),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const verified = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signature),
      new TextEncoder().encode(payload),
    );
    if (!verified) return false;

    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as { exp?: unknown };
    return typeof claims.exp === "number" && claims.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

async function refreshSession() {
  const secret = process.env.STAFF_SESSION_SECRET;
  const passwordHash = process.env.STAFF_SHARED_PASSWORD_HASH;
  if (!secret || !passwordHash) return null;
  const payload = btoa(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + sessionSeconds,
    nonce: Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join(""),
  })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${secret}:${passwordHash}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  const encodedSignature = btoa(String.fromCharCode(...signature)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${payload}.${encodedSignature}`;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === loginPath;
  const isLoginAction = pathname === "/auth/login";
  const sessionIsValid = await validSession(request.cookies.get(cookieName)?.value);

  if (isLoginAction) return NextResponse.next();

  if (!process.env.STAFF_SHARED_PASSWORD_HASH || !process.env.STAFF_SESSION_SECRET || process.env.STAFF_SESSION_SECRET.length < 32) {
    if (isLogin) {
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = loginPath;
    loginUrl.search = "?error=configuration";
    return NextResponse.redirect(loginUrl);
  }

  if (!isLogin && !sessionIsValid) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = loginPath;
    loginUrl.search = "?error=" + (request.cookies.has(cookieName) ? "session_expired" : "unauthenticated");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(cookieName, "", { path: "/", maxAge: 0 });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }

  if (isLogin && sessionIsValid) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  const response = NextResponse.next();
  if (sessionIsValid) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response.cookies.set(cookieName, refreshed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: sessionSeconds,
      });
    }
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
