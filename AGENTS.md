<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- AI chat lives in the server route src/routes/api/chat.ts (Lovable AI Gateway, NDJSON stream); keys stay server-side.
- Web search uses keyless RSS (Bing + Google News) on every user message; no search API key needed.
- Voice input uses the browser Web Speech API; /api/speech prefers an ElevenLabs stock voice when linked (re-framed as the same PCM SSE events), then AI Gateway TTS, then silent fallback to browser speechSynthesis.
- Conversation memory is kept in localStorage (limited, exportable as JSON).
- Voice command modes and forecast parsing share browser-safe helpers, so briefing and widgets use consistent locations and conditions.
- Voice callbacks dispatch through refs and restart timers are canceled on Stop, so continuous listening cannot revive stale requests.
- Source review uses an explicit bundled read-only snapshot of credential-free application files; the assistant cannot write, execute, or deploy its own code.
- Google login uses managed Cloud Auth with one root session subscriber; personal connections use authenticated server functions and encrypted per-user connector keys, never shared credentials.
- Google sign-in options are browser-safe and account-neutral; cinematic voice modes share panel rules so daily reports and development can occupy the full stage.
- Auth initialization handles synchronous configuration failures and asynchronous session errors so unavailable login never blanks public screens.
- Headlines read independent publisher feeds; public page reads accept any public HTTPS host but reject IP literals, internal names, ports and credentials, re-validate each redirect hop and bound bodies.
- Weather questions inject live Open-Meteo readings (default places plus a geocoded mentioned city) so the assistant never claims to lack real-time data.
- Proactive hands-free prompts use browser speech only, never billed AI calls; durable AI failure state prevents provider-denial retries and automated credit exhaustion.

- Source improvement uses an explicit bundled source-only copy and deterministic compatible edits, downloaded only after review approval; live code is never written or deployed by the app.
- Voice tuning lives in one browser-safe profile shared by browser playback and server speech to keep reviewed changes consistent.
