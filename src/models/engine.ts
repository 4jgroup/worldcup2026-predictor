/* Motor de prediccion y reglas (logica pura validada por QA).
   Importa datos de @/data y helpers de @/utils. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { clamp, pct, signed, roundPercents, FACT } from "@/utils";
import {
  TEAMS, GROUP_ORDER, TEAM_MAP, MATCHES, MATCH_MAP, FEATURED, POSITIONS,
  ROSTERS, PLAYER_MAP, STATUS_OVERRIDES, OFFICIAL_LINEUPS, CARDS, DISCIPLINARY_RULES,
} from "@/data";

function normalizeRating(value, min, max) {
  if (max === min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}
function calculateRecentFormScore(recentForm) {
  if (!recentForm || !recentForm.length) return 0.5;
  const pts = recentForm.reduce((s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
  return clamp(pts / (3 * recentForm.length), 0, 1);
}
function calculateAttackScore(goalsForLast5) { return clamp(goalsForLast5 / 12, 0, 1); }
function calculateDefenseScore(goalsAgainstLast5) { return clamp(1 - goalsAgainstLast5 / 12, 0, 1); }

/* Fuerza global (0..1) con los pesos EXACTOS de la V2.
   ctx opcional = { rosterScore, disciplineScore } en 0..1 (1 = sin impacto).
   Permite recalcular comparando baseline (sin ctx) vs actualizado. */
function calculateTeamStrength(team, ctx = { rosterScore: 1, disciplineScore: 1 }) {
  const normElo = normalizeRating(team.eloRating, 1600, 2150);
  const normFifa = clamp(1 - (team.fifaRanking - 1) / (80 - 1), 0, 1);
  const form = calculateRecentFormScore(team.recentForm);
  const atk = calculateAttackScore(team.goalsForLast5);
  const def = calculateDefenseScore(team.goalsAgainstLast5);
  const rosterScore = ctx && ctx.rosterScore != null ? ctx.rosterScore : 1.0;
  const disciplineScore = ctx && ctx.disciplineScore != null ? ctx.disciplineScore : 1.0;
  const context = clamp(1 - team.injuryImpact - team.fatigueIndex + team.homeAdvantage, 0, 1);
  return (
    0.32 * normElo +
    0.14 * normFifa +
    0.14 * form +
    0.10 * atk +
    0.10 * def +
    0.10 * rosterScore +
    0.05 * disciplineScore +
    0.05 * context
  );
}

function calculateExpectedGoals(teamA, teamB, ctxA = { rosterScore: 1, disciplineScore: 1 }, ctxB = { rosterScore: 1, disciplineScore: 1 }) {
  const sA = calculateTeamStrength(teamA, ctxA);
  const sB = calculateTeamStrength(teamB, ctxB);
  const AVG = 1.35;
  const lambdaA = clamp(AVG * (sA + 0.2) / (sB + 0.2) + teamA.homeAdvantage * 0.5, 0.2, 4.8);
  const lambdaB = clamp(AVG * (sB + 0.2) / (sA + 0.2) + teamB.homeAdvantage * 0.5, 0.2, 4.8);
  return { lambdaA, lambdaB, strengthA: sA, strengthB: sB };
}
function poissonProbability(lambda, k) {
  if (k < 0) return 0;
  const f = k < FACT.length ? FACT[k] : FACT[FACT.length - 1] * Math.pow(k, k - FACT.length + 1);
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / f;
}
function predictMatch(teamA, teamB, ctxA = { rosterScore: 1, disciplineScore: 1 }, ctxB = { rosterScore: 1, disciplineScore: 1 }) {
  const { lambdaA, lambdaB, strengthA, strengthB } = calculateExpectedGoals(teamA, teamB, ctxA, ctxB);
  const MAX = 6;
  let pWin = 0, pDraw = 0, pLoss = 0, total = 0;
  const scorelines: { score: string; prob: number }[] = [];
  for (let i = 0; i <= MAX; i++) {
    for (let j = 0; j <= MAX; j++) {
      const p = poissonProbability(lambdaA, i) * poissonProbability(lambdaB, j);
      total += p;
      if (i > j) pWin += p; else if (i === j) pDraw += p; else pLoss += p;
      scorelines.push({ score: `${i}-${j}`, prob: p });
    }
  }
  pWin /= total; pDraw /= total; pLoss /= total;
  scorelines.forEach((s) => (s.prob /= total));
  scorelines.sort((a, b) => b.prob - a.prob);
  const top = Math.max(pWin, pDraw, pLoss);
  let confidence = "Baja", confColor = "var(--muted)";
  if (top >= 0.55) { confidence = "Alta"; confColor = "var(--green)"; }
  else if (top >= 0.42) { confidence = "Media"; confColor = "var(--gold)"; }
  const [ew, ed, el] = roundPercents([pWin, pDraw, pLoss]);
  const lead = pWin >= pLoss ? teamA : teamB;
  const explanation =
    `${lead.name} llega con indice de fuerza ${(Math.max(strengthA, strengthB) * 100).toFixed(0)}/100 ` +
    `(Elo ${lead.eloRating}, ranking FIFA #${lead.fifaRanking}, forma ${lead.recentForm.join("")}). ` +
    `El modelo proyecta ${lambdaA.toFixed(2)} xG para ${teamA.name} y ${lambdaB.toFixed(2)} para ${teamB.name}, ` +
    `y reparte ${ew}% / ${ed}% / ${el}% ` +
    `(local/empate/visita) con distribucion de Poisson.`;
  return {
    pWin, pDraw, pLoss, lambdaA, lambdaB, strengthA, strengthB,
    expectedGoals: lambdaA + lambdaB,
    confidence, confColor, explanation,
    topScores: scorelines.slice(0, 5),
  };
}

