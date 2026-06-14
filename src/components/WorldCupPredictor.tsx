"use client";
/* ============================================================
   WorldCupPredictor — UI en TailwindCSS. Toda la lógica viene de
   src/models; los datos de src/data; helpers de src/utils.
   Datos MOCK, sin pagos reales, sin tokens en el cliente.
   ============================================================ */
import React, { useMemo, useState } from "react";
import {
  Trophy, Activity, BarChart3, Calendar, Cpu, Database, Zap, Shield,
  HeartPulse, CreditCard, Bell, ListChecks, CheckCircle2, AlertTriangle,
  UserX, ShieldAlert, TrendingUp, Crown, Info, Users,
} from "lucide-react";
import {
  TEAMS, MATCHES, TEAM_MAP, MATCH_MAP, GROUP_ORDER, FEATURED, CARDS,
  PAYWALL_MSG, DISCLAIMER, DISC_DISCLAIMER,
} from "@/data";
import {
  predictMatch, computeStandings, getGroupTeams, simulateGroup, simulateTournament,
  getTeamGamesPlayed, isThirdMatchOrLater, isGroupLocked,
  canAccessBasicPrediction, canAccessAdvancedPrediction, canAccessRosterIntelligence,
  canAccessDisciplinaryIntelligence, canAccessTournamentSimulator,
  getPlayerStatuses, calculateRosterImpact, detectCriticalAbsences,
  getPredictedLineup, getOfficialLineup, comparePredictedVsOfficialLineup,
  recalculatePredictionAfterRosterUpdate, generateRosterAlerts,
  getPlayerDisciplineStatuses, calculateDisciplinaryImpact,
  recalculatePredictionAfterSuspension, generateDisciplinaryAlerts,
} from "@/models";
import { pct, signed, cn } from "@/utils";
import type { User } from "@/types";
import {
  MockTag, DemoBanner, SeverityChip, Flag, ProbBar, PremiumToggle, PaywallGate,
} from "@/components/ui";

const TABS: [string, string, any][] = [
  ["dashboard", "Dashboard", BarChart3],
  ["partido", "Partido", Zap],
  ["grupos", "Grupos", Trophy],
  ["simulador", "Simulador", Cpu],
  ["datos", "Datos", Database],
  ["pruebas", "Pruebas", ListChecks],
];

const teamName = (id: string) => TEAM_MAP[id]?.name ?? id;

