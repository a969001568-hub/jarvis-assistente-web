import { describe, expect, it } from "vitest";
import { commandMode } from "@/lib/jarvis-context";
import { decodePCM } from "@/lib/stream-speech";

describe("JARVIS voice commands", () => {
  it("opens development only for a final command", () => {
    expect(commandMode("Jarvis melhore seu código, desenvolva.")).toBe("develop");
    expect(commandMode("Jarvis desenvolva uma ideia sobre esportes")).toBe("focus");
  });
  it.each(["Jarvis como foi meu dia hoje", "Jarvis como estamos pra hoje", "Jarvis relatório do dia", "Jarvis resumo de hoje"])("recognizes briefing: %s", (text) => {
    expect(commandMode(text)).toBe("briefing");
  });
  it("preserves PCM samples across byte boundaries", () => {
    const first = decodePCM(new Uint8Array(), new Uint8Array([0]));
    expect(first.samples.length).toBe(0);
    const second = decodePCM(first.pending, new Uint8Array([64, 0, 128]));
    expect(Array.from(second.samples)).toEqual([0.5, -1]);
    expect(second.pending.length).toBe(0);
  });
});