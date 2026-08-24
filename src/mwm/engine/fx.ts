import fxData from '../data/fx.json'

export interface Rate {
  code: string
  name: string
  perUsd: number
  parallelPerUsd?: number | null
  asOf: string
  regime: string
  source: string | null
  sourceUrl: string | null
  note: string
}

export const rates = fxData.rates as Rate[]
export const fxMeta = fxData.meta

const byCode = new Map(rates.map((r) => [r.code, r]))

export function rate(code: string): Rate {
  const r = byCode.get(code)
  if (!r) throw new Error(`No frozen rate for ${code}. Add it to fx.json rather than guessing one.`)
  return r
}

export function toUsd(amount: number, code: string): number {
  if (!Number.isFinite(amount)) return 0
  return amount / rate(code).perUsd
}

export function fromUsd(usd: number, code: string): number {
  return usd * rate(code).perUsd
}

/**
 * How much a currency behaves like a claim you can rely on.
 * 0 is a hard currency, 1 is one that has repriced violently in living memory.
 * Pegged currencies sit in between: a peg is a policy, not a law of nature.
 */
export function hardness(code: string): number {
  const r = rate(code)
  if (r.regime === 'base') return 0
  if (r.regime === 'floating') return code === 'TRY' ? 0.85 : 0
  if (r.regime === 'pegged') return 0.15
  if (r.regime === 'official') return 1
  return 0.8
}

export function fmtUsd(usd: number, opts: { decimals?: number; sign?: boolean } = {}): string {
  const { decimals = 0, sign = false } = opts
  const v = Math.abs(usd)
  const s = v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const prefix = usd < 0 ? '-$' : sign ? '+$' : '$'
  return `${prefix}${s}`
}

export function fmtPct(pct: number, decimals = 1): string {
  return `${pct.toFixed(decimals)}%`
}

export function fmtLocal(amount: number, code: string): string {
  const decimals = amount >= 1000 ? 0 : 2
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${code}`
}
