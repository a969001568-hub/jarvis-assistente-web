// Server-only ElevenLabs TTS. Uses a stock library voice (no cloning of real
// people) and converts the raw PCM stream into speech.audio.delta SSE events.
export const JARVIS_VOICE_ID = "onwK4e9ZLuTAKqWW03F9"; // "Daniel": calm, deep, British broadcaster

export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function elevenLabsSpeech(text: string, signal: AbortSignal): Promise<Response | null> {
  const key = process.env["ELEVENLABS_API_KEY"];
  if (!key) return null;
  const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${JARVIS_VOICE_ID}/stream?output_format=pcm_24000`, {
    method: "POST",
    signal,
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      language_code: "pt",
      voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 1.05 },
    }),
  });
  if (!upstream.ok || !upstream.body) {
    console.error(`ElevenLabs TTS failed [${upstream.status}]: ${await upstream.text().catch(() => "")}`);
    return null;
  }
  const enc = new TextEncoder();
  const reader = upstream.body.getReader();
  let carry = new Uint8Array(0);
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const part = await reader.read();
      if (part.done) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "speech.audio.done" })}\n\n`));
        controller.close();
        return;
      }
      const all = new Uint8Array(carry.length + part.value.length);
      all.set(carry); all.set(part.value, carry.length);
      const even = all.length - (all.length % 2);
      carry = all.slice(even);
      if (even) controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "speech.audio.delta", audio: toBase64(all.subarray(0, even)) })}\n\n`));
    },
    cancel() { void reader.cancel(); },
  });
  return new Response(body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Jarvis-Voice": "elevenlabs" } });
}
