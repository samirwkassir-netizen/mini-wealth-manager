import scenarioData from '../data/scenarios.json'
import type { AssetKey, Weights } from './types'
import { ASSET_KEYS } from './policy'
import { assetMeta } from './mvo'

export interface ScenarioLine {
  key: string
  figure: string
  measures: string
  source: string | null
  verified: boolean
}

export interface Scenario {
  id: string
  name: string
  kind: 'historical' | 'hypothetical'
  period: string
  summary: string
  headline: string
  headlineSource: string | null
  inflation?: number
  purchasingPowerShock?: number
  editable?: boolean
  shocks: Record<string, number>
  lines: ScenarioLine[]
}

export const SCENARIOS = scenarioData.scenarios as Scenario[]
export const SCENARIO_META = scenarioData.meta

export interface StressResult {
  scenarioId: string
  portfolioPct: number
  portfolioUsd: number
  afterUsd: number
  realPct: number | null
  contributions: { key: AssetKey; label: string; weight: number; shock: number; contribution: number; verified: boolean }[]
  monthsOfSpendLost: number
  yearsToRecover: number
  worstLine: { label: string; shock: number } | null
}

export function applyScenario(
  weights: Weights,
  shocks: Record<string, number>,
  amountUsd: number,
  monthlySpendUsd: number,
  expectedReturnPct: number,
  scenario: Scenario,
): StressResult {
  const lineByKey = new Map(scenario.lines.map((l) => [l.key, l]))

  const contributions = ASSET_KEYS.filter((k) => weights[k] > 0.05).map((k) => {
    const shock = shocks[k] ?? 0
    return {
      key: k,
      label: assetMeta(k).label,
      weight: weights[k],
      shock,
      contribution: (weights[k] / 100) * shock,
      verified: lineByKey.get(k)?.verified ?? false,
    }
  })

  const portfolioPct = contributions.reduce((s, c) => s + c.contribution, 0)
  const portfolioUsd = (amountUsd * portfolioPct) / 100
  const afterUsd = amountUsd + portfolioUsd

  const inflation = scenario.inflation ?? 0
  const realPct = inflation ? ((1 + portfolioPct / 100) / (1 + inflation / 100) - 1) * 100 : null

  const r = expectedReturnPct / 100
  const yearsToRecover =
    portfolioPct < 0 && r > 0 ? Math.log(1 / (1 + portfolioPct / 100)) / Math.log(1 + r) : 0

  const losses = contributions.filter((c) => c.shock < 0)
  const worst = losses.length ? losses.reduce((a, b) => (b.shock < a.shock ? b : a)) : null

  return {
    scenarioId: scenario.id,
    portfolioPct,
    portfolioUsd,
    afterUsd,
    realPct,
    contributions,
    monthsOfSpendLost: monthlySpendUsd > 0 ? Math.abs(portfolioUsd) / monthlySpendUsd : 0,
    yearsToRecover,
    worstLine: worst ? { label: worst.label, shock: worst.shock } : null,
  }
}

/**
 * The other stress test, and the one no mainstream tool runs: what if the
 * money you already marked as hard to reach is worth less than its face value?
 * The number is yours to set. This tool has no view on it.
 */
export function haircutRestricted(restrictedUsd: number, totalUsd: number, recoveryPct: number) {
  const recovered = (restrictedUsd * recoveryPct) / 100
  const lost = restrictedUsd - recovered
  return {
    recovered,
    lost,
    newTotal: totalUsd - lost,
    lossPctOfNetWorth: totalUsd > 0 ? (lost / totalUsd) * 100 : 0,
  }
}
