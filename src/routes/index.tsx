import { createFileRoute } from "@tanstack/react-router";
import { ClockWidget, NewsWidget, StatusWidget, WeatherWidget } from "@/components/Widgets";
import { useCallback, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "J.A.R.V.I.S. — Assistente pessoal por voz" },
      { name: "description", content: "Converse por voz com o JARVIS em português: respostas faladas, legendas e pesquisa na web." },
      { property: "og:title", content: "J.A.R.V.I.S. — Assistente pessoal por voz" },
      { property: "og:description", content: "Converse por voz com o JARVIS em português, com legendas e pesquisa web." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Jarvis,
});

type Msg = { role: "user" | "assistant"; content: string; sources?: Source[]; ts: number };
type Source = { title: string; url: string; snippet: string };
type State = "idle" | "listening" | "thinking" | "speaking" | "error";

const MEM_KEY = "jarvis_memoria";
const MAX_MEM = 200;
const STATE_LABEL: Record<State, string> = {
  idle: "Em espera",
  listening: "Ouvindo",
  thinking: "Processando",
  speaking: "Falando",
  error: "Falha",
};

function cleanForSpeech(t: string) {
  return t.replace(/https?:\/\/\S+/g, "").replace(/[*_`#>|]/g, "").replace(/\s+/g, " ").trim();
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const pt = voices.filter((v) => v.lang.toLowerCase().startsWith("pt"));
  const male = /antonio|daniel|ricardo|felipe|male|masculin/i;
  return (
    pt.find((v) => v.lang === "pt-BR" && male.test(v.name)) ||
    pt.find((v) => v.lang === "pt-BR" && /google/i.test(v.name)) ||
    pt.find((v) => v.lang === "pt-BR") ||
    pt[0] ||
    null
  );
}

function Jarvis() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [state, setState] = useState<State>("idle");
  const [interim, setInterim] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [handsFree, setHandsFree] = useState(false);
  const [supported, setSupported] = useState(true);
  const [weather, setWeather] = useState<string>("");

  const recRef = useRef<any>(null);
  const handsFreeRef = useRef(false);
  const busyRef = useRef(false);
  const messagesRef = useRef<Msg[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const speechAbortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  messagesRef.current = messages;
  handsFreeRef.current = handsFree;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MEM_KEY);
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
    window.speechSynthesis?.getVoices();
    fetch("https://api.open-meteo.com/v1/forecast?latitude=-23.44&longitude=-46.92&current=temperature_2m,weather_code&timezone=America/Sao_Paulo")
      .then((r) => r.json())
      .then((j) => setWeather(`${Math.round(j.current.temperature_2m)}°C`))
      .catch(() => setWeather("indisponível"));
  }, []);

  useEffect(() => {
    localStorage.setItem(MEM_KEY, JSON.stringify(messages.slice(-MAX_MEM)));
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || busyRef.current) return;
    try { recRef.current?.abort(); } catch {}
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    let final = "";
    rec.onstart = () => { setState("listening"); setError(""); };
    rec.onresult = (e: any) => {
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else inter += r[0].transcript;
      }
      setInterim(final + inter);
    };
    rec.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      const map: Record<string, string> = {
        "not-allowed": "Acesso ao microfone negado. Permita o microfone no ícone de cadeado do Chrome.",
        "audio-capture": "Nenhum microfone encontrado.",
        network: "Falha de rede no reconhecimento de voz.",
      };
      setError(map[e.error] || `Erro de áudio: ${e.error}`);
      setHandsFree(false);
      setState("error");
    };
    rec.onend = () => {
      setInterim("");
      const said = final.trim();
      const wake = /\b(jarvis|jarvi|jarbas|jarves|djarvis|jarvas)\b/i;
      if (said && wake.test(said)) send(said);
      else if (said) {
        // Sem o nome "Jarvis": ignora e continua ouvindo em silêncio.
        if (handsFreeRef.current && !busyRef.current) setTimeout(startListening, 250);
        else setState("idle");
      }
      else if (handsFreeRef.current && !busyRef.current) setTimeout(startListening, 250);
      else setState((s) => (s === "listening" ? "idle" : s));
    };
    recRef.current = rec;
    rec.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakChrome = useCallback((clean: string) => new Promise<void>((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = "pt-BR";
    u.rate = 1.05;
    u.pitch = 0.85;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  }), []);

  const speak = useCallback(async (t: string) => {
    const clean = cleanForSpeech(t);
    if (!clean) return;
    setState("speaking");
    const ctrl = new AbortController();
    speechAbortRef.current = ctrl;
    try {
      const { streamSpeech } = await import("@/lib/stream-speech");
      await streamSpeech("/api/speech", clean.slice(0, 2400), ctrl.signal);
    } catch (e: any) {
      if (ctrl.signal.aborted) return;
      console.warn("Voz de IA falhou, usando voz do Chrome", e);
      setError("A voz de IA falhou nesta resposta; usando a voz do Chrome.");
      await speakChrome(clean);
    } finally {
      speechAbortRef.current = null;
    }
  }, [speakChrome]);

  const send = useCallback(async (content: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError("");
    setCaption("");
    const history = [...messagesRef.current, { role: "user" as const, content, ts: Date.now() }];
    setMessages(history);
    setState("thinking");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let answer = "";
    let sources: Source[] = [];
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        const msg =
          res.status === 401 ? "Chave de IA inválida ou ausente."
          : res.status === 402 ? "Créditos de IA esgotados. " + (j.error ?? "")
          : res.status === 429 ? "Limite de requisições atingido. Aguarde alguns segundos."
          : j.error || "Serviço externo indisponível.";
        throw new Error(msg);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "sources") sources = ev.items;
          else if (ev.type === "delta") { answer += ev.text; setCaption(answer); }
          else if (ev.type === "error") throw new Error(ev.message);
        }
      }
      if (!answer.trim()) answer = "Receio não ter conseguido formular uma resposta, senhor.";
      setMessages((m) => [...m, { role: "assistant", content: answer, sources, ts: Date.now() }]);
      if (voiceOn) await speak(answer);
      setState("idle");
    } catch (e: any) {
      if (e?.name === "AbortError") { setState("idle"); }
      else {
        const msg = e instanceof TypeError ? "Sem conexão com o servidor. Verifique a internet." : e.message;
        setError(msg);
        setState("error");
        if (answer) setMessages((m) => [...m, { role: "assistant", content: answer, sources, ts: Date.now() }]);
      }
    } finally {
      busyRef.current = false;
      abortRef.current = null;
      if (handsFreeRef.current) setTimeout(startListening, 300);
    }
  }, [voiceOn, speak, startListening]);

  const toggleHandsFree = () => {
    const next = !handsFree;
    setHandsFree(next);
    handsFreeRef.current = next;
    if (next) startListening();
    else { try { recRef.current?.abort(); } catch {} setState("idle"); }
  };

  const stopAll = () => {
    abortRef.current?.abort();
    window.speechSynthesis?.cancel();
    speechAbortRef.current?.abort();
    try { recRef.current?.abort(); } catch {}
    setHandsFree(false);
    setState("idle");
  };

  const exportMem = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `jarvis_memoria_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const lastSources = [...messages].reverse().find((m) => m.role === "assistant")?.sources ?? [];
  const live = caption && state !== "idle" ? caption : interim;

  return (
    <div className="grid min-h-screen grid-cols-1 gap-4 p-4 lg:grid-cols-[300px_1fr_300px]">
      {/* Sidebar esquerda */}
      <aside className="hud-panel flex flex-col gap-4 p-4">
        <div>
          <div className="hud-label">Sistema</div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-widest text-primary text-glow">J.A.R.V.I.S.</h1>
          <p className="text-sm text-muted-foreground">Just A Rather Very Intelligent System</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ClockWidget />
          <WeatherWidget />
          <StatusWidget state={STATE_LABEL[state]} mem={messages.length} max={MAX_MEM} />
          <NewsWidget />
        </div>
        <div className="space-y-2">
          <Toggle label="Voz do JARVIS" on={voiceOn} onClick={() => { setVoiceOn(!voiceOn); window.speechSynthesis?.cancel(); speechAbortRef.current?.abort(); }} />
          <Toggle label="Mãos livres (escuta contínua)" on={handsFree} onClick={toggleHandsFree} disabled={!supported} />
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <HudButton onClick={exportMem} disabled={!messages.length}>Exportar</HudButton>
          <HudButton onClick={() => { setMessages([]); localStorage.removeItem(MEM_KEY); }} disabled={!messages.length}>Limpar</HudButton>
        </div>
        <p className="text-xs leading-snug text-muted-foreground">
          Voz e reconhecimento usam serviços online do navegador. Evite falar dados sensíveis.
        </p>
      </aside>

      {/* Centro */}
      <main className="flex flex-col items-center gap-4">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
          <button
            onClick={() => (state === "listening" || state === "speaking" || state === "thinking" ? stopAll() : startListening())}
            className="reactor"
            data-state={state}
            aria-label={state === "idle" ? "Falar com o JARVIS" : "Parar"}
          >
            <span className="ring r1" /><span className="ring r2" /><span className="ring r3" />
            <span className="core" />
          </button>
          <div className="hud-label text-glow">{STATE_LABEL[state]}</div>
          <div className="min-h-[5rem] max-w-2xl text-center text-xl leading-relaxed">
            {live ? (
              <span className={state === "thinking" || state === "listening" ? "caret" : ""}>{live}</span>
            ) : (
              <span className="text-muted-foreground">
                {supported ? "Ative o modo mãos livres e diga \"Jarvis\" seguido do seu pedido." : "Reconhecimento de voz indisponível neste navegador. Use o Google Chrome."}
              </span>
            )}
          </div>
          {error && <div className="hud-panel border-destructive px-4 py-2 text-destructive">{error}</div>}
        </div>

      </main>

      {/* Painel direito */}
      <aside className="hud-panel flex max-h-[calc(100vh-2rem)] flex-col gap-3 p-4">
        <div className="hud-label">Registro</div>
        <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div className="hud-label text-[0.6rem] opacity-70">{m.role === "user" ? "Você" : "JARVIS"}</div>
              <div className={`mt-1 inline-block rounded-md px-3 py-2 text-left text-base ${m.role === "user" ? "bg-secondary" : "border border-border bg-muted"}`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
        {lastSources.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <div className="hud-label">Fontes</div>
            {lastSources.slice(0, 4).map((s) => {
              const host = new URL(s.url).hostname.replace(/^www\./, "");
              return (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 rounded-md border border-border p-2 transition hover:border-primary">
                  <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`} alt="" className="mt-0.5 h-4 w-4" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{host}</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({ k, v, hi }: { k: string; v: string; hi?: boolean }) {
  return (
    <div className="flex justify-between border-b border-border pb-1">
      <span className="text-muted-foreground">{k}</span>
      <span className={hi ? "font-semibold text-primary" : ""}>{v}</span>
    </div>
  );
}

function Toggle({ label, on, onClick, disabled }: { label: string; on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition hover:border-primary disabled:opacity-40">
      <span>{label}</span>
      <span className={`h-3 w-3 rounded-full ${on ? "bg-primary shadow-[0_0_10px_var(--glow)]" : "bg-muted-foreground/40"}`} />
    </button>
  );
}

function HudButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-md border border-primary/50 px-4 py-2 font-display text-xs uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
    />
  );
}
