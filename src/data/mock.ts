/* Datos MOCK del Mundial 2026 (equipos, calendario, rosters, tarjetas).
   En produccion estos vendrian de Apify -> Supabase (ver src/lib). */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { hashStr, mulberry32, seededScore, clamp } from "@/utils";
import type { MatchStatus, Team, Match, Card, PlayerStatus } from '@/types';

const T = (teamId, name, group, fifaRanking, eloRating, recentForm, gf, ga, inj, fat, home) => ({
  teamId, name, group, fifaRanking, eloRating,
  recentForm, goalsForLast5: gf, goalsAgainstLast5: ga,
  injuryImpact: inj, fatigueIndex: fat, homeAdvantage: home,
});

const TEAMS = [
  // GROUP A
  T("MEX", "Mexico", "A", 13, 1890, ["W","D","W","W","L"], 8, 5, 0.05, 0.10, 0.06),
  T("POL", "Polonia", "A", 27, 1820, ["L","W","D","W","D"], 6, 6, 0.08, 0.12, 0.00),
  T("KOR", "Corea del Sur", "A", 23, 1840, ["W","W","D","L","W"], 7, 5, 0.04, 0.18, 0.00),
  T("KSA", "Arabia Saudita", "A", 58, 1700, ["L","L","D","W","L"], 4, 8, 0.10, 0.14, 0.00),
  // GROUP B
  T("CAN", "Canada", "B", 31, 1810, ["W","D","L","W","D"], 7, 6, 0.06, 0.09, 0.06),
  T("CRO", "Croacia", "B", 10, 1950, ["W","W","D","W","W"], 9, 4, 0.05, 0.13, 0.00),
  T("CIV", "Costa de Marfil", "B", 40, 1770, ["D","W","L","W","D"], 6, 6, 0.07, 0.11, 0.00),
  T("PAN", "Panama", "B", 41, 1740, ["L","D","W","L","D"], 5, 7, 0.06, 0.10, 0.00),
  // GROUP C  (Brasil, Marruecos, Haiti, Escocia)
  T("BRA", "Brasil", "C", 5, 2110, ["W","W","D","L","W"], 11, 4, 0.05, 0.10, 0.00),
  T("MAR", "Marruecos", "C", 12, 1900, ["W","D","W","W","D"], 8, 4, 0.04, 0.12, 0.00),
  T("HAI", "Haiti", "C", 82, 1620, ["L","L","D","L","W"], 3, 9, 0.12, 0.16, 0.00),
  T("SCO", "Escocia", "C", 34, 1790, ["D","W","L","D","W"], 6, 6, 0.07, 0.11, 0.00),
  // GROUP D
  T("ARG", "Argentina", "D", 1, 2140, ["W","W","W","D","W"], 12, 3, 0.04, 0.11, 0.00),
  T("SEN", "Senegal", "D", 19, 1860, ["W","D","W","L","W"], 8, 5, 0.06, 0.13, 0.00),
  T("AUT", "Austria", "D", 24, 1850, ["W","W","D","W","L"], 7, 5, 0.05, 0.10, 0.00),
  T("CUW", "Curazao", "D", 85, 1610, ["L","D","L","L","D"], 3, 10, 0.09, 0.12, 0.00),
  // GROUP E
  T("FRA", "Francia", "E", 2, 2120, ["W","W","D","W","W"], 11, 4, 0.05, 0.12, 0.00),
  T("URU", "Uruguay", "E", 15, 1880, ["W","L","W","D","W"], 8, 5, 0.06, 0.11, 0.00),
  T("QAT", "Catar", "E", 36, 1760, ["D","L","W","D","L"], 5, 7, 0.07, 0.10, 0.00),
  T("NZL", "Nueva Zelanda", "E", 88, 1600, ["L","D","L","W","L"], 4, 9, 0.08, 0.14, 0.00),
  // GROUP F
  T("USA", "Estados Unidos", "F", 16, 1870, ["W","D","W","L","W"], 8, 5, 0.05, 0.09, 0.06),
  T("SUI", "Suiza", "F", 20, 1855, ["D","W","W","D","L"], 7, 5, 0.06, 0.12, 0.00),
  T("JPN", "Japon", "F", 17, 1875, ["W","W","D","W","D"], 9, 4, 0.04, 0.15, 0.00),
  T("TUN", "Tunez", "F", 42, 1735, ["L","D","W","L","D"], 5, 7, 0.08, 0.11, 0.00),
  // GROUP G
  T("ESP", "Espana", "G", 3, 2125, ["W","W","W","D","W"], 12, 3, 0.04, 0.12, 0.00),
  T("COL", "Colombia", "G", 14, 1885, ["W","D","W","W","L"], 8, 5, 0.06, 0.11, 0.00),
  T("EGY", "Egipto", "G", 33, 1780, ["D","W","L","D","W"], 6, 6, 0.07, 0.10, 0.00),
  T("JOR", "Jordania", "G", 62, 1690, ["L","D","L","W","L"], 4, 8, 0.09, 0.12, 0.00),
  // GROUP H
  T("ENG", "Inglaterra", "H", 4, 2115, ["W","W","D","W","W"], 11, 4, 0.05, 0.12, 0.00),
  T("ECU", "Ecuador", "H", 28, 1815, ["W","D","L","W","D"], 7, 6, 0.06, 0.11, 0.00),
  T("IRN", "Iran", "H", 21, 1850, ["W","D","W","L","W"], 7, 5, 0.06, 0.13, 0.00),
  T("GHA", "Ghana", "H", 64, 1685, ["L","W","L","D","L"], 5, 8, 0.08, 0.12, 0.00),
  // GROUP I
  T("GER", "Alemania", "I", 9, 1985, ["W","W","L","W","D"], 9, 5, 0.06, 0.11, 0.00),
  T("NGA", "Nigeria", "I", 39, 1750, ["D","W","D","L","W"], 6, 6, 0.07, 0.12, 0.00),
  T("NOR", "Noruega", "I", 44, 1745, ["W","D","L","W","D"], 7, 6, 0.05, 0.10, 0.00),
  T("UZB", "Uzbekistan", "I", 57, 1705, ["D","L","W","D","L"], 5, 7, 0.08, 0.11, 0.00),
  // GROUP J
  T("POR", "Portugal", "J", 6, 2080, ["W","W","W","D","W"], 11, 4, 0.05, 0.12, 0.00),
  T("DEN", "Dinamarca", "J", 22, 1845, ["W","D","W","L","D"], 7, 5, 0.06, 0.10, 0.00),
  T("ALG", "Argelia", "J", 37, 1755, ["D","W","L","D","W"], 6, 6, 0.07, 0.11, 0.00),
  T("CPV", "Cabo Verde", "J", 70, 1660, ["L","D","L","W","L"], 4, 8, 0.08, 0.12, 0.00),
  // GROUP K
  T("NED", "Paises Bajos", "K", 7, 2040, ["W","W","D","W","W"], 10, 4, 0.05, 0.12, 0.00),
  T("PER", "Peru", "K", 46, 1725, ["L","D","W","L","D"], 5, 7, 0.08, 0.11, 0.00),
  T("AUS", "Australia", "K", 26, 1825, ["W","D","W","L","W"], 7, 5, 0.06, 0.13, 0.00),
  T("JAM", "Jamaica", "K", 60, 1695, ["D","L","D","W","L"], 5, 8, 0.07, 0.10, 0.00),
  // GROUP L
  T("BEL", "Belgica", "L", 8, 2000, ["W","D","W","W","L"], 9, 5, 0.06, 0.12, 0.00),
  T("SRB", "Serbia", "L", 29, 1810, ["W","L","D","W","D"], 7, 6, 0.06, 0.11, 0.00),
  T("CMR", "Camerun", "L", 43, 1730, ["D","W","L","D","W"], 6, 6, 0.08, 0.12, 0.00),
  T("HON", "Honduras", "L", 72, 1655, ["L","D","L","L","W"], 4, 8, 0.09, 0.12, 0.00),
];

