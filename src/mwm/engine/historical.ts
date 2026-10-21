import assumptions from '../data/assumptions.json'
import type { AssetKey, Weights } from './types'
import { ASSET_KEYS } from './policy'

export interface HistoricalLine {
  key: AssetKey
  label: string
  nominal: number
  real: number | null
  period: string
  measures: string
  source: string
  verified: boolean
}

export const HISTORICAL = assumptions.historical
export const HISTORICAL_LINES = assumptions.historical.lines as HistoricalLine[]
export const LANDMARKS = assumptions.historical.landmarks

const byKey = new Map(HISTORICAL_LINES.map((l) => [l.key, l]))

export function historicalFor(key: AssetKey): HistoricalLine {
  const l = byKey.get(key)
  if (!l) throw new Error(`No historical figure for ${key}`)
  return l
}

/**
 * What this mix would have returned per year if the long run repeated.
 * Not a forecast. The gap between this and the forecast number is the
 * single most useful thing on the page.
 */
export function historicalReturn(w: Weights): number {
  return ASSET_KEYS.reduce((s, k) => s + (w[k] / 100) * historicalFor(k).nominal, 0)
}

/** Share of the mix whose historical figure came from a verified published source. */
export function historicalCoverage(w: Weights): number {
  return ASSET_KEYS.reduce((s, k) => s + (historicalFor(k).verified ? w[k] : 0), 0)
}

export const WHY_NOT_TWELVE = {
  question: 'People say shares return 10 to 12 percent a year. Why does this say less?',
  answer:
    'Because that number is American shares on their own. The S&P 500 returned 10.4 percent a year over the last thirty years and 11.9 percent over the last fifty. Developed-market shares spread across the world returned about 8.5 percent a year from 1900 to 2025. The missing point and a half a year is what you pay for not having everything you own in one country. Whether that is worth paying is a real question, and this tool thinks it is, especially for someone whose bank is already a concentrated bet.',
  sources: [
    'https://www.reit.com/sites/default/files/reitwatch/RW2607.pdf',
    'https://www.ubs.com/content/dam/assets/wm/static/cio/documents/giry2026-summary-public.pdf',
  ],
}

export interface CashErosion {
  label: string
  startLabel: string
  endLabel: string
  startIndex: number
  endIndex: number
  years: number
  pricesRosePct: number
  purchasingPowerLostPct: number
  annualInflationPct: number
  annualLossPct: number
  measures: string
  source: string
  sourceUrl: string
  startSourceUrl: string
  verified: boolean
  caution: string
}

/**
 * What a dollar left alone since the start of the Lebanese banking crisis
 * actually bought by July 2026. Published index values, both ends, no model.
 */
export const CASH_EROSION = assumptions.cashErosion as CashErosion

/** What a pile of cash held untouched since October 2019 would buy today, in 2019 dollars. */
export function erodedValue(usd: number): number {
  return usd * (CASH_EROSION.startIndex / CASH_EROSION.endIndex)
}
