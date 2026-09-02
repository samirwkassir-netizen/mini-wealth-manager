import type { Account, Flows } from './types'
import { hardness, rate, toUsd } from './fx'

/**
 * The currency stress test.
 *
 * A repricing does three things at once: it shrinks the dollar value of
 * everything you hold in that currency, it shrinks the dollar value of an
 * income paid in it, and it shrinks the dollar cost of a life spent in it.
 * Most people only think about the first. The second and third decide whether
 * the event is survivable, because together they are your runway.
 *
 * The shock sizes are yours. Every slider starts at zero and the tool has no
 * opinion about what a currency will do. What it has is arithmetic for what
 * happens to you if it does.
 */

export interface FxShockMap {
  /** Percent change in the currency's dollar value. -50 means it buys half the dollars it did. */
  [code: string]: number
}

export interface FxStressResult {
  shocked: boolean
  totalUsd: number
  totalAfterUsd: number
  reachableUsd: number
  reachableAfterUsd: number
  incomeUsd: number
  incomeAfterUsd: number
  spendUsd: number
  spendAfterUsd: number
  surplusUsd: number
  surplusAfterUsd: number
  runwayMonths: number
  runwayAfterMonths: number
  /** Per-currency damage to holdings, largest loss first. */
  byCurrency: { code: string; usd: number; afterUsd: number; shockPct: number }[]
}

const scale = (pct: number) => 1 + pct / 100

function shockFor(shocks: FxShockMap, code: string): number {
  const raw = shocks[code] ?? 0
  return Math.max(-100, raw)
}

/** Every non-dollar currency this person actually touches, softest first. */
export function touchedCurrencies(accounts: Account[], flows: Flows): string[] {
  const set = new Set<string>()
  for (const a of accounts) if (a.amount > 0) set.add(a.currency)
  if (flows.incomeMonthly > 0) set.add(flows.incomeCurrency)
  if (flows.spendMonthly > 0) set.add(flows.spendCurrency)
  set.delete('USD')
  return [...set].sort((a, b) => hardness(b) - hardness(a))
}

export function applyFxStress(accounts: Account[], flows: Flows, shocks: FxShockMap): FxStressResult {
  const rows = accounts.filter((a) => Number.isFinite(a.amount) && a.amount > 0)

  const currencyMap = new Map<string, number>()
  for (const a of rows) {
    const usd = toUsd(a.amount, a.currency)
    currencyMap.set(a.currency, (currencyMap.get(a.currency) ?? 0) + usd)
  }

  const byCurrency = [...currencyMap.entries()]
    .map(([code, usd]) => {
      const shockPct = shockFor(shocks, code)
      return { code, usd, afterUsd: usd * scale(shockPct), shockPct }
    })
    .sort((a, b) => a.afterUsd - a.usd - (b.afterUsd - b.usd))

  const totalUsd = byCurrency.reduce((s, c) => s + c.usd, 0)
  const totalAfterUsd = byCurrency.reduce((s, c) => s + c.afterUsd, 0)

  const reachable = (after: boolean) =>
    rows
      .filter((a) => a.access === 'today')
      .reduce((s, a) => {
        const usd = toUsd(a.amount, a.currency)
        return s + (after ? usd * scale(shockFor(shocks, a.currency)) : usd)
      }, 0)

  const reachableUsd = reachable(false)
  const reachableAfterUsd = reachable(true)

  const incomeUsd = toUsd(flows.incomeMonthly || 0, flows.incomeCurrency)
  const spendUsd = toUsd(flows.spendMonthly || 0, flows.spendCurrency)
  const incomeAfterUsd = incomeUsd * scale(shockFor(shocks, flows.incomeCurrency))
  const spendAfterUsd = spendUsd * scale(shockFor(shocks, flows.spendCurrency))

  return {
    shocked: Object.values(shocks).some((v) => v !== 0),
    totalUsd,
    totalAfterUsd,
    reachableUsd,
    reachableAfterUsd,
    incomeUsd,
    incomeAfterUsd,
    spendUsd,
    spendAfterUsd,
    surplusUsd: incomeUsd - spendUsd,
    surplusAfterUsd: incomeAfterUsd - spendAfterUsd,
    runwayMonths: spendUsd > 0 ? reachableUsd / spendUsd : 0,
    runwayAfterMonths: spendAfterUsd > 0 ? reachableAfterUsd / spendAfterUsd : 0,
    byCurrency,
  }
}

/**
 * The mismatch readout: which side of the currency trade your life sits on.
 * Earning in the harder currency and spending in the softer one is the good
 * side. The other way round, your income can fall against your costs without
 * a single visible event.
 */
export interface MismatchReadout {
  incomeCurrency: string
  spendCurrency: string
  incomeHardness: number
  spendHardness: number
  side: 'good' | 'bad' | 'neutral'
  /** Share of holdings, by dollar value, in currencies softer than the one you spend in. */
  holdingsSofterThanSpendPct: number
}

export function mismatchReadout(accounts: Account[], flows: Flows): MismatchReadout {
  const incomeHardness = hardness(flows.incomeCurrency)
  const spendHardness = hardness(flows.spendCurrency)

  const rows = accounts.filter((a) => a.amount > 0)
  const totalUsd = rows.reduce((s, a) => s + toUsd(a.amount, a.currency), 0)
  const softerUsd = rows
    .filter((a) => hardness(a.currency) > spendHardness)
    .reduce((s, a) => s + toUsd(a.amount, a.currency), 0)

  const side =
    flows.incomeCurrency === flows.spendCurrency || incomeHardness === spendHardness
      ? 'neutral'
      : incomeHardness < spendHardness
        ? 'good'
        : 'bad'

  return {
    incomeCurrency: flows.incomeCurrency,
    spendCurrency: flows.spendCurrency,
    incomeHardness,
    spendHardness,
    side,
    holdingsSofterThanSpendPct: totalUsd > 0 ? (softerUsd / totalUsd) * 100 : 0,
  }
}

/**
 * Where an official rate and a street rate both exist, the gap between them
 * is a haircut you take the day you actually need to move the money. Both
 * rates and their sources sit in fx.json. This just does the division.
 */
export interface ParallelGap {
  code: string
  officialPerUsd: number
  parallelPerUsd: number
  /** What holdings valued at the official rate are worth at the street rate, as a percent change. */
  gapPct: number
  usdAtOfficial: number
  usdAtParallel: number
}

export function parallelGaps(accounts: Account[]): ParallelGap[] {
  const byCode = new Map<string, number>()
  for (const a of accounts) {
    if (a.amount <= 0) continue
    byCode.set(a.currency, (byCode.get(a.currency) ?? 0) + a.amount)
  }

  const out: ParallelGap[] = []
  for (const [code, amount] of byCode) {
    const r = rate(code)
    if (!r.parallelPerUsd || r.parallelPerUsd === r.perUsd) continue
    const usdAtOfficial = amount / r.perUsd
    const usdAtParallel = amount / r.parallelPerUsd
    out.push({
      code,
      officialPerUsd: r.perUsd,
      parallelPerUsd: r.parallelPerUsd,
      gapPct: (usdAtParallel / usdAtOfficial - 1) * 100,
      usdAtOfficial,
      usdAtParallel,
    })
  }
  return out.sort((a, b) => a.gapPct - b.gapPct)
}
