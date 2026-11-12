import { describe, expect, it } from "vitest";
import { REVIEW_ID, revisedSource, reviewSource } from "@/lib/code-review";

describe("approved JARVIS source copy", () => {
  const files = { "src/lib/voice-profile.ts": "export const VOICE_PROFILE = { rate: 1, pitch: 1 };", "src/routes/index.tsx": "unchanged" };
  it("recommends a concrete change against the source", () => {
    expect(reviewSource(files).after).toBe("rate: 0.96,");
  });
  it("requires the reviewed alteration to be approved", () => {
    expect(() => revisedSource(files, "")).toThrow("Confirme");
  });
  it("changes the copy, never the original source", () => {
    const copy = revisedSource(files, REVIEW_ID);
    expect(copy["src/lib/voice-profile.ts"]).toContain("rate: 0.96,");
    expect(files["src/lib/voice-profile.ts"]).toContain("rate: 1,");
    expect(copy["src/routes/index.tsx"]).toBe("unchanged");
  });
});