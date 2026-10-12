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
- Voice in/out uses the browser Web Speech API (Chrome) — no server audio processing.
- Conversation memory is kept in localStorage (limited, exportable as JSON).
