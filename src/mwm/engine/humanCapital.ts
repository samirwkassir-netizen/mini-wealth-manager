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
      'You told us you have no income yet. Investing can only grow money you already have. Right now the problem is not what your money earns, it is that nothing new comes in each month for it to work on.',
    )
  } else if (flows.incomeStability === 'irregular') {
    stage = 'buildIncome'
    reasons.push(
      'Your income comes and goes. Sooner or later that means selling an investment at the worst moment just to pay for a normal month, and one sale like that can cost more than several years of gains.',
    )
  }

  if (flow.spendUsd > 0 && flow.runwayAccessibleMonths < bufferTargetMonths) {
    if (stage === 'invest') stage = 'buildBuffer'
    reasons.push(
      `You have ${flow.runwayAccessibleMonths.toFixed(1)} months of money you can really use, and the target is ${bufferTargetMonths}. Rainy-day money always comes before investing, and that is not settling for less. It is what lets your investments be left alone.`,
    )
  }

  if (flow.surplusUsd <= 0 && flow.incomeUsd > 0) {
    stage = 'buildIncome'
    reasons.push('Nothing is left at the end of the month, so there is nothing to invest yet.')
  }

  if (flow.spendUsd <= 0 && standing.totalUsd > 0) {
    if (stage === 'invest') stage = 'buildBuffer'
    reasons.push('Add what you spend each month so the tool can work out your rainy-day money. Until then, it will not tell you to invest.')
  }

  if (stage === 'invest') {
    reasons.push(
      'Your income is steady, your rainy-day money is in place, and money is left over. This is the point where investing starts to do more for you than another course would.',
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
