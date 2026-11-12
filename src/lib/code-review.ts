export const REVIEW_ID = "voice-calm-v1";
export type CodeReview = { id: string; title: string; reason: string; file: string; before: string; after: string; fileCount: number };

export function reviewSource(files: Record<string, string>): CodeReview {
  const file = "src/lib/voice-profile.ts";
  const code = files[file];
  if (!code?.includes("rate: 1,")) throw new Error("Esta versão não é compatível com a revisão de voz.");
  return { id: REVIEW_ID, title: "Uma voz um pouco mais serena", reason: "O perfil atual usa velocidade normal. Recomendo reduzir o ritmo em 4%, mantendo a entonação natural e as pausas curtas.", file, before: "rate: 1,", after: "rate: 0.96,", fileCount: Object.keys(files).length };
}

export function revisedSource(files: Record<string, string>, approvedId: string): Record<string, string> {
  if (approvedId !== REVIEW_ID) throw new Error("Confirme a revisão antes de criar a cópia.");
  const review = reviewSource(files);
  return { ...files, [review.file]: files[review.file].replace(review.before, review.after) };
}