/* -------- Standings y simulacion Monte Carlo (igual que V1, pesos V2) -------- */
function emptyRow(id) { return { teamId: id, pj: 0, pts: 0, gf: 0, gc: 0, dg: 0 }; }
function applyResult(rows, home, away, hs, as) {
  const rh = rows[home], ra = rows[away];
  rh.pj++; ra.pj++;
  rh.gf += hs; rh.gc += as; ra.gf += as; ra.gc += hs;
  rh.dg = rh.gf - rh.gc; ra.dg = ra.gf - ra.gc;
  if (hs > as) rh.pts += 3; else if (hs < as) ra.pts += 3; else { rh.pts++; ra.pts++; }
}
function rankRows(rows: any) {
  return (Object.values(rows) as any[]).sort(
    (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || (Math.random() - 0.5)
  );
}
function getGroupTeams(groupId) { return TEAMS.filter((t) => t.group === groupId); }
function getGroupMatches(groupId, matches) { return matches.filter((m) => m.group === groupId); }
function computeStandings(groupId, matches) {
  const ids = getGroupTeams(groupId).map((t) => t.teamId);
  const rows = {}; ids.forEach((id) => (rows[id] = emptyRow(id)));
  getGroupMatches(groupId, matches)
    .filter((m) => m.status === "finished" && m.homeScore != null)
    .forEach((m) => applyResult(rows, m.homeTeamId, m.awayTeamId, m.homeScore, m.awayScore));
  return rankRows(rows);
}
function samplePoisson(lambda) {
  const L = Math.exp(-Math.min(lambda, 6));
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return Math.min(k - 1, 7);
}
function simulateGroup(groupId, matches, N = 1500) {
  const ids = getGroupTeams(groupId).map((t) => t.teamId);
  const finished = getGroupMatches(groupId, matches).filter((m) => m.status === "finished" && m.homeScore != null);
  const pending = getGroupMatches(groupId, matches).filter((m) => m.status !== "finished");
  const lambdas = pending.map((m) => {
    const e = calculateExpectedGoals(TEAM_MAP[m.homeTeamId], TEAM_MAP[m.awayTeamId]);
    return { m, la: e.lambdaA, lb: e.lambdaB };
  });
  const qualify = {}, winGroup = {};
  ids.forEach((id) => { qualify[id] = 0; winGroup[id] = 0; });
  for (let n = 0; n < N; n++) {
    const rows = {}; ids.forEach((id) => (rows[id] = emptyRow(id)));
    finished.forEach((m) => applyResult(rows, m.homeTeamId, m.awayTeamId, m.homeScore, m.awayScore));
    lambdas.forEach(({ m, la, lb }) => applyResult(rows, m.homeTeamId, m.awayTeamId, samplePoisson(la), samplePoisson(lb)));
    const ranked = rankRows(rows);
    qualify[ranked[0].teamId]++; qualify[ranked[1].teamId]++;
    winGroup[ranked[0].teamId]++;
  }
  const res = {};
  ids.forEach((id) => (res[id] = { qualifyProb: qualify[id] / N, winProb: winGroup[id] / N }));
  return res;
}
function simulateTournament(matches, N = 1000) {
  const lambdaCache = new Map();
  const getL = (aId, bId) => {
    const key = aId + ">" + bId;
    if (!lambdaCache.has(key)) {
      const e = calculateExpectedGoals(TEAM_MAP[aId], TEAM_MAP[bId]);
      lambdaCache.set(key, [e.lambdaA, e.lambdaB]);
    }
    return lambdaCache.get(key);
  };
  const strength = {}; TEAMS.forEach((t) => (strength[t.teamId] = calculateTeamStrength(t)));
  const finishedByGroup = {}, pendingByGroup = {};
  GROUP_ORDER.forEach((g) => {
    finishedByGroup[g] = getGroupMatches(g, matches).filter((m) => m.status === "finished" && m.homeScore != null);
    pendingByGroup[g] = getGroupMatches(g, matches).filter((m) => m.status !== "finished");
  });
  const playKO = (aId, bId) => {
    const [la, lb] = getL(aId, bId);
    const sa = samplePoisson(la), sb = samplePoisson(lb);
    if (sa > sb) return aId;
    if (sb > sa) return bId;
    return Math.random() < strength[aId] / (strength[aId] + strength[bId]) ? aId : bId;
  };
  const champ = {}, finalist = {}, semi = {};
  TEAMS.forEach((t) => { champ[t.teamId] = 0; finalist[t.teamId] = 0; semi[t.teamId] = 0; });
  for (let n = 0; n < N; n++) {
    const qualified: string[] = [];
    const thirds: any[] = [];
    GROUP_ORDER.forEach((g) => {
      const ids = getGroupTeams(g).map((t) => t.teamId);
      const rows = {}; ids.forEach((id) => (rows[id] = emptyRow(id)));
      finishedByGroup[g].forEach((m) => applyResult(rows, m.homeTeamId, m.awayTeamId, m.homeScore, m.awayScore));
      pendingByGroup[g].forEach((m) => {
        const [la, lb] = getL(m.homeTeamId, m.awayTeamId);
        applyResult(rows, m.homeTeamId, m.awayTeamId, samplePoisson(la), samplePoisson(lb));
      });
      const ranked = rankRows(rows);
      qualified.push(ranked[0].teamId, ranked[1].teamId);
      thirds.push(ranked[2]);
    });
    thirds.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || (Math.random() - 0.5));
    thirds.slice(0, 8).forEach((r) => qualified.push(r.teamId));
    let alive = qualified.slice();
    for (let i = alive.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [alive[i], alive[j]] = [alive[j], alive[i]];
    }
    while (alive.length > 1) {
      if (alive.length === 4) alive.forEach((id) => semi[id]++);
      if (alive.length === 2) alive.forEach((id) => finalist[id]++);
      const next = [];
      for (let i = 0; i < alive.length; i += 2) next.push(playKO(alive[i], alive[i + 1]));
      alive = next;
    }
    champ[alive[0]]++;
  }
  return TEAMS
    .map((t) => ({
      teamId: t.teamId, name: t.name,
      champ: champ[t.teamId] / N, finalist: finalist[t.teamId] / N, semi: semi[t.teamId] / N,
    }))
    .sort((a, b) => b.champ - a.champ);
}

