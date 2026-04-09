import type { Demand } from '@/types/ouvidoria';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  /** Score total: 0-100 */
  total: number;
  /** Urgência de prazo: 0-40 */
  prazo: number;
  /** Prioridade declarada: 0-30 */
  prioridade: number;
  /** Gravidade do tipo: 0-20 */
  gravidade: number;
  /** Reincidência: 0-10 */
  reincidencia: number;
}

export type ScoreBand = 'baixo' | 'medio' | 'alto' | 'critico';

// ─── Componentes do score ─────────────────────────────────────────────────────

/**
 * Urgência de prazo (0-40 pts)
 * Quanto menos dias restantes, maior a urgência.
 */
function scorePrazo(daysRemaining: number): number {
  if (daysRemaining <= 0)  return 40; // vencida
  if (daysRemaining <= 1)  return 35;
  if (daysRemaining <= 3)  return 25;
  if (daysRemaining <= 7)  return 15;
  if (daysRemaining <= 15) return 5;
  return 0;
}

/**
 * Prioridade declarada pelo atendente (0-30 pts)
 */
function scorePrioridade(priority: string): number {
  const map: Record<string, number> = {
    urgente: 30,
    alta:    20,
    media:   10,
    baixa:   0,
  };
  return map[priority] ?? 0;
}

/**
 * Gravidade com base no tipo da manifestação (0-20 pts)
 * Denúncia e reclamação têm maior peso por implicarem dano direto ao cidadão.
 */
function scoreGravidade(type: string): number {
  const map: Record<string, number> = {
    denuncia:   20,
    reclamacao: 15,
    solicitacao: 8,
    sugestao:    3,
    elogio:      0,
  };
  return map[type] ?? 0;
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Calcula o score de priorização de uma demanda (0-100).
 *
 * Critérios:
 * - Urgência de prazo   : 0-40 pts
 * - Prioridade declarada: 0-30 pts
 * - Gravidade do tipo   : 0-20 pts
 * - Reincidência        : 0-10 pts
 */
export function calcScore(demand: Demand): ScoreBreakdown {
  const prazo       = scorePrazo(demand.daysRemaining);
  const prioridade  = scorePrioridade(demand.priority);
  const gravidade   = scoreGravidade(demand.type);
  const reincidencia = demand.conversaAtiva?.recorrente ? 10 : 0;

  return {
    total: prazo + prioridade + gravidade + reincidencia,
    prazo,
    prioridade,
    gravidade,
    reincidencia,
  };
}

// ─── Faixa de criticidade ─────────────────────────────────────────────────────

export function getScoreBand(score: number): ScoreBand {
  if (score >= 76) return 'critico';
  if (score >= 51) return 'alto';
  if (score >= 26) return 'medio';
  return 'baixo';
}

export const SCORE_BAND_LABEL: Record<ScoreBand, string> = {
  baixo:   'Baixo',
  medio:   'Médio',
  alto:    'Alto',
  critico: 'Crítico',
};

export const SCORE_BAND_CLASS: Record<ScoreBand, string> = {
  baixo:   'bg-green-100 text-green-700',
  medio:   'bg-yellow-100 text-yellow-700',
  alto:    'bg-orange-100 text-orange-700',
  critico: 'bg-red-100 text-red-700',
};

// ─── Tooltip descritivo ───────────────────────────────────────────────────────

export function scoreTooltip(s: ScoreBreakdown): string {
  return [
    `Score total: ${s.total}/100`,
    `• Prazo:        ${s.prazo}/40`,
    `• Prioridade:   ${s.prioridade}/30`,
    `• Gravidade:    ${s.gravidade}/20`,
    `• Reincidência: ${s.reincidencia}/10`,
  ].join('\n');
}