const GROUP_ORDER = ["A","B","C","D","E","F","G","H","I","J","K","L"];
const TEAM_MAP = TEAMS.reduce((m, t) => ((m[t.teamId] = t), m), {});

/* =========================================================================
   DATOS MOCK — MATCHES (CalendarResultsActor)
   Round-robin por grupo (6 partidos). Para demostrar el paywall por partido:
     - Grupos A,B,C,D: jugaron MD1 + MD2 -> el partido de MD3 es "3er partido"
       (Premium para free). El resto de jornadas, gratis.
     - Grupos E,F,G,H: jugaron MD1 -> todo gratis.
     - Grupos I,J,K,L: nada jugado -> gratis + 1 partido EN VIVO de muestra.
   ========================================================================= */
const STADIUMS = [
  "MetLife Stadium", "SoFi Stadium", "AT&T Stadium", "Estadio Azteca",
  "BC Place", "Mercedes-Benz Stadium", "Lumen Field", "Hard Rock Stadium",
];
const MD_DATE = { 1: "2026-06-13", 2: "2026-06-19", 3: "2026-06-25" };
const MD_TIME = ["15:00", "18:00", "21:00"];
const PLAYED_MD = { A:[1,2], B:[1,2], C:[1,2], D:[1,2], E:[1], F:[1], G:[1], H:[1], I:[], J:[], K:[], L:[] };
const LIVE_MATCH_ID = "I1";

