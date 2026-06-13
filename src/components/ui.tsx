"use client";
import React from "react";
import { Database, Lock, Crown, Sparkles } from "lucide-react";
import { roundPercents, cn } from "@/utils";
import type { ImpactLevel, User } from "@/types";

export function MockTag() {
  return <span className="mock-tag"><Database size={10} /> DATOS MOCK</span>;
}

export function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-gold to-[#e0a32b] px-4 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-bg">
      <Database size={13} /> Modo demo · datos simulados (no son resultados, alineaciones ni sanciones reales)
    </div>
  );
}

const SEV: Record<ImpactLevel, string> = {
  low: "chip-muted", medium: "chip-blue", high: "chip-gold", critical: "chip-red",
};
export function SeverityChip({ level, children }: { level: ImpactLevel; children: React.ReactNode }) {
  return <span className={cn("chip", SEV[level] ?? "chip-muted")}>{children}</span>;
}

export function Flag({ id }: { id: string }) {
  return (
    <span className="inline-flex h-6 w-9 items-center justify-center rounded bg-white/8 text-[11px] font-bold text-ink/90 ring-1 ring-line">
      {id}
    </span>
  );
}

export function ProbBar({ pWin, pDraw, pLoss, labelA, labelB }:
  { pWin: number; pDraw: number; pLoss: number; labelA: string; labelB: string }) {
  const [w, d, l] = roundPercents([pWin, pDraw, pLoss]); // siempre suman 100
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        <div className="bg-green" style={{ width: `${w}%` }} title={`${labelA}: ${w}%`} />
        <div className="bg-muted/60" style={{ width: `${d}%` }} title={`Empate: ${d}%`} />
        <div className="bg-red" style={{ width: `${l}%` }} title={`${labelB}: ${l}%`} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-green" />{labelA} <b className="text-ink">{w}%</b></span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-muted/60" />Empate <b className="text-ink">{d}%</b></span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red" />{labelB} <b className="text-ink">{l}%</b></span>
      </div>
    </div>
  );
}

export function PremiumToggle({ user, setUser }:
  { user: User; setUser: React.Dispatch<React.SetStateAction<User>> }) {
  const on = user.isPremiumUser;
  return (
    <button
      onClick={() => setUser((u) => ({
        ...u, isPremiumUser: !u.isPremiumUser,
        subscriptionStatus: !u.isPremiumUser ? "premium_demo" : "free",
      }))}
      className={cn("btn", on ? "btn-gold" : "btn-ghost")}
      title="Alterna el estado Premium (solo demo, sin pago real)"
    >
      {on ? <Crown size={15} /> : <Sparkles size={15} />}
      {on ? "Premium activo (demo)" : "Activar Premium (demo)"}
    </button>
  );
}

/** Compuerta de contenido Premium. Muestra el contenido o un teaser bloqueado. */
export function PaywallGate({ allowed, message, onActivate, children }:
  { allowed: boolean; message: string; onActivate: () => void; children: React.ReactNode }) {
  if (allowed) return <>{children}</>;
  return (
    <div className="relative overflow-hidden rounded-card border border-gold/30 bg-panel2 p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-gold/15 p-2 text-gold"><Lock size={18} /></div>
        <div className="flex-1">
          <div className="font-display text-base font-semibold text-gold">Contenido Premium</div>
          <p className="mt-1 text-sm text-muted">{message}</p>
          <button onClick={onActivate} className="btn btn-gold mt-3">
            <Crown size={15} /> Desbloquear Premium (demo)
          </button>
        </div>
      </div>
    </div>
  );
}
