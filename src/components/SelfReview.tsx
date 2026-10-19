import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

export type Improvement = { area: string; titulo: string; problema: string; sugestao: string; ts: number };
const KEY = "jarvis_aprimoramentos";
const IDLE_MS = 90_000;
const INTERVAL_MS = 8 * 60_000;

/** Runs a code self-review only while JARVIS is idle (not answering nor hearing speech). */
export function SelfReview({ idle }: { idle: boolean }) {
  const [items, setItems] = useState<Improvement[]>([]);
  const [running, setRunning] = useState(false);
  const itemsRef = useRef<Improvement[]>([]);
  const idleSince = useRef(Date.now());
  const lastRun = useRef(0);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) { itemsRef.current = parsed; setItems(parsed); } } } catch {}
  }, []);

  useEffect(() => {
    idleSince.current = Date.now();
    if (!idle) { ctrl.current?.abort(); return; }
    const timer = setInterval(async () => {
      const now = Date.now();
      if (ctrl.current || document.visibilityState !== "visible" || now - idleSince.current < IDLE_MS || now - lastRun.current < INTERVAL_MS) return;
      lastRun.current = now; const c = new AbortController(); ctrl.current = c; setRunning(true);
      try {
        const previous = itemsRef.current.slice(0, 30).map((i) => i.titulo.slice(0, 120));
        const res = await fetch("/api/self-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ previous }), signal: c.signal });
        if (res.ok) {
          const item = (await res.json()) as Omit<Improvement, "ts">;
          const next = [{ ...item, ts: Date.now() }, ...itemsRef.current].slice(0, 30);
          itemsRef.current = next; setItems(next);
          try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
        }
      } catch {} finally { ctrl.current = null; setRunning(false); }
    }, 10_000);
    return () => { clearInterval(timer); ctrl.current?.abort(); };
  }, [idle]);

  return <section className="mt-5 border-t border-border pt-3" aria-label="Autoanálise">
    <div className="flex items-center justify-between">
      <span className="hud-label flex items-center gap-2"><Sparkles className="size-3.5 text-primary" aria-hidden="true" />Autoanálise</span>
      <span className="text-xs text-muted-foreground">{running ? "ANALISANDO…" : idle ? "OCIOSO" : "PAUSADA"}</span>
    </div>
    {!items.length ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Quando estiver em silêncio, o JARVIS revisa o próprio código e interface e registra melhorias aqui.</p>
      : <ul className="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">{items.slice(0, 8).map((i) => <li key={i.ts} className="rounded-md border border-border/60 p-2">
        <div className="flex justify-between gap-2 text-[10px] uppercase tracking-wider text-primary"><span>{i.area}</span><span className="text-muted-foreground">{new Date(i.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>
        <p className="mt-1 text-sm font-medium">{i.titulo}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{i.sugestao}</p>
      </li>)}</ul>}
  </section>;
}
