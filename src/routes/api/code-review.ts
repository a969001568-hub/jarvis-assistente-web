import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/code-review")({
  server: { handlers: {
    GET: async () => {
      const { inspectCode } = await import("@/lib/code-copy.server");
      return Response.json(inspectCode(), { headers: { "Cache-Control": "no-store" } });
    },
    POST: async ({ request }) => {
      const parsed = z.object({ approvedId: z.literal("voice-calm-v1") }).safeParse(await request.json().catch(() => null));
      if (!parsed.success) return Response.json({ error: "Confirme a revisão antes de criar a cópia." }, { status: 400 });
      const { createReviewedCopy } = await import("@/lib/code-copy.server");
      const bytes = createReviewedCopy(parsed.data.approvedId);
      return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="jarvis-copia-revisada.zip"', "Cache-Control": "no-store" } });
    },
  } },
});