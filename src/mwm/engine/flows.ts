import type { Flag, FlowResult, Flows, GoalResult, Standing } from './types'
import { hardness, toUsd, fmtUsd } from './fx'

export function computeFlows(flows: Flows, standing: Standing): FlowResult {
  const incomeUsd = toUsd(flows.incomeMonthly || 0, flows.incomeCurrency)
  const spendUsd = toUsd(flows.spendMonthly || 0, flows.spendCurrency)
  const surplusUsd = incomeUsd - spendUsd
  const savingsRatePct = incomeUsd > 0 ? (surplusUsd / incomeUsd) * 100 : 0
  const intendedInvestUsd = incomeUsd * (flows.investPct / 100)

  const goals: GoalResult[] = flows.goals
    .filter((g) => g.amount > 0 && g.months > 0)
    .map((g) => {
      const usd = toUsd(g.amount, g.currency)
      return {
        ...g,
        usd,
        monthlyNeeded: usd / g.months,
        bucket: g.months <= 12 ? 'safety' : g.months <= 36 ? 'short' : 'long',
      }
    })

  const goalsMonthlyTotal = goals.reduce((s, g) => s + g.monthlyNeeded, 0)
  const freeMonthlyUsd = intendedInvestUsd - goalsMonthlyTotal

  const runwayAccessibleMonths = spendUsd > 0 ? standing.accessibleTodayUsd / spendUsd : 0
  const runwayTotalMonths = spendUsd > 0 ? standing.totalUsd / spendUsd : 0
  const runwayGapMonths = runwayTotalMonths - runwayAccessibleMonths

  const currencyMismatch =
    flows.incomeCurrency !== flows.spendCurrency ||
    hardness(flows.incomeCurrency) > 0.5 ||
    hardness(flows.spendCurrency) > 0.5

  const flags: Flag[] = []

  if (spendUsd > 0 && runwayAccessibleMonths < 3) {
    flags.push({
      id: 'runway',
      severity: 'critical',
      title: `You have ${runwayAccessibleMonths.toFixed(1)} months of money you can use`,
      body: `At ${fmtUsd(spendUsd)} a month, the money you can really use covers ${runwayAccessibleMonths.toFixed(1)} months. Get this to three months first, because nothing about how you split your investments matters more. Otherwise an emergency can force you to sell them.`,
    })
  }

  if (runwayGapMonths > 1) {
    flags.push({
      id: 'runwaygap',
      severity: 'warn',
      title: 'How long your money lasts, two ways',
      body: `Counting everything you own, your money lasts ${runwayTotalMonths.toFixed(1)} months. Counting only what you can really use, it lasts ${runwayAccessibleMonths.toFixed(1)}. The ${runwayGapMonths.toFixed(1)} months in between is money that will not be there for you in a crisis.`,
    })
  }

  if (incomeUsd > 0 && surplusUsd < 0) {
    flags.push({
      id: 'deficit',
      severity: 'critical',
      title: 'You are spending more than you earn',
      body: `Every month you are ${fmtUsd(Math.abs(surplusUsd))} short. No way of investing fixes that. It is about what comes in and what goes out, and it has to be fixed before the rest of the plan is worth reading.`,
    })
  } else if (incomeUsd > 0 && intendedInvestUsd > surplusUsd) {
    flags.push({
      id: 'overcommit',
      severity: 'warn',
      title: 'You are investing more than you keep',
      body: `You want to invest ${fmtUsd(intendedInvestUsd)} a month, but only ${fmtUsd(surplusUsd)} is left after you spend. The difference has to come out of savings, which works for a while and then stops working.`,
    })
  }

  if (goalsMonthlyTotal > 0 && freeMonthlyUsd < 0) {
    flags.push({
      id: 'goals',
      severity: 'warn',
      title: 'Your goals already use up the money',
      body: `To reach your goals on time you need to put aside ${fmtUsd(goalsMonthlyTotal)} a month, which is more than the ${fmtUsd(intendedInvestUsd)} you planned to invest. Move the dates or lower the amounts, either is fine. Pretending the sums add up is not.`,
    })
  }

  if (flows.incomeCurrency !== flows.spendCurrency) {
    flags.push({
      id: 'mismatch',
      severity: 'note',
      title: `You earn in ${flows.incomeCurrency} and spend in ${flows.spendCurrency}`,
      body:
        hardness(flows.incomeCurrency) < hardness(flows.spendCurrency)
          ? 'You earn in the stronger currency and spend in the weaker one, which is the good side to be on. For most people in a country with a shaky currency, it is the biggest money advantage there is, and it is worth protecting.'
          : 'You earn in the weaker currency and spend in the stronger one, which is the hard side to be on. Your income can lose value against your costs without anything you can see happening.',
    })
  }

  return {
    incomeUsd,
    spendUsd,
    surplusUsd,
    savingsRatePct,
    intendedInvestUsd,
    goals,
    goalsMonthlyTotal,
    freeMonthlyUsd,
    runwayAccessibleMonths,
    runwayTotalMonths,
    runwayGapMonths,
    currencyMismatch,
    flags,
  }
}
