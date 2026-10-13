import { useEffect, useState } from "react";
import { ArrowUpRight, CloudSun, LocateFixed, RefreshCw, Sun, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getForecast, WEATHER_PLACES, type Forecast } from "@/lib/jarvis-context";

export function ClockWidget() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return <div className="widget clock-widget"><div className="widget-label">Horário local</div><div className="font-display text-4xl text-foreground">{now?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "--:--"}</div><div className="mt-2 text-sm capitalize text-muted-foreground">{now?.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" }) ?? "—"}</div></div>;
}
export function WeatherWidget() {
  const [places, setPlaces] = useState(WEATHER_PLACES);
  const [forecasts, setForecasts] = useState<(Forecast | null)[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => { setLoading(true); const values = await Promise.all(places.map((p) => getForecast(p, controller.signal).catch(() => null))); if (!controller.signal.aborted) { setForecasts(values); setLoading(false); } };
    void load(); const timer = setInterval(load, 600000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [places]);
  useEffect(() => { const timer = setInterval(() => setActive((a) => 1 - a), 9000); return () => clearInterval(timer); }, []);
  const locate = () => {
    if (!navigator.geolocation) { setLocationError("Localização indisponível."); return; }
    navigator.geolocation.getCurrentPosition((position) => { setLocationError(""); setPlaces([WEATHER_PLACES[0], { name: "Sua localização", latitude: position.coords.latitude, longitude: position.coords.longitude }]); setActive(1); }, () => setLocationError("Localização não autorizada; exibindo São Paulo."), { timeout: 12000, maximumAge: 300000 });
  };
  const w = forecasts[active];
  return <div className="widget widget-weather col-span-2"><div className="flex items-center justify-between"><div className="widget-label">Clima agora</div><Button variant="ghost" size="icon" aria-label="Usar minha localização" title="Usar minha localização" onClick={locate}><LocateFixed /></Button></div><div key={active} className="weather-change"><div className="text-sm">{places[active].name}</div><div className="my-2 flex items-center justify-between"><span className="font-display text-5xl">{w ? `${w.temperature}°` : loading ? "…" : "—"}</span>{w?.description.includes("limpo") ? <Sun className="size-10 text-accent" /> : <CloudSun className="size-10 text-accent" />}</div><div className="text-sm">{w?.description ?? (loading ? "Consultando clima" : "Clima indisponível")}</div>{w && <div className="mt-1 text-xs text-muted-foreground">Máx. {w.max}° · Mín. {w.min}° · {w.observedAt.split("T")[1]}</div>}</div><div className="mt-3 flex gap-2">{places.map((p, i) => <Button key={p.name} variant="ghost" className={`h-5 w-5 p-0 ${i === active ? "text-primary" : "text-muted-foreground"}`} onClick={() => setActive(i)} aria-label={`Exibir clima de ${p.name}`} aria-pressed={i === active}><span className={`h-1 w-4 rounded-full ${i === active ? "bg-primary" : "bg-muted-foreground/40"}`} /></Button>)}</div>{locationError && <p role="status" className="mt-2 text-xs text-warn">{locationError}</p>}</div>;
}
export function StatusWidget({ state, mem, max }: { state: string; mem: number; max: number }) {
  return <div className="widget"><div className="widget-label">Memória local</div><div className="font-display text-2xl">{mem.toLocaleString("pt-BR")}</div><div className="text-xs text-muted-foreground">de {max.toLocaleString("pt-BR")} mensagens</div><progress className="memory-meter mt-3 w-full" value={mem} max={max} aria-label="Memória utilizada" /><div className="mt-2 flex items-center gap-1 text-xs text-primary"><Radio className="size-3" />{state}</div></div>;
}
export function NewsWidget() {
  const [items, setItems] = useState<{ title: string; url: string; source?: string; publishedAt?: string; category?: string }[]>([]);
  const [category, setCategory] = useState("Geral");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => { setLoading(true); try { const r = await fetch(`/api/news?category=${encodeURIComponent(category)}`, { signal: controller.signal }); if (!r.ok) throw new Error("Manchetes indisponíveis"); const j = await r.json(); setItems(j.items ?? []); setError(j.items?.length ? "" : "Nenhuma manchete disponível."); } catch { if (!controller.signal.aborted) setError("Não foi possível atualizar as manchetes."); } finally { if (!controller.signal.aborted) setLoading(false); } };
    void load(); const timer = setInterval(load, 300000); return () => { controller.abort(); clearInterval(timer); };
  }, [category, revision]);
  return <section className="news-feed col-span-2"><div className="flex items-center justify-between"><div className="hud-label">Radar de notícias</div><Button size="icon" variant="ghost" aria-label="Atualizar manchetes" title="Atualizar manchetes" onClick={() => setRevision((r) => r + 1)}><RefreshCw className={loading ? "animate-spin" : ""} /></Button></div><div className="mb-3 flex flex-wrap gap-1">{["Geral", "Política", "Futebol", "Basquete"].map((c) => <Button key={c} variant="ghost" size="sm" className={`h-7 px-2 text-xs ${category === c ? "bg-secondary text-primary" : "text-muted-foreground"}`} onClick={() => setCategory(c)} aria-pressed={category === c}>{c}</Button>)}</div>{error ? <p role="status" className="text-sm text-muted-foreground">{error}</p> : loading && !items.length ? <p className="text-sm text-muted-foreground">Consultando fontes…</p> : items.slice(0, 4).map((n, i) => <a className="news-item group" key={n.url} href={n.url} target="_blank" rel="noreferrer"><span className="news-number">0{i + 1}</span><div className="min-w-0"><div className="line-clamp-2 text-sm leading-snug group-hover:text-primary">{n.title}</div><div className="mt-1 text-xs text-muted-foreground">{n.source ?? "Google Notícias"}{n.publishedAt && ` · ${new Date(n.publishedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}</div></div><ArrowUpRight className="size-3 shrink-0 text-muted-foreground" /></a>)}</section>;
}
