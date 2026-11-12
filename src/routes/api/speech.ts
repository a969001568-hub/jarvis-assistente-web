import { createFileRoute } from "@tanstack/react-router";
import { requestSpeech } from "@/lib/speech-request.server";

export const Route = createFileRoute("/api/speech")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let text = "";
        try {
          text = String((await request.json()).text ?? "").trim().slice(0, 2400);
        } catch {}
        if (!text) return Response.json({ error: "Texto vazio." }, { status: 400 });
        // Preferred voice: ElevenLabs stock British butler-like voice, re-framed
        // as the same SSE PCM events the browser player already understands.
        if (process.env["ELEVENLABS_API_KEY"]) {
          const { elevenLabsSpeech } = await import("@/lib/elevenlabs-speech.server");
          const voice = await elevenLabsSpeech(text, request.signal).catch(() => null);
          if (voice) return voice;
        }
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "Chave de IA não configurada." }, { status: 401 });
        const prompt =
          "Fale em português brasileiro de forma natural e conversacional, voz masculina calma, " +
          "tom seco e levemente irônico, sem dramatizar nem exagerar a entonação. " +
          "Ritmo fluido e um pouco ágil, emendando as frases, com pausas bem curtas nos pontos finais: " + text;
        try {
          const upstream = await requestSpeech(
            {
              baseURL: "https://ai.gateway.lovable.dev",
              apiKey,
              model: "google/gemini-3.1-flash-tts-preview",
              format: "gemini",
              voice: "Iapetus",
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
