import { createFileRoute } from "@tanstack/react-router";
const decode = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
export const Route = createFileRoute("/api/news")({ server: { handlers: { GET: async ({ request }) => {
  const category = new URL(request.url).searchParams.get("category") ?? "Geral";
  const queries: Record<string, string> = { Geral: "Brasil notícias", Política: "política Brasil", Futebol: "futebol jogos resultados", Basquete: "basquete NBA NBB" };
  if (!(category in queries)) return Response.json({ error: "Categoria inválida" }, { status: 400 });
  try {
    const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(queries[category] + " when:1d")}&hl=pt-BR&gl=BR&ceid=BR:pt-419`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error("Notícias indisponíveis");
    const xml = await res.text();
    const seen = new Set<string>();
    const items = (xml.match(/<item>[\s\S]*?<\/item>/g) ?? []).flatMap((it) => {
      const get = (tag: string) => decode(it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "");
      const title = get("title"); const url = get("link"); const source = get("source"); const date = new Date(get("pubDate"));
      if (!title || !url.startsWith("https://") || seen.has(title)) return [];
      seen.add(title);
      return [{ title: source && title.endsWith(` - ${source}`) ? title.slice(0, -(source.length + 3)) : title, url, source, publishedAt: Number.isNaN(date.getTime()) ? null : date.toISOString(), category }];
    }).slice(0, 10);
    return Response.json({ items, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=120" } });
  } catch { return Response.json({ error: "Manchetes indisponíveis", items: [] }, { status: 502 }); }
} } } });