/* =========================================================================
   MODULO DISCIPLINARIO — funciones puras
   ========================================================================= */
function calculateYellowCardCount(playerId, cards, currentStage) {
  // Cuenta amarillas del jugador dentro de la ventana de la fase actual.
  return cards.filter(
    (c) => c.playerId === playerId && c.cardType === "yellow" && c.matchStage === currentStage
  ).length;
}
function calculateRedCardSuspension(playerId, cards) {
  // Partidos de suspension por rojas directas (doble amarilla se modela como red en datos).
  const reds = cards.filter((c) => c.playerId === playerId && c.cardType === "red").length;
  return reds * DISCIPLINARY_RULES.redSuspensionMatches;
}
function getDisciplinaryWindow(match) {
  // Ventana = fase del partido (group_stage / knockout).
  const stage = match ? match.stage : "group";
  return stage === "group" ? "group_stage" : "knockout";
}
function shouldYellowCardsReset(matchStage) {
  return DISCIPLINARY_RULES.resetAfterStages.includes(matchStage);
}
function isPlayerAtRiskOfSuspension(playerId, cards, matchStage) {
  // En riesgo = tiene (umbral - 1) amarillas en la ventana y aun no esta suspendido.
  const yellows = calculateYellowCardCount(playerId, cards, matchStage);
  return yellows === DISCIPLINARY_RULES.yellowsForSuspension - 1 && !isPlayerSuspended(playerId, cards, matchStage);
}
function isPlayerSuspended(playerId, cards, matchStage) {
  const yellows = calculateYellowCardCount(playerId, cards, matchStage);
  const yellowSusp = yellows >= DISCIPLINARY_RULES.yellowsForSuspension;
  const redSusp = calculateRedCardSuspension(playerId, cards) > 0;
  return yellowSusp || redSusp;
}
function getSuspensionMatchesRemaining(playerId, cards, matchStage) {
  let n = 0;
  const yellows = calculateYellowCardCount(playerId, cards, matchStage);
  if (yellows >= DISCIPLINARY_RULES.yellowsForSuspension) n += DISCIPLINARY_RULES.yellowSuspensionMatches;
  n += calculateRedCardSuspension(playerId, cards);
  return n;
}
function getPlayerDisciplineStatuses(teamId, cards, matchStage) {
  // Construye playerDisciplineStatus por jugador con tarjetas en el equipo.
  const ids = [...new Set(cards.filter((c) => c.teamId === teamId).map((c) => c.playerId))];
  return ids.map((pid) => {
    const p = PLAYER_MAP[pid] || { playerName: pid, position: "?" };
    const yellows = calculateYellowCardCount(pid, cards, matchStage);
    const reds = cards.filter((c) => c.playerId === pid && c.cardType === "red").length;
    const suspended = isPlayerSuspended(pid, cards, matchStage);
    const atRisk = isPlayerAtRiskOfSuspension(pid, cards, matchStage);
    const impactLevel = (PLAYER_MAP[pid]?.baseImpact || 0.5) >= 0.7 ? "high" : "medium";
    return {
      teamId, playerId: pid, playerName: p.playerName, position: p.position,
      yellowCardsGroupStage: matchStage === "group" ? yellows : 0,
      yellowCardsKnockoutWindow: matchStage !== "group" ? yellows : 0,
      redCards: reds,
      isSuspended: suspended,
      suspensionMatchesRemaining: getSuspensionMatchesRemaining(pid, cards, matchStage),
      atRiskOfSuspension: atRisk,
      disciplinaryWindow: matchStage === "group" ? "group_stage" : "knockout",
      impactLevel: suspended ? impactLevel : atRisk ? "medium" : "low",
      lastUpdated: "2026-06-20T20:00:00Z",
    };
  });
}
function calculateDisciplinaryImpact(teamId, playerDisciplineStatuses) {
  // Devuelve disciplineScore en 0..1 (1 = sin impacto) + detalle.
  let penalty = 0;
  const suspended = [], atRisk = [];
  playerDisciplineStatuses.forEach((s) => {
    const impact = PLAYER_MAP[s.playerId]?.baseImpact || 0.5;
    if (s.isSuspended) { penalty += 0.14 + impact * 0.16; suspended.push(s); }
    else if (s.atRiskOfSuspension) { penalty += 0.02 + impact * 0.03; atRisk.push(s); }
  });
  const disciplineScore = clamp(1 - penalty, 0.5, 1);
  return { disciplineScore, penalty, suspended, atRisk };
}

