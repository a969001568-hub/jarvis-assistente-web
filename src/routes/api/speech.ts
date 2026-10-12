import { createFileRoute } from "@tanstack/react-router";
import { requestSpeech } from "@/lib/speech-request.server";

export const Route = createFileRoute("/api/speech")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "Chave de IA não configurada." }, { status: 401 });
        let text = "";
        try {
          text = String((await request.json()).text ?? "").trim().slice(0, 2400);
        } catch {}
        if (!text) return Response.json({ error: "Texto vazio." }, { status: 400 });
        const prompt =
          "Leia em português brasileiro, com voz masculina grave, calma e elegante, " +
          "como um mordomo britânico refinado e levemente irônico, ritmo sereno: " + text;
        try {
          const upstream = await requestSpeech(
            {
              baseURL: "https://ai.gateway.lovable.dev",
              apiKey,
              model: "google/gemini-3.1-flash-tts-preview",
              format: "gemini",
              voice: "Charon",
            },
            prompt,
            false,
            request.signal,
          );
          return new Response(upstream.body, {
            status: upstream.status,
            headers: {
              "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
              "Cache-Control": "no-cache",
            },
          });
        } catch (e) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw e;
        }
      },
    },
  },
});
