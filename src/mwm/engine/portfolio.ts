import instrumentData from '../data/instruments.json'
import type { Allocation, AssetKey, PortfolioStat, Profile, Weights } from './types'
import { ASSET_KEYS } from './policy'
import { assetMeta, portfolioReturn, portfolioVol, sharpe, toVector } from './mvo'

export interface Instrument {
  id: string
  name: string
  assetClass: string
  tickers: string
  isin: string | null
  domicile: string
  wrapper: string
  ter: number
  payout: string
  tradeCurrency: string
  coverage: string
  usSitus: boolean
  concentration: string | null
  default: boolean
  sourceQuality?: string
  source: string
}

export const INSTRUMENTS = instrumentData.instruments as Instrument[]
export const INSTRUMENT_META = instrumentData.meta

export function instrumentsFor(key: AssetKey | 'speculative'): Instrument[] {
  return INSTRUMENTS.filter((i) => i.assetClass === key)
}

export function instrumentById(id: string): Instrument | undefined {
  return INSTRUMENTS.find((i) => i.id === id)
}

/** Non-US persons get the Irish lines. The reason is on screen, not buried here. */
export function defaultInstrument(key: AssetKey, usPerson: boolean): Instrument {
  const pool = instrumentsFor(key)
  if (!pool.length) throw new Error(`No instrument covers ${key}`)
  const preferred = pool.filter((i) => (usPerson ? i.domicile === 'United States' : i.domicile === 'Ireland'))
  const search = preferred.length ? preferred : pool
  return search.find((i) => i.default) ?? search[0]
}

export function resolvePicks(profile: Profile, picks: Record<string, string>): Record<AssetKey, Instrument> {
  const out = {} as Record<AssetKey, Instrument>
  for (const k of ASSET_KEYS) {
    const chosen = picks[k] ? instrumentById(picks[k]) : undefined
    out[k] = chosen && chosen.assetClass === k ? chosen : defaultInstrument(k, profile.usPerson)
  }
  return out
}

export function weightedTer(weights: Weights, chosen: Record<AssetKey, Instrument>): number {
  return ASSET_KEYS.reduce((s, k) => s + (weights[k] / 100) * chosen[k].ter, 0)
}

export function buildAllocation(
  weights: Weights,
  amountUsd: number,
  profile: Profile,
  picks: Record<string, string>,
): Allocation {
  const chosen = resolvePicks(profile, picks)
  const v = toVector(weights)
  const expectedReturn = portfolioReturn(v)
  const volatility = portfolioVol(v)
  const ter = weightedTer(weights, chosen)

  const stat: PortfolioStat = {
    expectedReturn,
    volatility,
    sharpe: sharpe(expectedReturn, volatility),
    ter,
    terUsdPerYear: (amountUsd * ter) / 100,
  }

  const rows = ASSET_KEYS.filter((k) => weights[k] > 0.05)
    .sort((a, b) => weights[b] - weights[a])
    .map((k) => ({
      key: k,
      label: assetMeta(k).label,
      plain: assetMeta(k).plain,
      weight: weights[k],
      usd: (amountUsd * weights[k]) / 100,
      instrumentId: chosen[k].id,
    }))

  return { weights, stat, rows }
}

/** A rough sense of the annual range, not a promise about any particular year. */
export function outcomeBand(stat: PortfolioStat, amountUsd: number) {
  const r = stat.expectedReturn / 100
  const s = stat.volatility / 100
  return {
    typicalLow: amountUsd * (1 + r - s),
    typicalHigh: amountUsd * (1 + r + s),
    badYear: amountUsd * (1 + r - 2 * s),
    note: 'About two years in three end up inside the first range, and about one year in twenty is worse than the third figure. These come straight from how much the mix swings, and they assume markets behave more calmly than they really do in a crisis.',
  }
}
