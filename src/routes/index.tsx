import { createFileRoute } from "@tanstack/react-router";
import { ClockWidget, NewsWidget, StatusWidget, WeatherWidget } from "@/components/Widgets";
import { Button } from "@/components/ui/button";
import { commandMode, type ViewMode } from "@/lib/jarvis-context";
import { Download, Trash2, Mic, MicOff, Volume2, VolumeX, PanelLeft, PanelRight, X, Globe, ShieldCheck, Code2, FileText, Mail, HardDrive } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PersonalConnections } from "@/components/PersonalConnections";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "J.A.R.V.I.S. — Central de inteligência por voz" },
    { name: "description", content: "Assistente pessoal por voz em português, com relatório diário, clima local, notícias e memória privada no navegador." },
    { property: "og:title", content: "J.A.R.V.I.S. — Central de inteligência por voz" },
    { property: "og:description", content: "Sua central por voz: notícias, clima e um relatório diário com fontes atuais." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Jarvis,
});
type Source = { title: string; url: string; snippet: string };
type Msg = { role: "user" | "assistant"; content: string; sources?: Source[]; ts: number };
type State = "idle" | "listening" | "thinking" | "speaking" | "error";
const MEM_KEY = "jarvis_memoria";
const MAX_MEM = 2000;
const STATE_LABEL: Record<State, string> = { idle: "Em espera", listening: "Ouvindo", thinking: "Processando", speaking: "Falando", error: "Atenção" };
const WAKE = /\b(jarvis|jarvi|jarbas|jarves|djarvis|jarvas)\b/i;
const cleanForSpeech = (t: string) => t.replace(/https?:\/\/\S+/g, "").replace(/[*_`#>|]/g, "").replace(/\s+/g, " ").trim();
function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return voices.find((v) => v.lang === "pt-BR" && /antonio|daniel|ricardo|felipe|male|masculin/i.test(v.name)) ?? voices.find((v) => v.lang === "pt-BR") ?? null;
}
function Jarvis() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [interim, setInterim] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [handsFree, setHandsFree] = useState(false);
  const [supported, setSupported] = useState(true);
  const [mode, setMode] = useState<ViewMode>("focus");
  const [systemOpen, setSystemOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const recRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const handsFreeRef = useRef(false);
  const voiceRef = useRef(true);
  const busyRef = useRef(false);
  const messagesRef = useRef<Msg[]>([]);
  const sendRef = useRef<(text: string) => void>(() => {});
  const startRef = useRef<() => void>(() => {});
  const restartRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const speechAbortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const chromeResolveRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    mountedRef.current = true;
    try {
      const raw = localStorage.getItem(MEM_KEY);
      if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) { const safe = parsed.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-MAX_MEM).map((m) => ({ ...m, content: m.content.slice(0, 12000), sources: Array.isArray(m.sources) ? m.sources.filter((s: Source) => s && typeof s.title === "string" && /^https?:\/\//.test(s.url)).slice(0, 12) : [], ts: typeof m.ts === "number" ? m.ts : 0 })); messagesRef.current = safe; setMessages(safe); } }
    } catch { setError("Não foi possível recuperar a memória local."); }
    setLoaded(true);
    setSupported(Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    window.speechSynthesis?.getVoices();
    return () => { mountedRef.current = false; handsFreeRef.current = false; clearTimeout(restartRef.current); recRef.current?.abort(); abortRef.current?.abort(); speechAbortRef.current?.abort(); window.speechSynthesis?.cancel(); chromeResolveRef.current?.(); };
  }, []);
  useEffect(() => {
    messagesRef.current = messages;
    if (!loaded) return;
    try { localStorage.setItem(MEM_KEY, JSON.stringify(messages.slice(-MAX_MEM))); } catch { setError("Memória do navegador cheia. Exporte suas conversas antes de limpar."); }
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loaded]);
  const scheduleListen = useCallback(() => {
    clearTimeout(restartRef.current);
    if (handsFreeRef.current && mountedRef.current) restartRef.current = setTimeout(() => { if (handsFreeRef.current && !busyRef.current) startRef.current(); }, 300);
  }, []);
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || busyRef.current || listeningRef.current) return;
    const rec = new SR(); rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = false;
    let final = "";
    rec.onstart = () => { listeningRef.current = true; setState("listening"); setError(""); };
    rec.onresult = (e: any) => { let inter = ""; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) final += r[0].transcript + " "; else inter += r[0].transcript; } const text = final + inter; setInterim(WAKE.test(text) ? text : ""); };
    rec.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      const map: Record<string, string> = { "not-allowed": "Permita o microfone nas configurações do Chrome.", "audio-capture": "Nenhum microfone encontrado.", network: "Falha de rede no reconhecimento de voz." };
      setError(map[e.error] ?? "O reconhecimento de voz falhou."); handsFreeRef.current = false; setHandsFree(false); setState("error");
    };
    rec.onend = () => {
      listeningRef.current = false; if (recRef.current !== rec) return;
      recRef.current = null; setInterim(""); const said = final.trim();
      if (said && WAKE.test(said)) sendRef.current(said);
      else { setState((s) => s === "listening" ? "idle" : s); scheduleListen(); }
    };
    recRef.current = rec;
    try { rec.start(); } catch { recRef.current = null; listeningRef.current = false; setError("Não foi possível iniciar o microfone."); setState("error"); }
  }, [scheduleListen]);
  startRef.current = startListening;
  const speakChrome = useCallback((text: string, onStart: () => void, signal: AbortSignal) => new Promise<void>((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth || signal.aborted) return resolve();
    synth.cancel(); const u = new SpeechSynthesisUtterance(text); const v = pickVoice(); if (v) u.voice = v;
    u.lang = "pt-BR"; u.rate = 1.05; u.pitch = 0.85;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", stop); chromeResolveRef.current = undefined; resolve(); };
    const stop = () => { synth.cancel(); finish(); };
    chromeResolveRef.current = finish; signal.addEventListener("abort", stop, { once: true });
    u.onstart = () => { timer = setTimeout(onStart, 180); }; u.onend = finish; u.onerror = finish; synth.speak(u);
  }), []);
  const speak = useCallback(async (text: string, signal: AbortSignal, onStart: () => void) => {
    const clean = cleanForSpeech(text); if (!clean) return;
    let started = false;
    const startedSpeech = () => { if (!signal.aborted) { started = true; setState("speaking"); onStart(); } };
    try { const { streamSpeech } = await import("@/lib/stream-speech"); await streamSpeech("/api/speech", clean.slice(0, 2400), signal, startedSpeech); }
    catch (e) {
      if (signal.aborted) return;
      // Never replay audio that the user has already heard.
      if (started) { setError("A reprodução de voz foi interrompida."); return; }
      setError("Voz de IA indisponível; usando a voz do navegador.");
      await speakChrome(clean, startedSpeech, signal);
    }
  }, [speakChrome]);
  const send = useCallback(async (content: string) => {
    if (busyRef.current || !WAKE.test(content)) return;
    busyRef.current = true; setError(""); setCaption("");
    const nextMode = commandMode(content); setMode(nextMode);
    if (nextMode === "develop") { setSystemOpen(false); setLogOpen(false); }
    else if (nextMode === "briefing") { setSystemOpen(true); setLogOpen(true); }
    const history = [...messagesRef.current, { role: "user" as const, content, ts: Date.now() }].slice(-MAX_MEM);
    messagesRef.current = history; setMessages(history); setState("thinking");
    const ctrl = new AbortController(); abortRef.current = ctrl;
    const speechCtrl = new AbortController(); speechAbortRef.current = speechCtrl;
    ctrl.signal.addEventListener("abort", () => speechCtrl.abort(), { once: true });
    let answer = ""; let sources: Source[] = []; let shown = ""; let pendingSpeech = ""; let chunkCount = 0;
    let voiceTask = Promise.resolve(); let voiceFailure: unknown;
    const queueSpeech = (chunk: string) => {
      if (!chunk.trim()) return;
      chunkCount++;
      voiceTask = voiceTask.then(async () => { if (ctrl.signal.aborted || !voiceRef.current) return; await speak(chunk, speechCtrl.signal, () => { shown += chunk; setCaption(shown.trim()); }); }).catch((e) => { voiceFailure = e; });
    };
    try {
      const recent = history.slice(-60);
      const words = content.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      const older = history.slice(0, -60).filter((m) => m.role === "user" && words.some((w) => m.content.toLowerCase().includes(w))).slice(-24);
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: recent.map(({ role, content }) => ({ role, content: content.slice(0, 4000) })), memory: older.map((m) => m.content).join("\n").slice(0, 14000) }), signal: ctrl.signal });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "O serviço de IA está indisponível."); }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "sources") sources = ev.items;
          else if (ev.type === "error") throw new Error(ev.message);
          else if (ev.type === "delta") {
            answer += ev.text; pendingSpeech += ev.text;
            if (!voiceRef.current) setCaption(answer);
            else if (chunkCount === 0 && pendingSpeech.length >= 80) {
              const boundary = pendingSpeech.match(/^([\s\S]*?[.!?])(?:\s|$)/);
              const sentence = boundary?.[1];
              if (sentence) { queueSpeech(sentence + " "); pendingSpeech = pendingSpeech.slice(sentence.length).trimStart(); }
            }
          }
        }
      }
      if (!answer.trim()) throw new Error("O serviço de IA não retornou uma resposta.");
      if (voiceRef.current) queueSpeech(pendingSpeech);
      await voiceTask;
      if (voiceFailure) throw voiceFailure;
      ctrl.signal.throwIfAborted(); setCaption(answer);
      setMessages((m) => [...m, { role: "assistant" as const, content: answer, sources, ts: Date.now() }].slice(-MAX_MEM)); setState("idle");
    } catch (e) {
      ctrl.abort(); await voiceTask;
      if (e instanceof Error && e.name === "AbortError") setState("idle");
      else { setError(e instanceof Error ? e.message : "A conexão com o servidor falhou."); setState("error"); }
    } finally { busyRef.current = false; abortRef.current = null; speechAbortRef.current = null; scheduleListen(); }
  }, [speak, scheduleListen]);
  sendRef.current = send;
  const stopAll = () => {
    handsFreeRef.current = false; setHandsFree(false); clearTimeout(restartRef.current);
    const rec = recRef.current; recRef.current = null; listeningRef.current = false; rec?.abort();
    abortRef.current?.abort(); speechAbortRef.current?.abort(); window.speechSynthesis?.cancel(); chromeResolveRef.current?.(); setInterim(""); setState("idle");
  };
  const toggleHandsFree = () => { const next = !handsFreeRef.current; handsFreeRef.current = next; setHandsFree(next); if (next) startListening(); else { clearTimeout(restartRef.current); const rec = recRef.current; recRef.current = null; listeningRef.current = false; rec?.abort(); if (!busyRef.current) setState("idle"); } };
  const exportMem = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(messages, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = `jarvis_memoria_${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); };
  const lastSources = [...messages].reverse().find((m) => m.role === "assistant")?.sources ?? [];
  return <div className="jarvis-shell" data-mode={mode}>
    <header className="app-header"><div className="flex items-center gap-3"><span className="brand-mark" aria-hidden="true">J</span><div><h1 className="font-display text-xl">J.A.R.V.I.S.</h1><div className="text-xs text-muted-foreground">PERSONAL INTELLIGENCE</div></div></div><div className="header-status"><span className={`status-dot ${state === "error" ? "status-error" : ""}`} />{STATE_LABEL[state]}</div><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Alternar painel Sistema" title="Sistema" onClick={() => setSystemOpen(!systemOpen)} aria-pressed={systemOpen}><PanelLeft /></Button><Button variant="ghost" size="icon" aria-label="Alternar painel Registro" title="Registro" onClick={() => setLogOpen(!logOpen)} aria-pressed={logOpen}><PanelRight /></Button><Button variant="ghost" size="icon" aria-label="Conexões pessoais" title="Conexões pessoais" onClick={() => setConnectionsOpen(true)}><ShieldCheck /></Button></div></header>
    <div className={`workspace ${systemOpen ? "with-system" : ""} ${logOpen ? "with-log" : ""}`}>
      {systemOpen && <aside className="system-panel panel-reveal" aria-label="Sistema"><div className="panel-heading"><span className="hud-label">Sistema</span><span className="text-xs text-muted-foreground">01 / LIVE</span></div><div className="grid grid-cols-2 gap-3"><ClockWidget /><StatusWidget state={STATE_LABEL[state]} mem={messages.length} max={MAX_MEM} /><WeatherWidget /><NewsWidget /></div><div className="mt-5 flex justify-between border-t border-border pt-3"><Button variant="ghost" size="sm" onClick={exportMem} disabled={!messages.length}><Download />Exportar</Button><Button variant="ghost" size="icon" aria-label="Limpar memória" title="Limpar memória" disabled={!messages.length || busyRef.current} onClick={() => { if (window.confirm("Apagar todas as conversas deste navegador?")) { messagesRef.current = []; setMessages([]); setCaption(""); } }}><Trash2 /></Button></div></aside>}
      <main className="core-stage"><div className="stage-top"><span className="hud-label">{mode === "develop" ? "Ambiente de desenvolvimento" : mode === "briefing" ? "Relatório do dia" : "Interface neural"}</span><span className="text-xs text-muted-foreground">J / 01</span></div><div className="core-experience"><div className="core-orbit"><span className="orbit-cross cross-top" /><span className="orbit-cross cross-bottom" /><span className="orbit-caption">VOICE LINK</span><Button variant="ghost" className="reactor" disabled={!supported} onClick={() => state === "listening" || state === "speaking" || state === "thinking" ? stopAll() : startListening()} data-state={state} aria-label={state === "listening" || state === "speaking" || state === "thinking" ? "Parar" : "Falar com o JARVIS"}><span className="ring r1" /><span className="ring r2" /><span className="ring r3" /><span className="ring r4" /><span className="core"><span className="core-symbol">J</span></span></Button><span className="orbit-caption caption-bottom">{handsFree ? "ESCUTA ATIVA" : "STANDBY"}</span></div><div className="spectrum" data-active={state === "speaking" || state === "listening"} aria-hidden="true">{Array.from({ length: 31 }, (_, i) => <span key={i} />)}</div><div className="hud-label state-label">{STATE_LABEL[state]}</div><div className="captions" aria-live="polite">{interim || caption ? <p>{interim || caption}</p> : <div><p className="text-2xl text-foreground">À sua disposição.</p><p className="mt-2 text-sm text-muted-foreground">{supported ? "Jarvis, como estamos pra hoje?" : "Reconhecimento de voz indisponível neste navegador."}</p></div>}</div>{error && <p className="error-message" role="alert">{error}</p>}<div className="voice-controls"><Button variant={handsFree ? "secondary" : "outline"} onClick={toggleHandsFree} disabled={!supported} aria-pressed={handsFree}>{handsFree ? <Mic /> : <MicOff />}{handsFree ? "Mãos livres ativo" : "Ativar mãos livres"}</Button><Button variant="ghost" size="icon" aria-label={voiceOn ? "Desativar voz" : "Ativar voz"} title={voiceOn ? "Desativar voz" : "Ativar voz"} aria-pressed={voiceOn} onClick={() => { voiceRef.current = !voiceOn; setVoiceOn(!voiceOn); if (voiceOn) { speechAbortRef.current?.abort(); window.speechSynthesis?.cancel(); chromeResolveRef.current?.(); } }}>{voiceOn ? <Volume2 /> : <VolumeX />}</Button></div></div><div className="stage-footer"><span><Globe className="size-3" />Web sob consulta</span><span><ShieldCheck className="size-3" />Memória neste navegador</span></div></main>
      {logOpen && <aside className="log-panel panel-reveal" aria-label="Registro"><div className="panel-heading"><span className="hud-label">Registro</span><span className="text-xs text-muted-foreground">{messages.length} ENTRADAS</span></div><div ref={logRef} className="transcript"><div className="session-marker">CONVERSA LOCAL</div>{!messages.length && <p className="mt-5 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>}{messages.map((m, i) => <div key={`${m.ts}-${i}`} className={`log-message ${m.role}`}><div className="flex justify-between text-xs text-muted-foreground"><span>{m.role === "user" ? "VOCÊ" : "J.A.R.V.I.S."}</span><span>{m.ts ? new Date(m.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-base leading-relaxed">{m.content}</p></div>)}</div>{lastSources.length > 0 && <div className="sources"><div className="hud-label mb-3">Fontes consultadas</div>{lastSources.slice(0, 3).map((s) => <a key={s.url + s.title} href={s.url} target="_blank" rel="noreferrer" className="mb-2 block line-clamp-2 text-xs text-muted-foreground hover:text-primary">{s.title}</a>)}</div>}</aside>}
    </div>
    {connectionsOpen && <div className="dialog-backdrop" onClick={() => setConnectionsOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="connections-title" className="connections-dialog" onClick={(e) => e.stopPropagation()}><div className="flex justify-between"><h2 id="connections-title" className="font-display text-lg">Conexões pessoais</h2><Button variant="ghost" size="icon" aria-label="Fechar conexões" onClick={() => setConnectionsOpen(false)}><X /></Button></div><div className="mt-5 space-y-4">{[[Mail, "Gmail"], [HardDrive, "Google Drive"], [FileText, "Google Docs"]].map(([Icon, name]) => { const Symbol = Icon as typeof Mail; return <div key={String(name)} className="flex items-center justify-between border-b border-border pb-3"><span className="flex items-center gap-3"><Symbol className="size-4 text-primary" />{String(name)}</span><span className="text-xs text-warn">Não conectado</span></div>; })}</div><p className="mt-4 text-sm text-muted-foreground">Acesso privado indisponível até configurar seu login e a autorização Google. WhatsApp e Instagram exigem integrações oficiais; suas mensagens pessoais não estão acessíveis.</p><div className="mt-5 flex items-start gap-3 border-t border-border pt-4"><Code2 className="size-5 shrink-0 text-primary" /><p className="text-sm text-muted-foreground">O JARVIS pode analisar seu próprio código ao receber um pedido terminado em “desenvolva”. Alterações não são aplicadas automaticamente.</p></div></section></div>}
  </div>;
}
