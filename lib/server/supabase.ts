import "server-only";

const base = () => process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export class SupabaseError extends Error {
  constructor(message: string, readonly status = 500) { super(message); }
}

export async function db(path: string, init: RequestInit = {}) {
  if (!base() || !key()) throw new SupabaseError("Server database access is not configured.", 503);
  const response = await fetch(`${base()}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key()!, authorization: `Bearer ${key()!}`,
      "content-type": "application/json", ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await response.text();
  if (!response.ok) {
    let message = "Supabase request failed.";
    try { message = (JSON.parse(body) as { message?: string }).message ?? message; } catch { /* response may be empty */ }
    throw new SupabaseError(message, response.status);
  }
  return body ? JSON.parse(body) as unknown : null;
}

export function reservationStatus(raw: string) {
  if (raw === "arrived") return "Arrived";
  if (raw === "completed") return "Completed";
  if (raw === "cancelled") return "Cancelled";
  if (raw === "no_show") return "No-show";
  return "Confirmed";
}

export function inquiryStatus(raw: string) {
  if (raw === "contacted") return "In progress";
  if (raw === "closed") return "Handled";
  return "New";
}
