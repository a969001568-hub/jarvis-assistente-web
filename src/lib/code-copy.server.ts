import { strToU8, zipSync } from "fflate";
import { revisedSource, reviewSource } from "./code-review";
import bundled from "./source-copy.json";

// Explicit source-only selection: no environment files, repository metadata,
// dependencies, user conversations, account sessions or arbitrary filesystem reads.
function sourceFiles() {
  return { ...bundled };
}
export function inspectCode() { return reviewSource(sourceFiles()); }
export function createReviewedCopy(approvedId: string) {
  const files = revisedSource(sourceFiles(), approvedId);
  files["REVISAO.md"] = "# JARVIS — cópia revisada\n\nVelocidade de voz reduzida de 1 para 0.96.\nEsta cópia não foi executada, testada ou publicada automaticamente.\nAs credenciais, contas e conversas não estão incluídas.\nConfigure as variáveis de ambiente e os serviços na instalação de destino.\n";
  files["src/lib/source-copy.json"] = JSON.stringify(files);
  return zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])));
}