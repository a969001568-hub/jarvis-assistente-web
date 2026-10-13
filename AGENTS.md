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
- Voice input uses the browser Web Speech API; voice output streams AI TTS from src/routes/api/speech.ts, falling back to Chrome speechSynthesis on failure.
- Conversation memory is kept in localStorage (limited, exportable as JSON).
- Voice command modes and forecast parsing share browser-safe helpers, so briefing and widgets use consistent locations and conditions.
- Voice callbacks dispatch through refs and restart timers are canceled on Stop, so continuous listening cannot revive stale requests.
- Source review uses an explicit bundled read-only snapshot of credential-free application files; the assistant cannot write, execute, or deploy its own code.
- Personal provider access stays unavailable until a real authenticated app identity and authorized per-user OAuth client exist; never use shared credentials or simulated account data.
