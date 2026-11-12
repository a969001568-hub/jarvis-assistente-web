import { strToU8, zipSync } from "fflate";
import { revisedSource, reviewSource } from "./code-review";

// Explicit source-only selection: no environment files, repository metadata,
// dependencies, user conversations, account sessions or arbitrary filesystem reads.
const bundled = import.meta.glob<string>([
  "../**/*.ts", "../**/*.tsx", "../**/*.css",
  "../../package.json", "../../bun.lock", "../../tsconfig.json",
  "../../vite.config.ts", "../../vitest.config.ts", "../../components.json",
  "../../bunfig.toml", "../../public/robots.txt",
], { query: "?raw", import: "default", eager: true });

function sourceFiles() {
  return Object.fromEntries(Object.entries(bundled).map(([path, text]) => [
    path.startsWith("../../") ? path.slice(6) : `src/${path.slice(3)}`, text,
  ]));
}
export function inspectCode() { return reviewSource(sourceFiles()); }
export function createReviewedCopy(approvedId: string) {
  const files = revisedSource(sourceFiles(), approvedId);
  files["REVISAO.md"] = "# JARVIS — cópia revisada\n\nVelocidade de voz reduzida de 1 para 0.96.\nEsta cópia não foi executada, testada ou publicada automaticamente.\nAs credenciais, contas e conversas não estão incluídas.\nConfigure as variáveis de ambiente e os serviços na instalação de destino.\n";
  return zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])));
}