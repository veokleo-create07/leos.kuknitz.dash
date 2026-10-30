import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const STAFF_SESSION_COOKIE = "leo_staff_session";
// Authenticated requests extend the session, so this is a six-month idle window.
export const STAFF_SESSION_SECONDS = 60 * 60 * 24 * 30 * 6;

function sharedPassword() {
  const password = process.env.STAFF_SHARED_PASSWORD;
  if (!password) throw new Error("STAFF_SHARED_PASSWORD is required.");
  return password;
}

function sessionSigningKey() {
  return createHmac("sha256", sharedPassword())
    .update("Leo's Juice & Burger staff session signing key v1")
    .digest();
}

export function createStaffSession() {
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + STAFF_SESSION_SECONDS,
    nonce: randomBytes(16).toString("base64url"),
  })).toString("base64url");
  const signature = createHmac("sha256", sessionSigningKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function isValidSharedPassword(password: string) {
  const expected = createHmac("sha256", "staff password comparison v1")
    .update(sharedPassword())
    .digest();
  const supplied = createHmac("sha256", "staff password comparison v1")
    .update(password)
    .digest();
  return timingSafeEqual(supplied, expected);
}

export function hasAuthConfiguration() {
  return Boolean(process.env.STAFF_SHARED_PASSWORD);
}
