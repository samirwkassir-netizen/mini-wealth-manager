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
      title: `You have ${runwayAccessibleMonths.toFixed(1)} months of reachable money`,
      body: `At ${fmtUsd(spendUsd)} a month, the money you can actually get to covers ${runwayAccessibleMonths.toFixed(1)} months. Nothing in the allocation section matters more than getting this to three months first. An investment you have to sell in an emergency is not an investment.`,
    })
  }

  if (runwayGapMonths > 1) {
    flags.push({
      id: 'runwaygap',
      severity: 'warn',
      title: 'Two different runways',
      body: `Counting everything you own, you have ${runwayTotalMonths.toFixed(1)} months. Counting only what you can reach, ${runwayAccessibleMonths.toFixed(1)}. The gap of ${runwayGapMonths.toFixed(1)} months is the part of your net worth that will not answer the phone in a crisis.`,
    })
  }

  if (incomeUsd > 0 && surplusUsd < 0) {
    flags.push({
      id: 'deficit',
      severity: 'critical',
      title: 'You are spending more than you earn',
      body: `Every month you are ${fmtUsd(Math.abs(surplusUsd))} short. No allocation fixes that. This is an income and spending problem and it has to be solved before anything below is worth reading.`,
    })
  } else if (incomeUsd > 0 && intendedInvestUsd > surplusUsd) {
    flags.push({
      id: 'overcommit',
      severity: 'warn',
      title: 'You are investing more than you keep',
      body: `You want to put ${fmtUsd(intendedInvestUsd)} a month to work but only ${fmtUsd(surplusUsd)} is left after you spend. The difference has to come out of savings, which works for a while and then does not.`,
    })
  }

  if (goalsMonthlyTotal > 0 && freeMonthlyUsd < 0) {
    flags.push({
      id: 'goals',
      severity: 'warn',
      title: 'Your goals already spend the money',
      body: `The things you said you want cost ${fmtUsd(goalsMonthlyTotal)} a month to fund on schedule, which is more than the ${fmtUsd(intendedInvestUsd)} you planned to invest. Either the dates move or the amounts do. Both are fine. Pretending the arithmetic works is not.`,
    })
  }

  if (flows.incomeCurrency !== flows.spendCurrency) {
    flags.push({
      id: 'mismatch',
      severity: 'note',
      title: `You earn in ${flows.incomeCurrency} and spend in ${flows.spendCurrency}`,
      body:
        hardness(flows.incomeCurrency) < hardness(flows.spendCurrency)
          ? 'Earning in the harder currency and spending in the softer one is the good side of this trade. It is the single largest financial advantage available to most people in a fragile-currency country, and it is worth protecting.'
          : 'Earning in the softer currency and spending in the harder one is the wrong side of this trade. Your income can lose value against your costs without anything visibly happening.',
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