function buildMatches() {
  const out: Match[] = [];
  GROUP_ORDER.forEach((g, gi) => {
    const ids = TEAMS.filter((t) => t.group === g).map((t) => t.teamId);
    const [a, b, c, d] = ids;
    const fixtures = [
      [a, b, 1], [c, d, 1],
      [a, c, 2], [b, d, 2],
      [a, d, 3], [b, c, 3],
    ];
    fixtures.forEach((f, idx) => {
      const matchId = `${g}${idx + 1}`;
      const md = f[2];
      const played = PLAYED_MD[g].includes(md);
      let homeScore: number | null = null, awayScore: number | null = null, status: MatchStatus = "scheduled";
      if (played) {
        const [hs, as] = seededScore(matchId, 0.12);
        homeScore = hs; awayScore = as; status = "finished";
      }
      if (matchId === LIVE_MATCH_ID) {
        homeScore = 1; awayScore = 0; status = "live";
      }
      out.push({
        matchId, group: g,
        homeTeamId: f[0], awayTeamId: f[1],
        homeScore, awayScore, status,
        date: MD_DATE[md], time: MD_TIME[idx % 3],
        venue: STADIUMS[(gi + idx) % STADIUMS.length],
        matchday: md, stage: "group",
        source: "Apify Actor Mock",
        lastUpdated: "2026-06-13T12:00:00Z",
      });
    });
  });
  return out;
}
const MATCHES = buildMatches();
const MATCH_MAP = MATCHES.reduce((m, x) => ((m[x.matchId] = x), m), {});

/* =========================================================================
   DATOS MOCK — ROSTERS (RosterActor / LineupActor) para equipos destacados.
   Nombres sinteticos tipo "BRA FW9" para dejar claro que NO son reales.
   ========================================================================= */
const FEATURED = ["BRA","MAR","HAI","SCO","ARG","SEN","FRA","URU","GER","NGA"];
const POSITIONS = [
  ["GK", 1], ["DF", 4], ["MF", 3], ["FW", 3], ["DF", 1], ["MF", 2], ["FW", 1], ["GK", 1],
];
function buildRoster(teamId) {
  // 16 jugadores: 2 GK, 5 DF, 5 MF, 4 FW; impacto base sembrado.
  const layout = ["GK","DF","DF","DF","DF","DF","MF","MF","MF","MF","MF","FW","FW","FW","FW","GK"];
  const rnd = mulberry32(hashStr(teamId + "_roster"));
  return layout.map((pos, i) => {
    const n = i + 1;
    const base = pos === "FW" ? 0.6 + rnd() * 0.4
      : pos === "MF" ? 0.5 + rnd() * 0.35
      : pos === "DF" ? 0.45 + rnd() * 0.3
      : 0.55 + rnd() * 0.3; // GK
    return {
      playerId: `${teamId}_${n}`,
      teamId,
      playerName: `${teamId} ${pos}${n}`,
      position: pos,
      baseImpact: Math.round(base * 100) / 100, // 0..1
      isStarterDefault: i < 11, // primeros 11 = titulares por defecto
    };
  });
}
const ROSTERS = FEATURED.reduce((m, id) => ((m[id] = buildRoster(id)), m), {});
const PLAYER_MAP = {};
Object.values(ROSTERS).forEach((arr) => arr.forEach((p) => (PLAYER_MAP[p.playerId] = p)));

/* STATUS_OVERRIDES: lesiones / dudas / no convocados (InjuryNewsActor mock).
   status: available | doubtful | injured | unavailable
   Cada override trae impactLevel, confidenceScore y fuente. */
