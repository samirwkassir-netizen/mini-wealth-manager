import type { Account, Flows } from './types'
import { toUsd } from './fx'
import type { FxShockMap } from './fxStress'

/**
 * The month-by-month question: if things go wrong, what gives out first,
 * and when?
 *
 * This is a simulation of your actual accounts, not of the recommended
 * portfolio. It burns through your money in the order you would in real
 * life: reachable cash first, then whatever the drip delivers each month.
 * Money with no declared timetable and money you marked as trapped never
 * arrives, because the tool will not schedule money you could not.
 *
 * Every dial is yours. The tool does not predict that your income stops or
 * that a currency falls. It answers: if that happened, which month hurts.
 */

export interface StressDials {
  /** Income goes to zero from the first month. */
  incomeStops: boolean
  /** Percent change in each currency's dollar value, applied from the first month. */
  fxShocks: FxShockMap
  /** The slow accounts stop paying out entirely, the way they did in Beirut. */
  slowMoneyFreezes: boolean
}

export const NO_STRESS: StressDials = { incomeStops: false, fxShocks: {}, slowMoneyFreezes: false }

export interface BreakEvent {
  id: 'deficit' | 'dripEnds' | 'cashOut' | 'onlyTrapped'
  month: number | null
  title: string
  detail: string
}

export interface TimelinePoint {
  month: number
  poolUsd: number
}

export interface BreaksFirstResult {
  /** Months you can cover from money with a real timetable. Null means you never break. */
  survivalMonths: number | null
  monthlyBurnUsd: number
  incomeAfterUsd: number
  spendAfterUsd: number
  startingPoolUsd: number
  dripTotalUsd: number
  /** What is left on the sidelines when the timed money runs out. */
  strandedUsd: number
  events: BreakEvent[]
  timeline: TimelinePoint[]
}

const MAX_MONTHS = 60

const scale = (shocks: FxShockMap, code: string) => 1 + Math.max(-100, shocks[code] ?? 0) / 100

export function simulateBreaks(accounts: Account[], flows: Flows, dials: StressDials): BreaksFirstResult {
  const rows = accounts.filter((a) => Number.isFinite(a.amount) && a.amount > 0)
  const fx = (a: Account) => scale(dials.fxShocks, a.currency)

  const startingPoolUsd = rows
    .filter((a) => a.access === 'today')
    .reduce((s, a) => s + toUsd(a.amount, a.currency) * fx(a), 0)

  const drippers = dials.slowMoneyFreezes
    ? []
    : rows.filter((a) => a.access === 'days' && a.monthlyCap && a.monthlyCap > 0)

  const dripTotalUsd = drippers.reduce((s, a) => s + toUsd(a.amount, a.currency) * fx(a), 0)

  const strandedUsd = rows
    .filter(
      (a) =>
        a.access === 'restricted' ||
        (a.access === 'days' && (dials.slowMoneyFreezes || !a.monthlyCap || a.monthlyCap <= 0)),
    )
    .reduce((s, a) => s + toUsd(a.amount, a.currency) * fx(a), 0)

  const incomeAfterUsd = dials.incomeStops
    ? 0
    : toUsd(flows.incomeMonthly || 0, flows.incomeCurrency) * scale(dials.fxShocks, flows.incomeCurrency)
  const spendAfterUsd = toUsd(flows.spendMonthly || 0, flows.spendCurrency) * scale(dials.fxShocks, flows.spendCurrency)
  const monthlyBurnUsd = spendAfterUsd - incomeAfterUsd

  const dripAt = (month: number) =>
    drippers.reduce((s, a) => {
      const capUsd = toUsd(a.monthlyCap as number, a.currency) * fx(a)
      const totalUsd = toUsd(a.amount, a.currency) * fx(a)
      const before = Math.min(totalUsd, capUsd * (month - 1))
      const upTo = Math.min(totalUsd, capUsd * month)
      return s + (upTo - before)
    }, 0)

  const dripEndsMonth = drippers.length
    ? Math.max(...drippers.map((a) => Math.ceil(a.amount / (a.monthlyCap as number))))
    : null

  const timeline: TimelinePoint[] = [{ month: 0, poolUsd: startingPoolUsd }]
  let pool = startingPoolUsd
  let survivalMonths: number | null = null

  if (spendAfterUsd > 0) {
    for (let m = 1; m <= MAX_MONTHS; m++) {
      pool += incomeAfterUsd + dripAt(m) - spendAfterUsd
      timeline.push({ month: m, poolUsd: Math.max(0, pool) })
      if (pool < 0 && survivalMonths === null) {
        survivalMonths = m - 1
        break
      }
    }
  }

  const events: BreakEvent[] = []

  if (monthlyBurnUsd > 0) {
    events.push({
      id: 'deficit',
      month: 1,
      title: `Every month costs you money`,
      detail: `Spending runs ${fmt(monthlyBurnUsd)} ahead of income under these settings, so the clock is ticking from month one.`,
    })
  }

  if (dripEndsMonth !== null && (survivalMonths === null || dripEndsMonth <= survivalMonths)) {
    events.push({
      id: 'dripEnds',
      month: dripEndsMonth,
      title: 'The drip runs dry',
      detail: `By month ${dripEndsMonth} the slow accounts have paid out everything they hold. After that you are living on what is already in hand.`,
    })
  }

  if (survivalMonths !== null) {
    events.push({
      id: 'cashOut',
      month: survivalMonths,
      title: 'The reachable money runs out',
      detail: `Month ${survivalMonths} is the last one you can cover in full from money with a real timetable.`,
    })
    if (strandedUsd > 0) {
      events.push({
        id: 'onlyTrapped',
        month: survivalMonths,
        title: `${fmt(strandedUsd)} is still yours, on paper`,
        detail:
          'What remains at that point is money with no timetable: trapped, frozen, or slow with no declared limit. It may come back. You cannot budget a month around it.',
      })
    }
  }

  events.sort((a, b) => (a.month ?? Infinity) - (b.month ?? Infinity))

  return {
    survivalMonths,
    monthlyBurnUsd,
    incomeAfterUsd,
    spendAfterUsd,
    startingPoolUsd,
    dripTotalUsd,
    strandedUsd,
    events,
    timeline,
  }
}

function fmt(usd: number): string {
  return `$${Math.round(Math.abs(usd)).toLocaleString('en-US')}`
}
