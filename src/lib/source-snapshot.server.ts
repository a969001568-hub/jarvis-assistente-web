import interfaceCode from "../routes/index.tsx?raw";
import chatCode from "../routes/api/chat.ts?raw";
import widgetsCode from "../components/Widgets.tsx?raw";
import speechCode from "../routes/api/speech.ts?raw";

// Only explicitly selected, credential-free application sources. No env files,
// workspace files, account tokens or arbitrary file paths can be requested.
export function getSourceSnapshot() {
  return [["interface", interfaceCode], ["chat", chatCode], ["widgets", widgetsCode], ["speech", speechCode]]
    .map(([name, code]) => `FILE ${name}\n${code}`).join("\n\n");
}