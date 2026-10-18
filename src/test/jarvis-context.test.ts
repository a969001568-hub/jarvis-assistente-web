import { describe, expect, it } from "vitest";
import { BRIEFING_TOPICS, commandMode, presentationPanels } from "@/lib/jarvis-context";
import { googleSignInOptions } from "@/lib/google-auth";
import { decodePCM } from "@/lib/stream-speech";

describe("JARVIS voice commands", () => {
  it("opens an unframed daily presentation without either sidebar", () => {
    expect(presentationPanels(commandMode("Jarvis relatório do dia"))).toEqual({system:false,log:false});
  });
  it("includes the requested daily report subjects", () => {
    expect(BRIEFING_TOPICS).toEqual(["Política", "Basquete", "Clima"]);
  });
  it("lets any Google account be selected without a preset email", () => {
    expect(googleSignInOptions("https://jarvis-assistente-web.lovable.app")).toEqual({redirect_uri:"https://jarvis-assistente-web.lovable.app",extraParams:{prompt:"select_account"}});
  });
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