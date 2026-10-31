import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ error: "Server database access is not configured." }, { status: 503 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let channel: ReturnType<typeof supabase.channel> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown = {}) => {
        if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      controller.enqueue(encoder.encode("retry: 10000\n\n"));

      channel = supabase
        .channel("staff-dashboard-reservation-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => send("change", { table: "reservations" }))
        .on("postgres_changes", { event: "*", schema: "public", table: "reservation_inquiries" }, () => send("change", { table: "reservation_inquiries" }))
        .subscribe((status) => {
          if (status === "SUBSCRIBED") send("ready");
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            send("unavailable");
            if (!closed) {
              closed = true;
              if (heartbeat) clearInterval(heartbeat);
              controller.close();
            }
          }
        });

      heartbeat = setInterval(() => send("keepalive"), 25_000);
    },
    async cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (channel) await supabase.removeChannel(channel);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "private, no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
