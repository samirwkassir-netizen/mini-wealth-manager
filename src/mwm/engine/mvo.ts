import assumptions from '../data/assumptions.json'
import type { AssetKey, Weights } from './types'
import { ASSET_KEYS } from './policy'

export interface AssetClassMeta {
  key: AssetKey
  label: string
  plain: string
  sourceLabel: string
  expectedReturn: number
  volatility: number
  role: string
}

export const ASSETS = assumptions.assetClasses as AssetClassMeta[]
export const ASSUMPTION_META = assumptions.meta
export const CORRELATION_ORDER = assumptions.correlationOrder as AssetKey[]
export const CORRELATIONS = assumptions.correlations as number[][]

const idx = new Map(CORRELATION_ORDER.map((k, i) => [k, i]))
const metaByKey = new Map(ASSETS.map((a) => [a.key, a]))

export function assetMeta(key: AssetKey): AssetClassMeta {
  const m = metaByKey.get(key)
  if (!m) throw new Error(`Unknown asset class ${key}`)
  return m
}

export function correlation(a: AssetKey, b: AssetKey): number {
  const i = idx.get(a)
  const j = idx.get(b)
  if (i === undefined || j === undefined) throw new Error(`No published correlation for ${a} and ${b}`)
  return CORRELATIONS[i][j]
}

/** Covariance matrix in decimals, in the order of ASSET_KEYS. */
export const COV: number[][] = ASSET_KEYS.map((a) =>
  ASSET_KEYS.map((b) => (assetMeta(a).volatility / 100) * (assetMeta(b).volatility / 100) * correlation(a, b)),
)

export const MU: number[] = ASSET_KEYS.map((k) => assetMeta(k).expectedReturn / 100)

/** Upper bounds. Stated on screen, not hidden in the model. */
export const UPPER: Record<AssetKey, number> = {
  cash: 1,
  shortGov: 1,
  globalBonds: 1,
  tips: 0.4,
  globalEquity: 1,
  emEquity: 0.35,
  property: 0.2,
  gold: 0.15,
}

export const CONSTRAINT_NOTE =
  'The optimiser is capped at 35 percent emerging market shares, 20 percent listed property, 15 percent gold and 40 percent inflation-linked bonds. Without caps, an unconstrained optimiser hands its whole budget to whichever asset happened to score best, which is how mean variance optimisation earned its nickname of an error maximiser.'

export function toVector(w: Weights): number[] {
  return ASSET_KEYS.map((k) => w[k] / 100)
}

export function toWeights(v: number[]): Weights {
  const out = {} as Weights
  ASSET_KEYS.forEach((k, i) => {
    out[k] = v[i] * 100
  })
  return out
}

export function portfolioReturn(v: number[]): number {
  return v.reduce((s, x, i) => s + x * MU[i], 0) * 100
}

export function portfolioVol(v: number[]): number {
  let acc = 0
  for (let i = 0; i < v.length; i++) {
    for (let j = 0; j < v.length; j++) acc += v[i] * v[j] * COV[i][j]
  }
  return Math.sqrt(Math.max(0, acc)) * 100
}

export function sharpe(retPct: number, volPct: number): number {
  const rf = assumptions.meta.riskFreeForSharpe
  return volPct > 0 ? (retPct - rf) / volPct : 0
}

const LO = ASSET_KEYS.map(() => 0)
const HI = ASSET_KEYS.map((k) => UPPER[k])

/** Project a vector onto { sum = 1, lo <= w <= hi } by bisection on the shift. */
function project(v: number[]): number[] {
  const clampSum = (theta: number) =>
    v.reduce((s, x, i) => s + Math.min(HI[i], Math.max(LO[i], x - theta)), 0)

  let lo = Math.min(...v) - 1
  let hi = Math.max(...v) + 1
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2
    if (clampSum(mid) > 1) lo = mid
    else hi = mid
  }
  const theta = (lo + hi) / 2
  return v.map((x, i) => Math.min(HI[i], Math.max(LO[i], x - theta)))
}

function matVec(m: number[][], v: number[]): number[] {
  return m.map((row) => row.reduce((s, x, i) => s + x * v[i], 0))
}

/**
 * Minimum-variance portfolio for a target return, subject to the caps above.
 * Projected gradient descent. Deterministic, no dependencies, and slow enough
 * to be readable rather than fast enough to be clever.
 */
export function minVarForTarget(targetPct: number, iterations = 1500): number[] {
  const target = targetPct / 100
  const lambda = 20000
  const muNorm2 = MU.reduce((s, x) => s + x * x, 0)
  const maxRow = Math.max(...COV.map((r) => r.reduce((s, x) => s + Math.abs(x), 0)))
  const L = 2 * maxRow + 2 * lambda * muNorm2
  const step = 1 / L

  let w = project(ASSET_KEYS.map(() => 1 / ASSET_KEYS.length))

  for (let it = 0; it < iterations; it++) {
    const cw = matVec(COV, w)
    const gap = w.reduce((s, x, i) => s + x * MU[i], 0) - target
    const grad = cw.map((x, i) => 2 * x + 2 * lambda * gap * MU[i])
    w = project(w.map((x, i) => x - step * grad[i]))
  }
  return w
}

export interface FrontierPoint {
  ret: number
  vol: number
  sharpe: number
  weights: Weights
}

let frontierCache: FrontierPoint[] | null = null

export function frontier(points = 32): FrontierPoint[] {
  if (frontierCache) return frontierCache

  const capped = ASSET_KEYS.map((k, i) => ({ i, hi: UPPER[k], mu: MU[i] })).sort((a, b) => b.mu - a.mu)
  let budget = 1
  const best = ASSET_KEYS.map(() => 0)
  for (const c of capped) {
    const take = Math.min(c.hi, budget)
    best[c.i] = take
    budget -= take
    if (budget <= 0) break
  }
  const maxRet = portfolioReturn(best)
  const minRet = Math.min(...MU) * 100

  const out: FrontierPoint[] = []
  for (let i = 0; i < points; i++) {
    const target = minRet + ((maxRet - minRet) * i) / (points - 1)
    const v = minVarForTarget(target)
    const ret = portfolioReturn(v)
    const vol = portfolioVol(v)
    out.push({ ret, vol, sharpe: sharpe(ret, vol), weights: toWeights(v) })
  }

  // Keep only the efficient upper branch: for each point, no earlier point
  // may have both lower volatility and higher return.
  const efficient = out.filter((p, i) => !out.some((q, j) => j !== i && q.vol <= p.vol && q.ret > p.ret + 1e-9))
  frontierCache = efficient.length > 4 ? efficient : out
  return frontierCache
}

export function maxSharpePortfolio(): FrontierPoint {
  return frontier().reduce((a, b) => (b.sharpe > a.sharpe ? b : a))
}

export const MVO_CAVEAT =
  'The curve is what the optimiser says is possible if every one of those expected returns, volatilities and correlations turns out to be right. They will not be. Move the expected return of shares by one percentage point, which is well inside the disagreement between the three houses quoted here, and the optimiser rewrites the whole portfolio. That is why the recommendation on this page is a policy with round numbers and the optimiser is only shown as a check on it.'
