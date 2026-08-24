import type { FlowResult, Flows, HumanCapital, Stage, Standing } from './types'

/**
 * The argument this module makes, in one line:
 *
 * At a 7 percent expected return, one dollar of extra monthly income is worth
 * about 171 dollars of invested capital. For someone with four figures saved
 * and an income that has not been built yet, the highest-returning thing
 * available is almost never a fund.
 *
 * That is not a motivational claim. It is division, and the tool shows the
 * working on screen.
 */
export function computeHumanCapital(
  standing: Standing,
  flow: FlowResult,
  flows: Flows,
  expectedReturnPct: number,
  bufferTargetMonths: number,
  upliftMonthlyUsd: number,
): HumanCapital {
  const investableUsd = standing.deployableUsd
  const r = expectedReturnPct / 100

  const marketIncomeYearUsd = investableUsd * r
  const marketIncomeMonthUsd = marketIncomeYearUsd / 12
  const capitalFor = (monthlyUsd: number) => (r > 0 ? (monthlyUsd * 12) / r : Infinity)

  const upliftEquivalentCapitalUsd = capitalFor(upliftMonthlyUsd)
  const multiple = investableUsd > 0 ? upliftEquivalentCapitalUsd / investableUsd : Infinity

  const reasons: string[] = []
  let stage: Stage = 'invest'

  if (flows.incomeStability === 'none') {
    stage = 'buildIncome'
    reasons.push(
      'You told us you have no income yet. A portfolio is a machine for growing money you already have. Right now the constraint is not your return, it is that there is nothing regular flowing in for the return to work on.',
    )
  } else if (flows.incomeStability === 'irregular') {
    stage = 'buildIncome'
    reasons.push(
      'Your income is irregular. Irregular income means you will eventually have to sell an investment at the worst possible moment to cover a normal month, and that single forced sale can cost more than several years of returns.',
    )
  }

  if (flow.spendUsd > 0 && flow.runwayAccessibleMonths < bufferTargetMonths) {
    if (stage === 'invest') stage = 'buildBuffer'
    reasons.push(
      `You have ${flow.runwayAccessibleMonths.toFixed(1)} months of reachable money against a target of ${bufferTargetMonths}. The buffer comes before the portfolio, always, and it is not a compromise. It is the thing that lets the portfolio be left alone.`,
    )
  }

  if (flow.surplusUsd <= 0 && flow.incomeUsd > 0) {
    stage = 'buildIncome'
    reasons.push('You are not keeping anything at the end of the month, so there is nothing to invest yet.')
  }

  if (stage === 'invest') {
    reasons.push(
      'Recurring income, a buffer in place, and money left over. This is the point at which markets start doing more for you than another course would.',
    )
  }

  return {
    stage,
    reasons,
    investableUsd,
    marketIncomeYearUsd,
    marketIncomeMonthUsd,
    capitalFor,
    upliftMonthlyUsd,
    upliftEquivalentCapitalUsd,
    multiple,
  }
}

export function defaultUplift(incomeUsd: number): number {
  const quarter = incomeUsd * 0.25
  const raw = Math.max(200, Math.min(2000, quarter || 300))
  return Math.round(raw / 50) * 50
}
