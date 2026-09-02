import type { Account } from './types'
import { toUsd } from './fx'

/**
 * Where the money sits on a timeline, not just in buckets.
 *
 * "Accessible" as a yes or no question hides the thing that actually hurts
 * people in a banking crisis: the drip. An account with a withdrawal limit is
 * not frozen and not free. It pays out on a schedule, and whether you survive
 * depends on whether that schedule outruns your rent.
 *
 * Nothing here is assumed. If you declared a monthly limit, the curve uses it.
 * If you said the money comes out slowly but gave no limit, the tool refuses
 * to put a date on it and shows it as timing unknown instead.
 */

export interface LiquidityBand {
  key: 'now' | 'drip' | 'unknown' | 'trapped'
  label: string
  usd: number
  pct: number
}

export interface LiquidityPoint {
  month: number
  /** Cumulative money you could have in hand by this month: reachable now plus declared drips. */
  usd: number
  pct: number
}

export interface LiquiditySchedule {
  totalUsd: number
  nowUsd: number
  /** Money on a declared drip: comes out at a stated monthly rate. */
  drippingUsd: number
  dripMonthlyUsd: number
  /** 'days' money with no declared rate. On no timeline this tool would trust. */
  unknownUsd: number
  trappedUsd: number
  bands: LiquidityBand[]
  points: LiquidityPoint[]
  /** Month by which every declared drip has fully paid out. Null when nothing drips. */
  dripDoneMonth: number | null
}

/** Cumulative reachable money at month m, counting only what has a declared timetable. */
export function accessibleAtMonth(accounts: Account[], month: number): number {
  let usd = 0
  for (const a of accounts) {
    if (!Number.isFinite(a.amount) || a.amount <= 0) continue
    const amountUsd = toUsd(a.amount, a.currency)
    if (a.access === 'today') usd += amountUsd
    else if (a.access === 'days' && a.monthlyCap && a.monthlyCap > 0) {
      usd += Math.min(amountUsd, toUsd(a.monthlyCap, a.currency) * month)
    }
  }
  return usd
}

const HORIZON_MONTHS = [0, 1, 2, 3, 6, 9, 12, 18, 24]

export function computeLiquidity(accounts: Account[]): LiquiditySchedule {
  const rows = accounts.filter((a) => Number.isFinite(a.amount) && a.amount > 0)
  const totalUsd = rows.reduce((s, a) => s + toUsd(a.amount, a.currency), 0)
  const pct = (usd: number) => (totalUsd > 0 ? (usd / totalUsd) * 100 : 0)

  let nowUsd = 0
  let drippingUsd = 0
  let dripMonthlyUsd = 0
  let unknownUsd = 0
  let trappedUsd = 0

  for (const a of rows) {
    const usd = toUsd(a.amount, a.currency)
    if (a.access === 'today') nowUsd += usd
    else if (a.access === 'restricted') trappedUsd += usd
    else if (a.monthlyCap && a.monthlyCap > 0) {
      drippingUsd += usd
      dripMonthlyUsd += toUsd(a.monthlyCap, a.currency)
    } else unknownUsd += usd
  }

  const dripDoneMonth =
    dripMonthlyUsd > 0
      ? Math.max(
          ...rows
            .filter((a) => a.access === 'days' && a.monthlyCap && a.monthlyCap > 0)
            .map((a) => Math.ceil(a.amount / (a.monthlyCap as number))),
        )
      : null

  const points = HORIZON_MONTHS.map((month) => {
    const usd = accessibleAtMonth(rows, month)
    return { month, usd, pct: pct(usd) }
  })

  const bands: LiquidityBand[] = [
    { key: 'now', label: 'Reachable now', usd: nowUsd, pct: pct(nowUsd) },
    { key: 'drip', label: 'On a declared drip', usd: drippingUsd, pct: pct(drippingUsd) },
    { key: 'unknown', label: 'Slow, timing unknown', usd: unknownUsd, pct: pct(unknownUsd) },
    { key: 'trapped', label: 'Trapped', usd: trappedUsd, pct: pct(trappedUsd) },
  ]

  return { totalUsd, nowUsd, drippingUsd, dripMonthlyUsd, unknownUsd, trappedUsd, bands, points, dripDoneMonth }
}
