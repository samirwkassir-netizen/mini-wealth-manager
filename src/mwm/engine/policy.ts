import type { AssetKey, FlowResult, Profile, RiskLevel, Standing, Tiering, Weights } from './types'

export const ASSET_KEYS: AssetKey[] = [
  'cash',
  'shortGov',
  'globalBonds',
  'tips',
  'globalEquity',
  'emEquity',
  'property',
  'gold',
]

const zero = (): Weights => ({
  cash: 0,
  shortGov: 0,
  globalBonds: 0,
  tips: 0,
  globalEquity: 0,
  emEquity: 0,
  property: 0,
  gold: 0,
})

/**
 * Base weights for the growth tier only, before any adjustment.
 * These are a policy, not an optimiser output. They are round numbers on
 * purpose: an allocation stated to one decimal place implies a precision
 * the underlying assumptions do not have.
 */
export const BASE: Record<RiskLevel, Weights> = {
  Cautious: { globalEquity: 18, emEquity: 3, property: 4, globalBonds: 30, tips: 15, shortGov: 20, cash: 10, gold: 0 },
  Balanced: { globalEquity: 42, emEquity: 10, property: 8, globalBonds: 20, tips: 8, shortGov: 9, cash: 3, gold: 0 },
  Growth: { globalEquity: 56, emEquity: 24, property: 16, globalBonds: 2, tips: 0, shortGov: 2, cash: 0, gold: 0 },
}

/** Share of the sleeve in things that can halve. Used in plain-English copy. */
export function equityShare(w: Weights): number {
  return w.globalEquity + w.emEquity + w.property
}

/**
 * How many months of spending should sit in reachable, boring money.
 * Three is the floor everyone gets. The rest is earned by fragility:
 * money you cannot move, money you cannot reach, everything in one place,
 * or a currency that has repriced before.
 */
export function bufferMonths(fragilityScore: number, incomeStability: string): number {
  const base = 3 + (fragilityScore / 100) * 6
  const stability = incomeStability === 'none' ? 3 : incomeStability === 'irregular' ? 2 : 0
  return Math.max(3, Math.min(12, Math.round(base + stability)))
}

/**
 * Gold is not sized by how brave you feel. It is sized by how much of your
 * wealth depends on an institution keeping a promise. That is the one place
 * where this tool deliberately departs from the standard model, and it is
 * the reason the tool exists.
 */
export function goldWeight(fragilityScore: number): number {
  if (fragilityScore < 10) return 0
  return Math.max(3, Math.min(10, Math.round((fragilityScore / 100) * 10)))
}

export function computeTiering(
  standing: Standing,
  flow: FlowResult,
  fragilityScore: number,
  incomeStability: string,
): Tiering {
  const investableUsd = standing.deployableUsd
  const bufferTargetMonths = bufferMonths(fragilityScore, incomeStability)
  const bufferNeed = flow.spendUsd * bufferTargetMonths

  const safetyUsd = Math.min(investableUsd, bufferNeed)
  const shortfallUsd = Math.max(0, bufferNeed - investableUsd)

  const afterSafety = Math.max(0, investableUsd - safetyUsd)
  const shortGoalsNeed = flow.goals.filter((g) => g.months <= 36).reduce((s, g) => s + g.usd, 0)
  const shortGoalsUsd = Math.min(afterSafety, shortGoalsNeed)

  const growthUsd = Math.max(0, afterSafety - shortGoalsUsd)

  return { bufferTargetMonths, safetyUsd, shortGoalsUsd, growthUsd, investableUsd, shortfallUsd }
}

/** Growth-tier weights after the gold sizing, the tilt and the property toggle. */
export function growthWeights(level: RiskLevel, profile: Profile, fragilityScore: number): Weights {
  const w: Weights = { ...BASE[level] }

  if (!profile.includeProperty) {
    w.globalEquity += w.property
    w.property = 0
  }

  if (profile.emTilt === 'none') {
    w.globalEquity += w.emEquity
    w.emEquity = 0
  } else if (profile.emTilt === 'strong') {
    const extra = w.emEquity * 0.8
    w.emEquity += extra
    w.globalEquity -= extra
  }

  const g = goldWeight(fragilityScore)
  if (g > 0) {
    // Take gold from the defensive sleeve first, then from shares.
    let need = g
    for (const k of ['globalBonds', 'tips', 'shortGov'] as AssetKey[]) {
      const take = Math.min(w[k], need)
      w[k] -= take
      need -= take
      if (need <= 0) break
    }
    if (need > 0) {
      const take = Math.min(w.globalEquity, need)
      w.globalEquity -= take
      need -= take
    }
    w.gold = g - Math.max(0, need)
  }

  return normalise(w)
}

export function normalise(w: Weights): Weights {
  const total = ASSET_KEYS.reduce((s, k) => s + Math.max(0, w[k]), 0)
  if (total <= 0) return zero()
  const out = zero()
  for (const k of ASSET_KEYS) out[k] = (Math.max(0, w[k]) / total) * 100
  return out
}

/**
 * Blend the three tiers into one set of weights over the whole investable pile.
 * The safety tier is cash and short government bonds. The near-term goal tier
 * is the same, because money you need inside three years does not belong in shares.
 */
export function blendedWeights(t: Tiering, growth: Weights): Weights {
  const total = t.safetyUsd + t.shortGoalsUsd + t.growthUsd
  if (total <= 0) return zero()

  const out = zero()
  const safetyPot = t.safetyUsd + t.shortGoalsUsd
  out.cash += (safetyPot * 0.6) / total * 100
  out.shortGov += (safetyPot * 0.4) / total * 100

  for (const k of ASSET_KEYS) {
    out[k] += ((t.growthUsd * growth[k]) / 100 / total) * 100
  }

  return normalise(out)
}
