import { getForecast } from "@/lib/jarvis-context";

// Reads public HTTPS web pages for the assistant. Private/loopback/IP-literal
// hosts, custom ports and embedded credentials are rejected, every redirect hop
// is re-validated, and response bodies are bounded.
const blockedHost = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|arpa)$/i;
export function isPublicWebUrl(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" || u.port || u.username || u.password) return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || blockedHost.test(h) || /^[\d.]+$/.test(h) || h.includes(":") || h.startsWith("[")) return null;
  return u;
}

export async function readPublicArticle(url: string): Promise<string> {
  let target = isPublicWebUrl(url);
  try {
    for (let hop = 0; target && hop < 4; hop++) {
      const response = await fetch(target, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (X11; CrOS x86_64) Chrome/126", Accept: "text/html", "Accept-Language": "pt-BR,pt;q=0.9" }, signal: AbortSignal.timeout(5000) });
      if (response.status >= 300 && response.status < 400) {
        const next = response.headers.get("location");
        await response.body?.cancel();
        target = next ? isPublicWebUrl(new URL(next, target).toString()) : null;
        continue;
      }
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html") || !response.body) return "";
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let text = ""; let bytes = 0;
      try { for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; if (bytes > 500000) break; text += decoder.decode(part.value, { stream: true }); } } finally { await reader.cancel(); }
      return text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<(nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&nbsp;|&amp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
    }
  } catch {}
  return "";
}

// "clima em Curitiba" -> live forecast for that city via Open-Meteo geocoding.
export async function forecastForMentionedCity(query: string) {
  const name = query.match(/\b(?:em|no|na|de|para)\s+([A-ZÀ-Ú][\p{L}'-]+(?:\s+(?:de|do|da|dos|das)?\s*[A-ZÀ-Ú][\p{L}'-]+)*)/u)?.[1];
  if (!name || /santana|s[aã]o paulo$/i.test(name)) return null;
  const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&name=${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(4000) });
  const place = (await geo.json())?.results?.[0];
  if (!place) return null;
  return getForecast({ name: place.name, latitude: place.latitude, longitude: place.longitude } as never, AbortSignal.timeout(5000));
}
