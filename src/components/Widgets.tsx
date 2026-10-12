import { useEffect, useState } from "react";

const WMO: Record<number, string> = {
  0: "Céu limpo", 1: "Quase limpo", 2: "Parcialmente nublado", 3: "Nublado", 45: "Neblina", 48: "Neblina",
  51: "Garoa", 53: "Garoa", 55: "Garoa forte", 61: "Chuva fraca", 63: "Chuva", 65: "Chuva forte",
  80: "Pancadas", 81: "Pancadas", 82: "Temporal", 95: "Trovoadas", 96: "Trovoadas", 99: "Trovoadas",
};

export function ClockWidget() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="widget col-span-2">
      <div className="widget-label">Agora</div>
      <div className="font-display text-4xl font-bold text-primary text-glow">
        {now ? now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
      </div>
      <div className="text-sm capitalize text-muted-foreground">
        {now?.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
      </div>
    </div>
  );
}

export function WeatherWidget() {
  const [w, setW] = useState<{ t: number; d: string; max: number; min: number } | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=-23.44&longitude=-46.92&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=America/Sao_Paulo&forecast_days=1")
      .then((r) => r.json())
      .then((j) => setW({
        t: Math.round(j.current.temperature_2m),
        d: WMO[j.current.weather_code] ?? "—",
        max: Math.round(j.daily.temperature_2m_max[0]),
        min: Math.round(j.daily.temperature_2m_min[0]),
      }))
      .catch(() => setErr(true));
  }, []);
  return (
    <div className="widget widget-weather">
      <div className="widget-label">Sant. Parnaíba</div>
      <div className="font-display text-3xl font-bold">{w ? `${w.t}°` : err ? "—" : "…"}</div>
      <div className="text-xs">{w?.d}</div>
      {w && <div className="text-xs text-muted-foreground">M {w.max}° · m {w.min}°</div>}
    </div>
  );
}

export function StatusWidget({ state, mem, max }: { state: string; mem: number; max: number }) {
  return (
    <div className="widget">
      <div className="widget-label">Núcleo</div>
      <div className="font-display text-lg font-bold text-primary">{state}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${Math.min(100, (mem / max) * 100)}%` }} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">Memória {mem}/{max}</div>
    </div>
  );
}

export function NewsWidget() {
  const [items, setItems] = useState<{ title: string; url: string }[]>([]);
  useEffect(() => {
    fetch("/api/news").then((r) => r.json()).then((j) => setItems(j.items ?? [])).catch(() => {});
  }, []);
  return (
    <div className="widget col-span-2">
      <div className="widget-label">Manchetes</div>
      {items.length === 0 && <div className="text-sm text-muted-foreground">Carregando…</div>}
      <ul className="space-y-1.5">
        {items.slice(0, 4).map((n) => (
          <li key={n.url}>
            <a href={n.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-sm leading-snug hover:text-primary">{n.title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