/* =========================================================================
   MODULO ROSTER / LESIONES — funciones puras
   ========================================================================= */
function getPlayerStatuses(teamId) {
  // Combina roster base + STATUS_OVERRIDES. Default = "available".
  const roster = ROSTERS[teamId] || [];
  return roster.map((p) => {
    const ov = STATUS_OVERRIDES[p.playerId];
    return {
      teamId, playerId: p.playerId, playerName: p.playerName, position: p.position,
      status: ov ? ov.status : "available",
      impactLevel: ov ? ov.impactLevel : "low",
      expectedStarter: p.isStarterDefault,
      playerImpactScore: p.baseImpact,
      confidenceScore: ov ? ov.confidenceScore : null,
      sourceName: ov ? ov.sourceName : null,
      sourceUrl: ov ? ov.sourceUrl : null,
      lastUpdated: "2026-06-13T12:00:00Z",
    };
  });
}
function calculateInjuryImpact(teamId, playerStatuses) {
  // Penalizacion por lesionados / dudas titulares ponderada por impacto.
  let penalty = 0;
  playerStatuses.forEach((s) => {
    if (!s.expectedStarter) return;
    if (s.status === "injured" || s.status === "unavailable") penalty += 0.10 + s.playerImpactScore * 0.18;
    else if (s.status === "doubtful") penalty += 0.04 + s.playerImpactScore * 0.08;
    // portero titular fuera: castigo extra
    if (s.position === "GK" && (s.status === "injured" || s.status === "unavailable")) penalty += 0.08;
  });
  return penalty;
}
function calculateSuspensionImpact(teamId, playerStatuses) {
  // Penalizacion por suspendidos (status === "suspended" en roster, si aplica).
  let penalty = 0;
  playerStatuses.forEach((s) => {
    if (s.status === "suspended" && s.expectedStarter) penalty += 0.06 + s.playerImpactScore * 0.09;
  });
  return penalty;
}
function detectCriticalAbsences(teamId, playerStatuses) {
  // Titulares de alto impacto fuera o en duda.
  return playerStatuses.filter(
    (s) => s.expectedStarter && s.playerImpactScore >= 0.7 &&
      (s.status === "injured" || s.status === "unavailable" || s.status === "suspended" || s.status === "doubtful")
  );
}
function calculateRosterImpact(teamId, playerStatuses) {
  // rosterScore en 0..1 (1 = sin impacto). Combina lesiones + suspensiones.
  const inj = calculateInjuryImpact(teamId, playerStatuses);
  const susp = calculateSuspensionImpact(teamId, playerStatuses);
  const rosterScore = clamp(1 - inj - susp, 0.5, 1);
  return { rosterScore, injuryPenalty: inj, suspensionPenalty: susp };
}
function getPredictedLineup(matchId, teamId) {
  const statuses = getPlayerStatuses(teamId);
  // Titulares probables: titulares por defecto disponibles + reemplazos por banca.
  const available = statuses.filter((s) => s.status === "available" || s.status === "doubtful");
  const starters = statuses.filter((s) => s.expectedStarter && (s.status === "available" || s.status === "doubtful"));
  const bench = available.filter((s) => !s.expectedStarter);
  let lineup = starters.slice();
  let bi = 0;
  while (lineup.length < 11 && bi < bench.length) lineup.push(bench[bi++]);
  return {
    matchId, teamId, lineupType: "predicted", formation: "4-3-3",
    confidenceScore: getLineupConfidence(matchId, teamId),
    players: lineup.map((s) => ({
      playerId: s.playerId, playerName: s.playerName, position: s.position,
      isStarter: true, status: s.status, playerImpactScore: s.playerImpactScore,
    })),
    sourceName: "Mock Source", sourceUrl: "https://example.com",
    publishedAt: "2026-06-24T15:00:00Z",
  };
}
function getOfficialLineup(matchId, teamId) {
  return OFFICIAL_LINEUPS[`${matchId}:${teamId}`] || null;
}
function getLineupConfidence(matchId, teamId) {
  // Menor confianza cuando hay dudas entre titulares.
  const statuses = getPlayerStatuses(teamId);
  const doubtfulStarters = statuses.filter((s) => s.expectedStarter && s.status === "doubtful").length;
  return Math.round(clamp(0.85 - doubtfulStarters * 0.08, 0.4, 0.95) * 100) / 100;
}
function comparePredictedVsOfficialLineup(predicted, official) {
  if (!official) return { available: false, changes: [], changeCount: 0 };
  const predIds = new Set(predicted.players.map((p) => p.playerId));
  const offIds = new Set(official.starterIds);
  const out = [...offIds].filter((id) => !predIds.has(id)).map((id) => ({ type: "in", playerId: id }));
  const drop = [...predIds].filter((id) => !offIds.has(id)).map((id) => ({ type: "out", playerId: id }));
  const changes = [...out, ...drop];
  return { available: true, changes, changeCount: changes.length };
}