const STATUS_OVERRIDES = {
  // Brasil: un titular de alto impacto en duda (dispara alerta critica + recalculo)
  BRA_10: { status: "doubtful", impactLevel: "high", confidenceScore: 0.74, sourceName: "Mock Source", sourceUrl: "https://example.com" },
  BRA_2:  { status: "injured",  impactLevel: "medium", confidenceScore: 0.81, sourceName: "Mock Source", sourceUrl: "https://example.com" },
  // Escocia: portero titular lesionado (penalizacion fuerte)
  SCO_1:  { status: "injured",  impactLevel: "critical", confidenceScore: 0.66, sourceName: "Mock Source", sourceUrl: "https://example.com" },
  // Marruecos: jugador en duda sin fuente confiable
  MAR_7: { status: "doubtful", impactLevel: "high", confidenceScore: null, sourceName: null, sourceUrl: null },
  // Alemania: goleador principal fuera
  GER_9: { status: "unavailable", impactLevel: "high", confidenceScore: 0.7, sourceName: "Mock Source", sourceUrl: "https://example.com" },
};

/* ALINEACIONES OFICIALES (LineupActor). Solo algunos partidos las tienen.
   Si no existe -> "Alineacion oficial pendiente". */
const OFFICIAL_LINEUPS = {
  // C5 (BRA vs SCO) tiene alineacion oficial de Brasil con un cambio fuerte
  "C5:BRA": {
    matchId: "C5", teamId: "BRA", lineupType: "official", formation: "4-3-3",
    confidenceScore: 1.0, sourceName: "Mock Source", sourceUrl: "https://example.com",
    publishedAt: "2026-06-25T13:00:00Z",
    // titulares oficiales: sale BRA_12 (en duda) y BRA_3 (suspendido), entran suplentes
    starterIds: ["BRA_1","BRA_2x","BRA_4","BRA_5","BRA_6","BRA_7","BRA_8","BRA_9","BRA_13","BRA_14","BRA_15"],
  },
};

/* =========================================================================
   DATOS MOCK — TARJETAS (DisciplinaryActor)
   Ingenieria de datos para el caso de prueba C5 (BRA vs SCO, MD3):
     - BRA_3 acumula 2 amarillas (C1 y C3) -> suspendido para C5.
     - SCO_6 recibe roja directa en C4 -> suspendido para C5.
     - BRA_9 tiene 1 amarilla -> apercibido (en riesgo).
   ========================================================================= */
const CARDS = [
  { matchId: "C1", teamId: "BRA", playerId: "BRA_3", playerName: "BRA DF3", minute: 38, cardType: "yellow", reason: "reckless foul", matchStage: "group", sourceName: "Mock Source", sourceUrl: "https://example.com", lastUpdated: "2026-06-13T20:00:00Z" },
  { matchId: "C3", teamId: "BRA", playerId: "BRA_3", playerName: "BRA DF3", minute: 71, cardType: "yellow", reason: "tactical foul", matchStage: "group", sourceName: "Mock Source", sourceUrl: "https://example.com", lastUpdated: "2026-06-19T20:00:00Z" },
  { matchId: "C1", teamId: "BRA", playerId: "BRA_9", playerName: "BRA MF9", minute: 55, cardType: "yellow", reason: "dissent", matchStage: "group", sourceName: "Mock Source", sourceUrl: "https://example.com", lastUpdated: "2026-06-13T20:00:00Z" },
  { matchId: "C4", teamId: "SCO", playerId: "SCO_6", playerName: "SCO DF6", minute: 64, cardType: "red", reason: "serious foul play", matchStage: "group", sourceName: "Mock Source", sourceUrl: "https://example.com", lastUpdated: "2026-06-19T22:00:00Z" },
  { matchId: "C2", teamId: "SCO", playerId: "SCO_8", playerName: "SCO MF8", minute: 80, cardType: "yellow", reason: "delay of game", matchStage: "group", sourceName: "Mock Source", sourceUrl: "https://example.com", lastUpdated: "2026-06-13T22:00:00Z" },
];

/* Reglas disciplinarias CONFIGURABLES (editables). */
const DISCIPLINARY_RULES = {
  yellowsForSuspension: 2,        // 2 amarillas acumuladas -> 1 partido
  yellowSuspensionMatches: 1,
  redSuspensionMatches: 1,        // roja directa -> 1 partido
  doubleYellowCountsAsRed: true,  // doble amarilla = expulsion
  resetAfterStages: ["group", "quarterfinal"], // se limpian tras grupos y tras cuartos
};

/* =========================================================================
   MODELO PREDICTIVO V2 — funciones puras
   ========================================================================= */

export {
  TEAMS, GROUP_ORDER, TEAM_MAP, STADIUMS, PLAYED_MD, LIVE_MATCH_ID,
  MATCHES, MATCH_MAP, FEATURED, POSITIONS, ROSTERS, PLAYER_MAP,
  STATUS_OVERRIDES, OFFICIAL_LINEUPS, CARDS, DISCIPLINARY_RULES,
};
