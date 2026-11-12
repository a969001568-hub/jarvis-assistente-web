import { useEffect, useRef, useState } from "react";
import { Code2, Download, LoaderCircle, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CodeReview as Review } from "@/lib/code-review";

export function CodeReview() {
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const request = async (download = false) => {
    if (busy || (download && !review)) return;
    const ctrl = new AbortController(); controller.current = ctrl;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/code-review", { method: download ? "POST" : "GET", signal: ctrl.signal, ...(download ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approvedId: review?.id }) } : {}) });
      if (!res.ok) throw new Error("Não foi possível preparar a revisão. Tente novamente.");
      if (download) {
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement("a"); a.href = url; a.download = "jarvis-copia-revisada.zip"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000); setDownloaded(true);
      } else { setReview(await res.json()); setDownloaded(false); }
    } catch (e) { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Revisão indisponível."); }
    finally { if (!ctrl.signal.aborted) setBusy(false); }
  };
  return <section className="code-review" aria-labelledby="review-title">
    <div className="flex items-center justify-between gap-2"><h2 id="review-title" className="hud-label flex items-center gap-2"><Code2 className="size-4" />Evolução do JARVIS</h2><Button variant="ghost" size="icon" title="Revisar código" aria-label="Revisar código" disabled={busy} onClick={() => request()}>{busy ? <LoaderCircle className="animate-spin" /> : <Search />}</Button></div>
    {!review && <><p className="my-3 text-sm text-muted-foreground">Nenhuma revisão pendente.</p><Button variant="outline" size="sm" disabled={busy} onClick={() => request()}><Search />{busy ? "Analisando…" : "Analisar código"}</Button></>}
    {review && <div className="mt-3"><p className="text-sm font-semibold">{review.title}</p><p className="mt-2 text-sm text-muted-foreground">{review.reason}</p><p className="mt-2 text-xs text-muted-foreground">{review.fileCount} arquivos examinados · revisão local, sem chamada de IA</p><pre className="review-diff"><span>− {review.before}</span><span>+ {review.after}</span></pre><p className="text-sm">Deseja aplicar esta alteração em uma cópia?</p><p className="my-2 text-xs text-muted-foreground">O app atual não será alterado. A cópia não inclui credenciais nem conversas e precisa de configuração e testes antes de publicar.</p><div className="flex flex-wrap gap-2"><Button variant="secondary" size="sm" disabled={busy} onClick={() => request(true)}><Download />{busy ? "Preparando…" : "Sim, baixar cópia"}</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => { setReview(null); setDownloaded(false); }}><X />Agora não</Button></div></div>}
    {downloaded && <p role="status" className="mt-3 text-sm text-primary">Cópia revisada enviada para download. O JARVIS atual permanece igual.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  </section>;
}