/* ---------------- DASHBOARD ---------------- */
function Dashboard({ user, onActivate }: { user: User; onActivate: () => void }) {
  const scheduled = MATCHES.filter((m) => m.status !== "finished");
  const finished = MATCHES.filter((m) => m.status === "finished").slice(-5).reverse();
  const featuredNext = scheduled
    .filter((m) => FEATURED.includes(m.homeTeamId) || FEATURED.includes(m.awayTeamId))
    .slice(0, 3);

  const swings = useMemo(() => {
    return scheduled
      .filter((m) => FEATURED.includes(m.homeTeamId) && FEATURED.includes(m.awayTeamId))
      .map((m) => {
        const r = recalculatePredictionAfterRosterUpdate(m.matchId, MATCHES);
        return r ? { m, mag: Math.abs(r.delta.win) + Math.abs(r.delta.xg) * 50, delta: r.delta } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.mag - a.mag)
      .slice(0, 3) as any[];
  }, [scheduled]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card lg:col-span-2">
        <div className="card-head"><h3><Zap size={16} /> Partidos destacados</h3><MockTag /></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featuredNext.map((m) => {
            const a = TEAM_MAP[m.homeTeamId], b = TEAM_MAP[m.awayTeamId];
            const p = predictMatch(a, b);
            const allowed = canAccessBasicPrediction(user, m, MATCHES);
            return (
              <div key={m.matchId} className="rounded-card border border-line bg-panel2 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted">
                  <span>Grupo {m.group} · J{m.matchday}</span><span>{m.date}</span>
                </div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold"><Flag id={m.homeTeamId} /> {a.name}</span>
                  <span className="text-xs text-muted">vs</span>
                  <span className="flex items-center gap-2 text-sm font-semibold">{b.name} <Flag id={m.awayTeamId} /></span>
                </div>
                {allowed
                  ? <ProbBar pWin={p.pWin} pDraw={p.pDraw} pLoss={p.pLoss} labelA={a.teamId} labelB={b.teamId} />
                  : <button onClick={onActivate} className="btn btn-ghost w-full text-xs">Predicción Premium · desbloquear</button>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h3><Calendar size={16} /> Próximos partidos</h3><MockTag /></div>
        <ul className="space-y-2 text-sm">
          {scheduled.slice(0, 6).map((m) => (
            <li key={m.matchId} className="flex items-center justify-between rounded-lg bg-panel2 px-3 py-2">
              <span>{teamName(m.homeTeamId)} <span className="text-muted">vs</span> {teamName(m.awayTeamId)}</span>
              <span className="text-xs text-muted">{m.date}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="card-head"><h3><Activity size={16} /> Resultados recientes</h3><MockTag /></div>
        <ul className="space-y-2 text-sm">
          {finished.map((m) => (
            <li key={m.matchId} className="flex items-center justify-between rounded-lg bg-panel2 px-3 py-2">
              <span>{teamName(m.homeTeamId)} <span className="text-muted">vs</span> {teamName(m.awayTeamId)}</span>
              <span className="font-display font-bold">{m.homeScore}–{m.awayScore}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card lg:col-span-2">
        <div className="card-head"><h3><TrendingUp size={16} /> Partidos con mayor cambio de predicción</h3><MockTag /></div>
        {swings.length === 0 ? <p className="text-sm text-muted">Sin cambios relevantes en los partidos destacados.</p> : (
          <ul className="space-y-2">
            {swings.map(({ m, delta }) => (
              <li key={m.matchId} className="flex items-center justify-between rounded-lg bg-panel2 px-3 py-2 text-sm">
                <span>{teamName(m.homeTeamId)} vs {teamName(m.awayTeamId)}</span>
                <span className="text-xs text-muted">victoria {signed(delta.win)}pp · xG {signed(delta.xg, 2)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------- PARTIDO ---------------- */
function PredictionCard({ a, b, p }: { a: any; b: any; p: any }) {
  return (
    <div className="card">
      <div className="card-head"><h3><BarChart3 size={16} /> Predicción del partido</h3><MockTag /></div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2"><Flag id={a.teamId} /><span className="font-display text-lg font-semibold">{a.name}</span></div>
        <span className="text-xs text-muted">xG {p.lambdaA.toFixed(2)} – {p.lambdaB.toFixed(2)}</span>
        <div className="flex items-center gap-2"><span className="font-display text-lg font-semibold">{b.name}</span><Flag id={b.teamId} /></div>
      </div>
      <ProbBar pWin={p.pWin} pDraw={p.pDraw} pLoss={p.pLoss} labelA={a.teamId} labelB={b.teamId} />
      <div className="mt-3 flex flex-wrap gap-2">
        {p.topScores.slice(0, 4).map((s: any) => (
          <span key={s.score} className="chip chip-muted">{s.score} · {pct(s.prob)}</span>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">{p.explanation}</p>
    </div>
  );
}

function RosterPanel({ teamId, matchId, user, onActivate }:
  { teamId: string; matchId: string; user: User; onActivate: () => void }) {
  const statuses = getPlayerStatuses(teamId);
  const injured = statuses.filter((s: any) => s.status === "injured" || s.status === "unavailable");
  const doubtful = statuses.filter((s: any) => s.status === "doubtful");
  const allowed = canAccessRosterIntelligence(user);

  if (statuses.length === 0)
    return <div className="card"><div className="card-head"><h3><HeartPulse size={16} /> Roster · {teamName(teamId)}</h3><MockTag /></div>
      <p className="text-sm text-muted">Sin datos de roster en la demo (solo equipos destacados).</p></div>;

  const impact = calculateRosterImpact(teamId, statuses);
  const critical = detectCriticalAbsences(teamId, statuses);

  return (
    <div className="card">
      <div className="card-head"><h3><HeartPulse size={16} /> Roster · {teamName(teamId)}</h3><MockTag /></div>
      <div className="subhead"><Info size={13} /> Estado básico (gratis)</div>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <span className="chip chip-red">{injured.length} lesionados/baja</span>
        <span className="chip chip-gold">{doubtful.length} en duda</span>
        <span className="chip chip-green">{statuses.length} seguidos</span>
      </div>
      <PaywallGate allowed={allowed} message={PAYWALL_MSG.roster} onActivate={onActivate}>
        <div className="subhead"><Crown size={13} /> Impacto avanzado (Premium)</div>
        <div className="mb-2 text-sm">Índice de roster: <b>{impact.rosterScore.toFixed(3)}</b> <span className="text-muted">(1 = sin impacto)</span></div>
        {critical.length > 0 && (
          <ul className="space-y-1 text-sm">
            {critical.map((s: any) => (
              <li key={s.playerId} className="flex items-center justify-between rounded bg-panel2 px-2.5 py-1.5">
                <span>{s.playerName} <span className="text-muted">· {s.position}</span></span>
                <SeverityChip level={s.impactLevel}>{s.status}</SeverityChip>
              </li>
            ))}
          </ul>
        )}
      </PaywallGate>
    </div>
  );
}

function DisciplinaryPanel({ teamId, user, onActivate }:
  { teamId: string; user: User; onActivate: () => void }) {
  const statuses = getPlayerDisciplineStatuses(teamId, CARDS, "group");
  const allowed = canAccessDisciplinaryIntelligence(user);
  const totalYellows = statuses.reduce((n: number, s: any) => n + (s.yellowCardsGroupStage || 0), 0);
  const totalReds = statuses.reduce((n: number, s: any) => n + (s.redCards || 0), 0);
  const impact = calculateDisciplinaryImpact(teamId, statuses);

  return (
    <div className="card">
      <div className="card-head"><h3><CreditCard size={16} /> Disciplina · {teamName(teamId)}</h3><MockTag /></div>
      <div className="subhead"><Info size={13} /> Conteo básico (gratis)</div>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <span className="chip chip-gold">{totalYellows} amarillas</span>
        <span className="chip chip-red">{totalReds} rojas</span>
      </div>
      <PaywallGate allowed={allowed} message={PAYWALL_MSG.cards} onActivate={onActivate}>
        <div className="subhead"><Crown size={13} /> Riesgo e impacto (Premium)</div>
        <div className="mb-2 text-sm">Índice disciplinario: <b>{impact.disciplineScore.toFixed(3)}</b></div>
        {statuses.filter((s: any) => s.isSuspended || s.atRiskOfSuspension).length === 0
          ? <p className="text-sm text-muted">Sin suspendidos ni apercibidos.</p>
          : <ul className="space-y-1 text-sm">
              {statuses.filter((s: any) => s.isSuspended || s.atRiskOfSuspension).map((s: any) => (
                <li key={s.playerId} className="flex items-center justify-between rounded bg-panel2 px-2.5 py-1.5">
                  <span>{s.playerName}</span>
                  {s.isSuspended
                    ? <SeverityChip level="critical">Suspendido ({s.suspensionMatchesRemaining})</SeverityChip>
                    : <SeverityChip level="medium">Apercibido</SeverityChip>}
                </li>
              ))}
            </ul>}
      </PaywallGate>
    </div>
  );
}

function LineupCompare({ matchId, teamId }: { matchId: string; teamId: string }) {
  const predicted = getPredictedLineup(matchId, teamId);
  const official = getOfficialLineup(matchId, teamId);
  const cmp = comparePredictedVsOfficialLineup(predicted, official);
  return (
    <div className="card">
      <div className="card-head"><h3><Users size={16} /> Alineación · {teamName(teamId)}</h3><MockTag /></div>
      <div className="mb-2 text-xs text-muted">Formación {predicted.formation} · confianza {pct(predicted.confidenceScore)}</div>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {predicted.players.slice(0, 11).map((pl: any) => (
          <span key={pl.playerId} className={cn("rounded bg-panel2 px-2 py-1", pl.status === "doubtful" && "text-gold")}>
            {pl.playerName}
          </span>
        ))}
      </div>
      <div className="mt-2 text-xs text-muted">
        {cmp.available ? `Cambios vs oficial: ${cmp.changeCount}` : "Alineación oficial pendiente"}
      </div>
    </div>
  );
}

function MatchAnalysis({ user, onActivate }: { user: User; onActivate: () => void }) {
  const scheduled = MATCHES.filter((m) => m.status !== "finished");
  const defaultId = (scheduled.find((m) => !isThirdMatchOrLater(m, MATCHES)) ?? scheduled[0]).matchId;
  const [matchId, setMatchId] = useState(defaultId);
  const m = MATCH_MAP[matchId];
  const a = TEAM_MAP[m.homeTeamId], b = TEAM_MAP[m.awayTeamId];
  const p = predictMatch(a, b);
  const canBasic = canAccessBasicPrediction(user, m, MATCHES);

  const rosterAlerts = generateRosterAlerts(matchId, MATCHES);
  const discAlerts = generateDisciplinaryAlerts(matchId, MATCHES);

  return (
    <div className="space-y-4">
      <div className="card">
        <label className="subhead">Selecciona partido</label>
        <select value={matchId} onChange={(e) => setMatchId(e.target.value)}
          className="w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-sm">
          {scheduled.map((mm) => (
            <option key={mm.matchId} value={mm.matchId}>
              {teamName(mm.homeTeamId)} vs {teamName(mm.awayTeamId)} · G{mm.group} J{mm.matchday}
              {isThirdMatchOrLater(mm, MATCHES) ? " (Premium)" : ""}
            </option>
          ))}
        </select>
      </div>

      <PaywallGate allowed={canBasic} message={PAYWALL_MSG.thirdMatch} onActivate={onActivate}>
        <PredictionCard a={a} b={b} p={p} />
      </PaywallGate>

      {(rosterAlerts.length > 0 || discAlerts.length > 0) && (
        <div className="card border-gold/30">
          <div className="card-head"><h3><Bell size={16} /> Alertas que ajustaron la predicción</h3><MockTag /></div>
          <ul className="space-y-2 text-sm">
            {rosterAlerts.map((al: any, i: number) => (
              <li key={`r${i}`} className="flex items-center justify-between rounded bg-panel2 px-3 py-2">
                <span><b>{teamName(al.teamId)}</b> · {al.title}: {al.playerName}</span>
                <SeverityChip level={al.severity}>victoria {signed(al.predictionImpact.winProbabilityChange)}pp</SeverityChip>
              </li>
            ))}
            {discAlerts.map((al: any, i: number) => (
              <li key={`d${i}`} className="flex items-center justify-between rounded bg-panel2 px-3 py-2">
                <span><b>{teamName(al.teamId)}</b> · {al.title}: {al.playerName}</span>
                <SeverityChip level={al.severity}>
                  {al.predictionImpact?.winProbabilityChangeIfSuspended != null
                    ? `victoria ${signed(al.predictionImpact.winProbabilityChangeIfSuspended)}pp` : "riesgo"}
                </SeverityChip>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <RosterPanel teamId={a.teamId} matchId={matchId} user={user} onActivate={onActivate} />
        <RosterPanel teamId={b.teamId} matchId={matchId} user={user} onActivate={onActivate} />
        <DisciplinaryPanel teamId={a.teamId} user={user} onActivate={onActivate} />
        <DisciplinaryPanel teamId={b.teamId} user={user} onActivate={onActivate} />
        <LineupCompare matchId={matchId} teamId={a.teamId} />
        <LineupCompare matchId={matchId} teamId={b.teamId} />
      </div>
    </div>
  );
}

/* ---------------- GRUPOS ---------------- */
function GroupTable({ groupId, user, onActivate }: { groupId: string; user: User; onActivate: () => void }) {
  const teams = getGroupTeams(groupId);
  const rows = computeStandings(groupId, MATCHES);
  const locked = isGroupLocked(groupId, teams, MATCHES);
  const showSim = canAccessTournamentSimulator(user);
  const sim = useMemo(() => (showSim ? simulateGroup(groupId, MATCHES, 800) : null), [groupId, showSim]);
  return (
    <div className="card">
      <div className="card-head">
        <h3>Grupo {groupId}</h3>
        <div className="flex items-center gap-2">
          {locked ? <span className="chip chip-gold">Cerrado</span> : <span className="chip chip-green">Abierto</span>}
          <MockTag />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-muted">
            <th className="py-1">Equipo</th><th>PJ</th><th>DG</th><th>Pts</th>
            {showSim && <th>Clasif.</th>}
          </tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.teamId} className="border-t border-line">
                <td className="py-1.5 font-medium">{teamName(r.teamId)}</td>
                <td>{r.pj}</td><td>{signed(r.dg, 0)}</td><td className="font-bold">{r.pts}</td>
                {showSim && <td>{sim ? pct((sim as any)[r.teamId]?.qualifyProb ?? 0) : "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!showSim && (
        <button onClick={onActivate} className="btn btn-ghost mt-3 w-full text-xs">
          Probabilidad de clasificación · Premium
        </button>
      )}
    </div>
  );
}

/* ---------------- SIMULADOR ---------------- */
function Simulator({ user, onActivate }: { user: User; onActivate: () => void }) {
  const allowed = canAccessTournamentSimulator(user);
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="card">
      <div className="card-head"><h3><Cpu size={16} /> Simulador de campeón</h3><MockTag /></div>
      <PaywallGate allowed={allowed} message={PAYWALL_MSG.simulator} onActivate={onActivate}>
        <button className="btn btn-gold" disabled={busy}
          onClick={() => { setBusy(true); setTimeout(() => { setRes(simulateTournament(MATCHES, 800)); setBusy(false); }, 30); }}>
          <Cpu size={15} /> {busy ? "Simulando…" : "Simular torneo (Monte Carlo)"}
        </button>
        {res && (
          <ul className="mt-3 space-y-1 text-sm">
            {res.slice(0, 8).map((row: any) => (
              <li key={row.teamId} className="flex items-center justify-between rounded bg-panel2 px-3 py-1.5">
                <span className="flex items-center gap-2"><Flag id={row.teamId} /> {row.name}</span>
                <b className="font-display">{pct(row.champ)}</b>
              </li>
            ))}
          </ul>
        )}
      </PaywallGate>
    </div>
  );
}

/* ---------------- DATOS (Apify) ---------------- */
function DataView() {
  const actors = [
    ["CalendarResultsActor", "Calendario y resultados"],
    ["TeamRatingsActor", "Ratings y forma"],
    ["RosterActor", "Roster y lesiones"],
    ["DisciplinaryActor", "Tarjetas y sanciones"],
  ];
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-head"><h3><Database size={16} /> Estado de los Apify Actors</h3><MockTag /></div>
        <ul className="space-y-2 text-sm">
          {actors.map(([name, desc]) => (
            <li key={name} className="flex items-center justify-between rounded-lg bg-panel2 px-3 py-2">
              <span><b>{name}</b> <span className="text-muted">· {desc}</span></span>
              <span className="chip chip-muted">simulado</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card text-xs leading-relaxed text-muted">
        <p className="mb-1 flex items-center gap-1.5 text-ink"><Shield size={13} /> Avisos</p>
        <p>{DISCLAIMER}</p>
        <p className="mt-1">{DISC_DISCLAIMER}</p>
      </div>
    </div>
  );
}

/* ---------------- PRUEBAS (QA) ---------------- */
function QAPanel() {
  const cases = useMemo(() => {
    const free: User = { isPremiumUser: false, subscriptionStatus: "free" };
    const prem: User = { isPremiumUser: true, subscriptionStatus: "active" };
    const md1 = MATCH_MAP["E1"], md2 = MATCH_MAP["E3"], md3 = MATCH_MAP["C5"];
    const rR = recalculatePredictionAfterRosterUpdate("C5", MATCHES);
    const rS = recalculatePredictionAfterSuspension("C5", MATCHES);
    const p = predictMatch(TEAM_MAP["BRA"], TEAM_MAP["SCO"]);
    return [
      ["1. Free ve básica en partido 1", canAccessBasicPrediction(free, md1, MATCHES) === true],
      ["2. Free ve básica en partido 2", canAccessBasicPrediction(free, md2, MATCHES) === true],
      ["3. Free bloqueado desde partido 3", canAccessAdvancedPrediction(free, md3, MATCHES) === false],
      ["4. Premium ve todo", canAccessAdvancedPrediction(prem, md3, MATCHES) && canAccessTournamentSimulator(prem)],
      ["5. Simulador es Premium", canAccessTournamentSimulator(free) === false],
      ["6. Tarjetas básicas gratis", CARDS.filter((c: any) => c.matchId === "C1").length > 0],
      ["7. Impacto de tarjetas Premium", canAccessDisciplinaryIntelligence(free) === false],
      ["8. Lesiones avanzadas Premium", canAccessRosterIntelligence(free) === false],
      ["9. Lesión clave cambia predicción", rR ? Math.abs(rR.delta.win) > 0.05 : false],
      ["10. Suspensión clave cambia predicción", rS ? Math.abs(rS.delta.win) > 0.01 : false],
      ["11. Grupo no se bloquea con <2 PJ", isGroupLocked("E", getGroupTeams("E"), MATCHES) === false],
      ["12. Grupo se bloquea con 2 PJ", isGroupLocked("C", getGroupTeams("C"), MATCHES) === true],
      ["Extra. Probabilidades suman ~1", p.pWin + p.pDraw + p.pLoss > 0.98 && p.pWin + p.pDraw + p.pLoss < 1.02],
    ] as [string, boolean][];
  }, []);
  const passed = cases.filter(([, ok]) => ok).length;
  return (
    <div className="card">
      <div className="card-head">
        <h3><ListChecks size={16} /> Pruebas de negocio</h3>
        <span className={cn("chip", passed === cases.length ? "chip-green" : "chip-red")}>{passed}/{cases.length}</span>
      </div>
      <ul className="space-y-1.5 text-sm">
        {cases.map(([label, ok]) => (
          <li key={label} className="flex items-center gap-2">
            {ok ? <CheckCircle2 size={15} className="text-green" /> : <AlertTriangle size={15} className="text-red" />}
            <span className={ok ? "" : "text-red"}>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- APP ---------------- */
export default function WorldCupPredictor() {
  const [tab, setTab] = useState("dashboard");
  const [user, setUser] = useState<User>({ isPremiumUser: false, subscriptionStatus: "free" });
  const activate = () => setUser((u) => ({ ...u, isPremiumUser: true, subscriptionStatus: "premium_demo" }));

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green/15 p-2 text-green"><Trophy size={20} /></div>
          <div>
            <div className="font-display text-xl font-bold tracking-wide">World Cup 2026 <span className="text-green">Predictor</span></div>
            <div className="hidden text-xs text-muted sm:block">Inteligencia futbolística · probabilidades basadas en datos</div>
          </div>
        </div>
        <PremiumToggle user={user} setUser={setUser} />
      </header>

      <DemoBanner />

      <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 sm:px-6">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={cn("tab", tab === id && "tab-active")}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        {tab === "dashboard" && <Dashboard user={user} onActivate={activate} />}
        {tab === "partido" && <MatchAnalysis user={user} onActivate={activate} />}
        {tab === "grupos" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {GROUP_ORDER.map((g: string) => <GroupTable key={g} groupId={g} user={user} onActivate={activate} />)}
          </div>
        )}
        {tab === "simulador" && <Simulator user={user} onActivate={activate} />}
        {tab === "datos" && <DataView />}
        {tab === "pruebas" && <QAPanel />}
      </main>

      <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted sm:px-6">
        <p>Datos simulados con fines de demostración. No es asesoría de apuestas.</p>
      </footer>
    </div>
  );
}
