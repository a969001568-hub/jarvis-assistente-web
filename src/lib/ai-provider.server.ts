export type ChatProvider = { name: string; url: string; key: string; model: string; maxContext: number };

/**
 * Any OpenAI-compatible key works. The provider is detected from the key prefix so the
 * user only needs to paste AI_API_KEY; AI_BASE_URL / AI_MODEL override the defaults.
 */
const KNOWN: { test: RegExp; name: string; base: string; model: string; maxContext: number }[] = [
  { test: /^gsk_/, name: "Groq", base: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", maxContext: 22000 },
  { test: /^AIza/, name: "Google Gemini", base: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash", maxContext: 60000 },
  { test: /^sk-or-/, name: "OpenRouter", base: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct:free", maxContext: 40000 },
];

export function resolveChatProvider(env: NodeJS.ProcessEnv = process.env): ChatProvider | null {
  const key = env["AI_API_KEY"]?.trim();
  if (key) {
    const known = KNOWN.find((k) => k.test.test(key));
    const base = (env["AI_BASE_URL"]?.trim() || known?.base || "https://api.openai.com/v1").replace(/\/+$/, "");
    return {
      name: known?.name ?? "OpenAI-compatível",
      url: `${base}/chat/completions`,
      key,
      model: env["AI_MODEL"]?.trim() || known?.model || "gpt-4o-mini",
      maxContext: known?.maxContext ?? 40000,
    };
  }
  const gatewayKey = env["AI_GATEWAY_API_KEY"] || env["VERCEL_OIDC_TOKEN"];
  if (gatewayKey) {
    return { name: "Vercel AI Gateway", url: "https://ai-gateway.vercel.sh/v1/chat/completions", key: gatewayKey, model: env["AI_MODEL"]?.trim() || "google/gemini-3.5-flash-lite", maxContext: 60000 };
  }
  return null;
}