/* =========================================================================
   FUNCIONES DE ACCESO / PAYWALL (regla EXACTA del spec — por partido)
   ========================================================================= */
function getTeamGamesPlayed(teamId, matches) {
  return matches.filter(
    (m) => m.status === "finished" && m.homeScore != null && (m.homeTeamId === teamId || m.awayTeamId === teamId)
  ).length;
}
function isThirdMatchOrLater(match, matches) {
  // 3er partido o posterior = AMBOS equipos ya jugaron 2 partidos terminados.
  if (!match) return false;
  return (
    getTeamGamesPlayed(match.homeTeamId, matches) >= 2 &&
    getTeamGamesPlayed(match.awayTeamId, matches) >= 2
  );
}
function canAccessBasicPrediction(user, match, matches) {
  return !!user.isPremiumUser || !isThirdMatchOrLater(match, matches);
}
function canAccessAdvancedPrediction(user, match, matches) {
  return !!user.isPremiumUser || !isThirdMatchOrLater(match, matches);
}
function canAccessRosterIntelligence(user /*, match, matches */) {
  // Impacto avanzado de roster/lesiones = siempre Premium.
  return !!user.isPremiumUser;
}
function canAccessDisciplinaryIntelligence(user /*, match, matches */) {
  // Impacto disciplinario avanzado = siempre Premium (el conteo basico es gratis).
  return !!user.isPremiumUser;
}
function canAccessTournamentSimulator(user) {
  return !!user.isPremiumUser;
}
function isGroupLocked(groupId, teams, matches) {
  // Grupo bloqueado cuando TODOS sus equipos tienen gamesPlayed >= 2.
  const list = teams && teams.length ? teams : getGroupTeams(groupId);
  return list.length > 0 && list.every((t) => getTeamGamesPlayed(t.teamId, matches) >= 2);
}

