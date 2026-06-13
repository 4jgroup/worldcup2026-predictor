/* Tipos del dominio. El motor (src/models/engine.ts) esta portado de JS validado
   y es de tipado laxo; estos tipos describen las entidades para la UI y el lib. */

export interface Team {
  teamId: string;
  name: string;
  group: string;
  fifaRanking: number;
  eloRating: number;
  recentForm: string[];
  goalsForLast5: number;
  goalsAgainstLast5: number;
  injuryImpact: number;
  fatigueIndex: number;
  homeAdvantage: number;
}

export type MatchStatus = "scheduled" | "live" | "finished";

export interface Match {
  matchId: string;
  group: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  date?: string;
  time?: string;
  venue?: string;
  matchday: number;
  stage?: string;
}

export type PlayerStatusKind =
  | "available" | "doubtful" | "injured" | "suspended" | "unavailable";

export interface PlayerStatus {
  playerId: string;
  playerName: string;
  position: string;
  status: PlayerStatusKind;
  impactLevel: "low" | "medium" | "high" | "critical";
  expectedStarter: boolean;
  playerImpactScore: number;
}

export interface Card {
  matchId: string;
  teamId: string;
  playerId: string;
  playerName: string;
  minute: number;
  cardType: "yellow" | "red";
  matchStage?: string;
}

export interface Prediction {
  pWin: number;
  pDraw: number;
  pLoss: number;
  lambdaA: number;
  lambdaB: number;
  topScores: { score: string; prob: number }[];
  explanation: string;
}

export interface Alert {
  teamId: string;
  alertType: string;
  message: string;
  predictionImpact?: any;
}

/** Usuario de la app. En demo, isPremiumUser se controla con el toggle. */
export interface AppUser {
  isPremiumUser: boolean;
  subscriptionStatus?: string;
}

export type TabId = "dashboard" | "partido" | "grupos" | "simulador" | "datos" | "pruebas";

/** Alias usado por la UI (equivale a AppUser). */
export interface User {
  isPremiumUser: boolean;
  subscriptionStatus?: string;
}

export type ImpactLevel = "low" | "medium" | "high" | "critical";
