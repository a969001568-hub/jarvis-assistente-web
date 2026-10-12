import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/news")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await fetch("https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419", { signal: AbortSignal.timeout(6000) });
          const xml = await res.text();
          const items = (xml.match(/<item>[\s\S]*?<\/item>/g) ?? []).slice(0, 6).map((it) => ({
            title: (it.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
            url: it.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "",
          }));
          return Response.json({ items }, { headers: { "Cache-Control": "public, max-age=600" } });
        } catch {
          return Response.json({ items: [] });
        }
      },
    },
  },
});
