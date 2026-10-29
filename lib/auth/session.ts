import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const STAFF_SESSION_COOKIE = "leo_staff_session";
export const STAFF_SESSION_SECONDS = 60 * 60 * 8;

function sessionSecret() {
  const secret = process.env.STAFF_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("STAFF_SESSION_SECRET must contain at least 32 characters.");
  }
  const passwordHash = process.env.STAFF_SHARED_PASSWORD_HASH;
  if (!passwordHash) throw new Error("STAFF_SHARED_PASSWORD_HASH is required.");
  return `${secret}:${passwordHash}`;
}

export function createStaffSession() {
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + STAFF_SESSION_SECONDS,
    nonce: randomBytes(16).toString("base64url"),
  })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export async function isValidSharedPassword(password: string) {
  const stored = process.env.STAFF_SHARED_PASSWORD_HASH;
  const [algorithm, saltHex, expectedHex, extra] = stored?.split("$") ?? [];
  if (algorithm !== "scrypt" || !saltHex || !expectedHex || extra || !/^[a-f\d]{32,128}$/i.test(saltHex) || !/^[a-f\d]{128}$/i.test(expectedHex)) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, expected.length, { N: 16_384, r: 8, p: 1 }, (error, result) => {
      if (error) reject(error);
      else resolve(result as Buffer);
    });
  });
  return timingSafeEqual(derived, expected);
}

export function hasAuthConfiguration() {
  return Boolean(process.env.STAFF_SHARED_PASSWORD_HASH && process.env.STAFF_SESSION_SECRET?.length && process.env.STAFF_SESSION_SECRET.length >= 32);
}
