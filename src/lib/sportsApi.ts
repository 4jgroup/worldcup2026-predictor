/* Cliente API-Football (api-sports.io) para datos reales y en vivo del Mundial 2026.
 * Toda la autenticacion ocurre server-side: la API key NUNCA se expone al cliente.
 * Si no hay key configurada, las funciones devuelven null y la capa data/source cae a mock. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { serverEnv, hasSportsApi } from "@/lib/env";

const BASE_URL = "https://v3.football.api-sports.io";

async function apiGet(path: string, params: Record<string, string | number> = {}): Promise<any | null> {
  if (!hasSportsApi()) return null;
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(url, {
      headers: { "x-apisports-key": serverEnv.sportsApiKey },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.errors && Object.keys(json.errors).length > 0) return null;
    return json?.response ?? null;
  } catch {
    return null;
  }
}

const LEAGUE = () => serverEnv.sportsApiLeagueId || 1;
const SEASON = () => serverEnv.sportsApiSeason || 2026;

/* Todos los partidos del torneo (calendario completo). */
export async function fetchFixtures(): Promise<any[] | null> {
  return apiGet("/fixtures", { league: LEAGUE(), season: SEASON() });
}

/* Partidos EN VIVO del torneo. */
export async function fetchLiveFixtures(): Promise<any[] | null> {
  return apiGet("/fixtures", { league: LEAGUE(), season: SEASON(), live: "all" });
}

/* Alineaciones de un partido. */
export async function fetchLineups(fixtureId: number): Promise<any[] | null> {
  return apiGet("/fixtures/lineups", { fixture: fixtureId });
}

/* Eventos de un partido (goles, tarjetas, sustituciones). */
export async function fetchEvents(fixtureId: number): Promise<any[] | null> {
  return apiGet("/fixtures/events", { fixture: fixtureId });
}

/* Lesiones del torneo. */
export async function fetchInjuries(): Promise<any[] | null> {
  return apiGet("/injuries", { league: LEAGUE(), season: SEASON() });
}

export const sportsApi = {
  fetchFixtures, fetchLiveFixtures, fetchLineups, fetchEvents, fetchInjuries,
};
