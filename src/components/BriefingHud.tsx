import { useQuery } from "@tanstack/react-query";
import { CloudSun, Landmark, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { getForecast, WEATHER_PLACES } from "@/lib/jarvis-context";

type NewsItem = { title: string; url: string; source?: string };

async function fetchNews(category: string): Promise<NewsItem[]> {
  const r = await fetch(`/api/news?category=${encodeURIComponent(category)}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "Manchetes indisponíveis");
  return (j.items ?? []).slice(0, 3);
}

function useNews(category: string) {
  return useQuery({ queryKey: ["briefing-news", category], queryFn: () => fetchNews(category), staleTime: 180000 });
}

const BOOT_LINES = ["Protocolo relatório diário", "Sincronizando política", "Sincronizando basquete", "Sincronizando clima", "Pronto, senhor"];

function Card({ index, title, icon, children }: { index: number; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <article className="briefing-card" style={{ animationDelay: `${2.4 + index * 0.25}s` }}>
      <header className="briefing-card-head">
        <span className="hud-label">{`0${index + 1}`}</span>
        <span className="briefing-card-icon" aria-hidden="true">{icon}</span>
        <h3 className="font-display text-sm uppercase">{title}</h3>
      </header>
      <div className="briefing-card-body">{children}</div>
      <span className="briefing-card-scan" aria-hidden="true" />
    </article>
  );
}

function Headlines({ category }: { category: string }) {
  const { data, isLoading, isError } = useNews(category);
  if (isLoading) return <p className="text-sm text-muted-foreground">Consultando fontes…</p>;
  if (isError || !data?.length) return <p className="text-sm text-muted-foreground">Sem manchetes disponíveis agora.</p>;
  return (
    <ul className="space-y-2">
      {data.map((n) => (
        <li key={n.url}>
          <a href={n.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-sm leading-snug hover:text-primary">{n.title}</a>
          <span className="text-xs text-muted-foreground">{n.source}</span>
        </li>
      ))}
    </ul>
  );
}

function Weather() {
  const { data, isLoading } = useQuery({
    queryKey: ["briefing-weather"],
    queryFn: () => Promise.all(WEATHER_PLACES.map((p) => getForecast(p).catch(() => null))),
    staleTime: 600000,
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Consultando clima…</p>;
  const values = (data ?? []).filter((f) => f !== null);
  if (!values.length) return <p className="text-sm text-muted-foreground">Clima indisponível.</p>;
  return (
    <ul className="space-y-3">
      {values.map((f) => (
        <li key={f.name} className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm">{f.name}</p>
            <p className="text-xs text-muted-foreground">{`${f.description} · Máx. ${f.max}° · Mín. ${f.min}°`}</p>
          </div>
          <span className="font-display text-3xl text-primary">{`${f.temperature}°`}</span>
        </li>
      ))}
    </ul>
  );
}

export function BriefingBoot() {
  return (
    <div className="briefing-boot" aria-hidden="true">
      <div className="boot-rings"><span /><span /><span /></div>
      <div className="boot-lines">
        {BOOT_LINES.map((line, i) => (
          <p key={line} className="hud-label boot-line" style={{ animationDelay: `${0.25 + i * 0.35}s` }}>{`> ${line}`}</p>
        ))}
      </div>
      <span className="boot-sweep" />
    </div>
  );
}

export function BriefingHud() {
  return (
    <section className="briefing-hud" aria-label="Relatório do dia">
      <Card index={0} title="Política" icon={<Landmark className="size-4" />}><Headlines category="Política" /></Card>
      <Card index={1} title="Basquete" icon={<Trophy className="size-4" />}><Headlines category="Basquete" /></Card>
      <Card index={2} title="Clima" icon={<CloudSun className="size-4" />}><Weather /></Card>
    </section>
  );
}
