import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { resolveChatProvider } from "@/lib/ai-provider.server";
import { getSourceSnapshot } from "@/lib/source-snapshot.server";

const FOCUS = ["interface e layout", "comunicação e tom da voz", "interação por voz e escuta", "desempenho e confiabilidade", "acessibilidade", "relatório do dia"];

const PROMPT = `Você é o J.A.R.V.I.S. revisando o próprio código enquanto está ocioso.
Referência principal de estilo: o JARVIS do criador Luighi Feodrippe (@pelainteligencia) — HUD holográfico ciano escuro, reator central animado, voz masculina calma com ironia britânica, respostas faladas curtas e boletins cinematográficos. Referências secundárias: criadores de IA como @mansoorxai, @eusoubrunocunha, @aiburner_official e @thuliobittencourt (automação prática, demos visuais diretas).
Analise o código e proponha UMA melhoria concreta, pequena e segura, focada em: {focus}.
Evite repetir estas ideias já registradas: {previous}.
Responda SOMENTE com JSON válido: {"area":"...","titulo":"até 8 palavras","problema":"1 frase","sugestao":"1 a 2 frases objetivas, citando o arquivo"}.`;

export const Route = createFileRoute("/api/self-review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provider = resolveChatProvider();
        if (!provider) return Response.json({ error: "Chave de IA não configurada." }, { status: 401 });
        let previous: string[] = [];
        try {
          previous = z.object({ previous: z.array(z.string().max(120)).max(30) }).parse(await request.json()).previous;
        } catch {}
        const focus = FOCUS[Math.floor(Math.random() * FOCUS.length)] ?? "interface e layout";
        const system = PROMPT.replace("{focus}", focus).replace("{previous}", previous.join("; ") || "nenhuma");
        const code = getSourceSnapshot().slice(0, Math.max(4000, provider.maxContext - system.length - 500));
        try {
          const res = await fetch(provider.url, {
            method: "POST",
            signal: request.signal,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.key}` },
            body: JSON.stringify({ model: provider.model, temperature: 0.7, messages: [{ role: "system", content: system }, { role: "user", content: code }] }),
          });
          if (!res.ok) return Response.json({ error: `${provider.name} indisponível.` }, { status: res.status === 429 ? 429 : 502 });
          const text: string = (await res.json()).choices?.[0]?.message?.content ?? "";
          const json = text.match(/\{[\s\S]*\}/)?.[0];
          const item = z.object({ area: z.string(), titulo: z.string(), problema: z.string(), sugestao: z.string() }).parse(JSON.parse(json ?? ""));
          return Response.json({ ...item, area: item.area || focus });
        } catch {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          return Response.json({ error: "Análise inconclusiva." }, { status: 502 });
        }
      },
    },
  },
});
