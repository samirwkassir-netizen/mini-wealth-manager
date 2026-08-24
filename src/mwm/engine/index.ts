import type { AppState, RiskLevel } from './types'
import { computeStanding } from './standing'
import { computeFlows } from './flows'
import { computeHumanCapital, defaultUplift } from './humanCapital'
import { computeRisk, RISK_LEVELS } from './risk'
import { blendedWeights, computeTiering, equityShare, growthWeights } from './policy'
import { historicalReturn } from './historical'
import { buildAllocation, outcomeBand } from './portfolio'
import { firstMoves } from './actions'

export * from './types'
export * from './fx'
export * from './standing'
export * from './flows'
export * from './humanCapital'
export * from './risk'
export * from './policy'
export * from './mvo'
export * from './historical'
export * from './portfolio'
export * from './stress'
export * from './actions'

export function analyse(state: AppState, upliftOverride?: number) {
  const standing = computeStanding(state.accounts)
  const flow = computeFlows(state.flows, standing)
  const risk = computeRisk(state.profile, state.flows, flow)

  const tiering = computeTiering(standing, flow, standing.fragility.score, state.flows.incomeStability)

  const uplift = upliftOverride ?? defaultUplift(flow.incomeUsd)
  const growth = growthWeights(risk.level, state.profile, standing.fragility.score)
  const weights = blendedWeights(tiering, growth)

  const allocation = buildAllocation(weights, tiering.investableUsd, state.profile, state.picks)
  const growthOnly = buildAllocation(growth, tiering.growthUsd, state.profile, state.picks)

  const human = computeHumanCapital(
    standing,
    flow,
    state.flows,
    allocation.stat.expectedReturn,
    tiering.bufferTargetMonths,
    uplift,
  )

  // Two views of each risk level: the whole plan including the cash buffer,
  // and the long-term sleeve on its own. The sleeve is the honest comparison,
  // because the buffer is identical whichever level you pick and flattens
  // the difference between them.
  const alternatives = RISK_LEVELS.map((level: RiskLevel) => {
    const g = growthWeights(level, state.profile, standing.fragility.score)
    const w = blendedWeights(tiering, g)
    return {
      level,
      sleeveWeights: g,
      allocation: buildAllocation(w, tiering.investableUsd, state.profile, state.picks),
      sleeve: buildAllocation(g, tiering.growthUsd, state.profile, state.picks),
      historical: historicalReturn(g),
      equityPct: equityShare(g),
    }
  })

  const actions = firstMoves(state, standing, flow, tiering, human)
  const band = outcomeBand(allocation.stat, tiering.investableUsd)

  return { standing, flow, risk, tiering, growth, weights, allocation, growthOnly, human, alternatives, actions, band }
}

export type Analysis = ReturnType<typeof analyse>
