export type ViewMode = "focus" | "develop" | "briefing";
export const BRIEFING_TOPICS = ["Política", "Basquete", "Clima"] as const;
export const BRIEFING_INSTRUCTIONS = "Faça um boletim falado de hoje em 5 a 7 frases, cobrindo obrigatoriamente política, basquete e clima de São Paulo e Santana de Parnaíba; inclua futebol quando houver informação relevante. Cite os veículos consultados, diferencie jogos previstos de resultados e não presuma partidas hoje. Se faltar informação de um tema, diga explicitamente que ela não está disponível. Não presuma atividades pessoais sem dados explicitamente fornecidos.";
export function presentationPanels(mode: ViewMode) {
  return { system: mode === "focus", log: false };
}
export function commandMode(text: string): ViewMode {
  if (/desenvolva[.!?\s]*$/i.test(text)) return "develop";
  if (/como (?:foi|est[aá]) meu dia|como estamos (?:pra|para) hoje|relat[oó]rio (?:do dia|di[aá]rio)|resumo (?:do dia|de hoje)/i.test(text)) return "briefing";
  return "focus";
}
export const WMO: Record<number, string> = {
  0: "Céu limpo", 1: "Quase limpo", 2: "Parcialmente nublado", 3: "Nublado", 45: "Neblina", 48: "Neblina",
  51: "Garoa", 53: "Garoa", 55: "Garoa forte", 61: "Chuva fraca", 63: "Chuva", 65: "Chuva forte",
  80: "Pancadas", 81: "Pancadas", 82: "Temporal", 95: "Trovoadas", 96: "Trovoadas", 99: "Trovoadas",
};
export type Forecast = { name: string; temperature: number; description: string; max: number; min: number; observedAt: string };
export const SANTANA = { name: "Santana de Parnaíba", latitude: -23.44, longitude: -46.92 };
export const WEATHER_PLACES = [
  SANTANA,
  { name: "São Paulo", latitude: -23.55, longitude: -46.63 },
];
export async function getForecast(place: typeof WEATHER_PLACES[number], signal?: AbortSignal): Promise<Forecast> {
  const query = new URLSearchParams({ latitude: String(place.latitude), longitude: String(place.longitude), current: "temperature_2m,weather_code", daily: "temperature_2m_max,temperature_2m_min", timezone: "America/Sao_Paulo", forecast_days: "1" });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: signal ?? null });
  if (!res.ok) throw new Error("Clima indisponível");
  const j = await res.json();
  if (typeof j.current?.temperature_2m !== "number" || !j.daily?.temperature_2m_max?.length) throw new Error("Clima indisponível");
  return { name: place.name, temperature: Math.round(j.current.temperature_2m), description: WMO[j.current.weather_code] ?? "Condição não informada", max: Math.round(j.daily.temperature_2m_max[0]), min: Math.round(j.daily.temperature_2m_min[0]), observedAt: j.current.time };
}