/* =========================================================================
   ALERTAS Y RECALCULO (roster + disciplina) — orquestacion por partido
   ========================================================================= */
function buildTeamCtx(teamId, matches, matchStage = "group") {
  const statuses = getPlayerStatuses(teamId);
  const { rosterScore, injuryPenalty, suspensionPenalty } = calculateRosterImpact(teamId, statuses);
  const discStatuses = getPlayerDisciplineStatuses(teamId, CARDS, matchStage);
  const { disciplineScore, suspended, atRisk } = calculateDisciplinaryImpact(teamId, discStatuses);
  return {
    rosterScore, disciplineScore, injuryPenalty, suspensionPenalty,
    statuses, discStatuses, suspended, atRisk,
  };
}
function recalculatePredictionAfterRosterUpdate(matchId, matches) {
  const m = MATCH_MAP[matchId];
  if (!m) return null;
  const home = TEAM_MAP[m.homeTeamId], away = TEAM_MAP[m.awayTeamId];
  const ctxA = buildTeamCtx(home.teamId, matches, m.stage);
  const ctxB = buildTeamCtx(away.teamId, matches, m.stage);
  // Baseline: solo disciplina (sin roster). Updated: roster + disciplina.
  const base = predictMatch(home, away,
    { rosterScore: 1, disciplineScore: ctxA.disciplineScore },
    { rosterScore: 1, disciplineScore: ctxB.disciplineScore });
  const updated = predictMatch(home, away,
    { rosterScore: ctxA.rosterScore, disciplineScore: ctxA.disciplineScore },
    { rosterScore: ctxB.rosterScore, disciplineScore: ctxB.disciplineScore });
  return { base, updated, ctxA, ctxB, home, away,
    delta: {
      win: (updated.pWin - base.pWin) * 100,
      draw: (updated.pDraw - base.pDraw) * 100,
      loss: (updated.pLoss - base.pLoss) * 100,
      xg: updated.lambdaA - base.lambdaA,
    } };
}
function recalculatePredictionAfterSuspension(matchId, matches) {
  const m = MATCH_MAP[matchId];
  if (!m) return null;
  const home = TEAM_MAP[m.homeTeamId], away = TEAM_MAP[m.awayTeamId];
  const ctxA = buildTeamCtx(home.teamId, matches, m.stage);
  const ctxB = buildTeamCtx(away.teamId, matches, m.stage);
  // Baseline: solo roster (sin disciplina). Updated: roster + disciplina.
  const base = predictMatch(home, away,
    { rosterScore: ctxA.rosterScore, disciplineScore: 1 },
    { rosterScore: ctxB.rosterScore, disciplineScore: 1 });
  const updated = predictMatch(home, away,
    { rosterScore: ctxA.rosterScore, disciplineScore: ctxA.disciplineScore },
    { rosterScore: ctxB.rosterScore, disciplineScore: ctxB.disciplineScore });
  return { base, updated, ctxA, ctxB, home, away,
    delta: {
      win: (updated.pWin - base.pWin) * 100,
      draw: (updated.pDraw - base.pDraw) * 100,
      loss: (updated.pLoss - base.pLoss) * 100,
      xg: updated.lambdaA - base.lambdaA,
    } };
}
function generateRosterAlerts(matchId, matches) {
  const m = MATCH_MAP[matchId];
  if (!m) return [];
  const recalc = recalculatePredictionAfterRosterUpdate(matchId, matches);
  const alerts = [];
  [["home", m.homeTeamId, recalc.ctxA], ["away", m.awayTeamId, recalc.ctxB]].forEach(([side, teamId, ctx]) => {
    const critical = detectCriticalAbsences(teamId, ctx.statuses);
    critical.forEach((s) => {
      const sev = s.impactLevel === "critical" ? "critical" : s.status === "doubtful" ? "high" : "high";
      alerts.push({
        matchId, teamId, playerId: s.playerId, playerName: s.playerName,
        alertType: "star_player_out", severity: sev,
        title: s.status === "doubtful" ? "Jugador clave en duda" : "Jugador clave fuera",
        message: "Un titular de alto impacto aparece afectado. La prediccion fue ajustada.",
        predictionImpact: {
          winProbabilityChange: side === "home" ? recalc.delta.win : recalc.delta.loss,
          expectedGoalsChange: side === "home" ? recalc.delta.xg : -recalc.delta.xg,
        },
        confidenceScore: s.confidenceScore,
        sourceName: s.sourceName, sourceUrl: s.sourceUrl,
        isPremium: true, createdAt: "2026-06-24T16:00:00Z",
      });
    });
  });
  return alerts;
}
function generateDisciplinaryAlerts(matchId, matches) {
  const m = MATCH_MAP[matchId];
  if (!m) return [];
  const recalc = recalculatePredictionAfterSuspension(matchId, matches);
  const alerts = [];
  [["home", m.homeTeamId, recalc.ctxA], ["away", m.awayTeamId, recalc.ctxB]].forEach(([side, teamId, ctx]) => {
    ctx.suspended.forEach((s) => {
      alerts.push({
        matchId, teamId, playerId: s.playerId, playerName: s.playerName,
        alertType: "suspended", severity: "high",
        title: "Jugador clave suspendido",
        message: "Este jugador esta suspendido para el proximo partido. La prediccion fue ajustada.",
        predictionImpact: {
          nextMatchRisk: "high",
          winProbabilityChangeIfSuspended: side === "home" ? recalc.delta.win : recalc.delta.loss,
          expectedGoalsChangeIfSuspended: side === "home" ? recalc.delta.xg : -recalc.delta.xg,
        },
        isPremium: true, createdAt: "2026-06-24T20:00:00Z",
      });
    });
    ctx.atRisk.forEach((s) => {
      alerts.push({
        matchId, teamId, playerId: s.playerId, playerName: s.playerName,
        alertType: "at_risk", severity: "medium",
        title: "Jugador clave apercibido",
        message: "Este jugador esta a una amarilla de suspension.",
        predictionImpact: { nextMatchRisk: "medium" },
        isPremium: true, createdAt: "2026-06-24T20:00:00Z",
      });
    });
  });
  return alerts;
}


