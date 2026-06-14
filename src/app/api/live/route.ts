/* Ruta API: partidos EN VIVO del Mundial 2026 desde API-Football.
 * Normaliza la respuesta al formato interno {matchId, group, home, away, scores, status, minute}.
 * Si no hay SPORTS_API_KEY configurada, responde { live: [], source: "none" }. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { fetchLiveFixtures } from "@/lib/sportsApi";
import { hasSportsApi } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function mapStatus(short: string): string {
  if (["1H", "2H", "ET", "P", "LIVE", "HT", "BT"].includes(short)) return "live";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  return "scheduled";
}

function normalize(items: any[]): any[] {
  return items.map((it) => {
    const fx = it?.fixture ?? {};
    const teams = it?.teams ?? {};
    const goals = it?.goals ?? {};
    return {
      matchId: String(fx.id ?? ""),
      group: it?.league?.round ?? "",
      homeTeam: teams?.home?.name ?? "",
      awayTeam: teams?.away?.name ?? "",
      homeScore: goals?.home ?? null,
      awayScore: goals?.away ?? null,
      status: mapStatus(fx?.status?.short ?? ""),
      minute: fx?.status?.elapsed ?? null,
      venue: fx?.venue?.name ?? "",
      date: fx?.date ?? "",
    };
  });
}

export async function GET() {
  if (!hasSportsApi()) {
    return NextResponse.json({ live: [], source: "none" });
  }
  const data = await fetchLiveFixtures();
  if (!data) {
    return NextResponse.json({ live: [], source: "error" });
  }
  return NextResponse.json({ live: normalize(data), source: "api-football" });
}