export {
  normalizeRating, calculateRecentFormScore, calculateAttackScore, calculateDefenseScore,
  calculateTeamStrength, calculateExpectedGoals, poissonProbability, predictMatch,
  getGroupTeams, getGroupMatches, computeStandings, simulateGroup, simulateTournament,
  calculateYellowCardCount, calculateRedCardSuspension, getDisciplinaryWindow, shouldYellowCardsReset,
  isPlayerAtRiskOfSuspension, isPlayerSuspended, getSuspensionMatchesRemaining, getPlayerDisciplineStatuses,
  calculateDisciplinaryImpact, getPlayerStatuses, calculateInjuryImpact, calculateSuspensionImpact,
  detectCriticalAbsences, calculateRosterImpact, getPredictedLineup, getOfficialLineup, getLineupConfidence,
  comparePredictedVsOfficialLineup, getTeamGamesPlayed, isThirdMatchOrLater, canAccessBasicPrediction,
  canAccessAdvancedPrediction, canAccessRosterIntelligence, canAccessDisciplinaryIntelligence,
  canAccessTournamentSimulator, isGroupLocked, buildTeamCtx, recalculatePredictionAfterRosterUpdate,
  recalculatePredictionAfterSuspension, generateRosterAlerts, generateDisciplinaryAlerts,
};
