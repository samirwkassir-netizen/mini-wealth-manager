import type { Account, AppState, FlowResult, HumanCapital, Standing, Tiering } from './types'
import { fmtUsd, toUsd } from './fx'

export interface Action {
  id: string
  order: number
  title: string
  body: string
  tag: 'before markets' | 'first' | 'then' | 'ongoing'
}

/**
 * The ordered list. Two people with the same amount of money get different
 * first moves here, which is the whole argument of this project: the answer
 * depends on which system holds your money, not only on how much of it there is.
 */
export function firstMoves(
  state: AppState,
  standing: Standing,
  flow: FlowResult,
  tiering: Tiering,
  human: HumanCapital,
): Action[] {
  const out: Action[] = []
  let n = 0
  const push = (a: Omit<Action, 'order'>) => out.push({ ...a, order: ++n })

  const hasBrokerage =
    state.accounts.some((a: Account) => a.type === 'brokerage' && a.amount > 0) ||
    state.profile.brokerAccess === 'have'
  const noBrokerRoute = state.profile.brokerAccess === 'no'

  if (standing.restrictedUsd > 0) {
    push({
      id: 'restricted',
      tag: 'before markets',
      title: 'Take the trapped money out of your plan',
      body: `You hold ${fmtUsd(standing.totalUsd)} and can reach ${fmtUsd(standing.accessibleTodayUsd)}. Plan with the second number. Keep chasing the first through whatever process exists, but do not let it sit in your head as savings, because a balance you cannot draw on will not pay a bill.`,
    })
  }

  if (flow.surplusUsd < 0 && flow.incomeUsd > 0) {
    push({
      id: 'deficit',
      tag: 'before markets',
      title: `Close a gap of ${fmtUsd(Math.abs(flow.surplusUsd))} a month`,
      body: 'Nothing else on this page works while more goes out than comes in. Every month of deficit eats a month of buffer, and buffer is what an allocation is built on.',
    })
  } else if (flow.incomeUsd <= 0 && flow.spendUsd > 0) {
    push({
      id: 'deficit',
      tag: 'before markets',
      title: `You are living on savings: ${fmtUsd(flow.spendUsd)} a month`,
      body: 'Every month comes out of what you hold. That is fine for a while, as long as you know how many months you have and what starts the income.',
    })
  }

  if (human.stage === 'buildIncome') {
    push({
      id: 'income',
      tag: 'before markets',
      title: 'Put the money into the income before the market',
      body: `At the model's expected return, ${fmtUsd(human.investableUsd)} invested is worth about ${fmtUsd(human.marketIncomeMonthUsd)} a month. An extra ${fmtUsd(human.upliftMonthlyUsd)} a month of income is worth the same as ${fmtUsd(human.upliftEquivalentCapitalUsd)} invested. When the second number is a multiple of what you actually have, capital spent on making yourself more valuable beats capital spent on a fund, and it is not close.`,
    })
  }

  if (tiering.shortfallUsd > 0) {
    push({
      id: 'buffer',
      tag: 'first',
      title: `Get to ${tiering.bufferTargetMonths} months of money you can reach`,
      body: `You are ${fmtUsd(tiering.shortfallUsd)} short of that. It sits in cash or in a short government bond fund and it is supposed to be boring. This is what stops you selling a portfolio at the worst possible moment, which is the mistake that actually costs people their returns.`,
    })
  }

  // Concentration among the money you can actually move between banks.
  const reachable = state.accounts
    .filter((a) => a.access === 'today' && Number.isFinite(a.amount) && a.amount > 0)
    .map((a) => toUsd(a.amount, a.currency))
  const reachTotal = reachable.reduce((s, x) => s + x, 0)
  const reachLargestPct = reachTotal > 0 && reachable.length ? (Math.max(...reachable) / reachTotal) * 100 : 0
  if (reachLargestPct > 70 && reachTotal > 0) {
    push({
      id: 'split',
      tag: 'first',
      title: 'Open a second account somewhere unrelated',
      body: `${reachLargestPct.toFixed(0)} percent of the money you can reach is in one place. A second account in your own name at an unrelated institution removes a single point of failure.`,
    })
  }

  if (standing.nonTransferablePct > 40 && standing.deployableUsd > 0) {
    push({
      id: 'route',
      tag: 'first',
      title: 'Build a route out before you need one',
      body: 'Most of what you hold cannot cross a border. Getting one working channel open, tested with a small amount, while nothing is wrong, is worth more than any allocation decision below.',
    })
  }

  const investing = human.stage === 'invest' && flow.spendUsd > 0

  if (tiering.growthUsd > 0 && !investing) {
    push({
      id: 'park',
      tag: 'then',
      title: 'Park the long-term money until the income is steady',
      body: `Keep ${tiering.bufferTargetMonths} months reachable. The rest can wait in a short Treasury fund until you have a steady income, or go into the mix on the Invest tab if you are sure you will not need it for five years.`,
    })
  }

  if (tiering.growthUsd > 0 && investing && noBrokerRoute) {
    push({
      id: 'noBroker',
      tag: 'then',
      title: 'Work the access problem before the allocation',
      body: `You said a foreign brokerage is not realistic. Then the mix below is a target, not a shopping list. What is usually still reachable without one: physical gold bought locally, hard-currency cash held outside the fragile bank, and paying down any debt you carry, which earns its interest rate risk-free. Revisit the broker question once a year. The situation that makes it impossible has a habit of changing.`,
    })
  }

  if (tiering.growthUsd > 0 && investing && !hasBrokerage && !noBrokerRoute) {
    push({
      id: 'broker',
      tag: 'then',
      title: 'Open the brokerage account',
      body: 'It takes a few days and it is the step people put off for years. The account has to be in your own name and funded from an account in your own name. If you are not a US person, the funds this tool points you to are Irish; the reason is behind the Why? link on the Invest tab.',
    })
  }

  if (tiering.growthUsd > 0 && investing && !noBrokerRoute) {
    push({
      id: 'buy',
      tag: 'then',
      title: `Put ${fmtUsd(tiering.growthUsd)} to work in two or three orders`,
      body: 'Not twelve. Every order costs a commission and a spread, and on this size those are a real percentage. Buy the largest holdings first and let the small ones wait until the next contribution.',
    })
  }

  if (flow.freeMonthlyUsd > 0) {
    push({
      id: 'automate',
      tag: 'ongoing',
      title: `Automate ${fmtUsd(flow.freeMonthlyUsd)} a month`,
      body: 'A standing order on payday, before you see the money. The research on automatic saving is consistent: the decision to save is made once, or it is made badly every month.',
    })
  }

  push({
    id: 'review',
    tag: 'ongoing',
    title: 'Look at it twice a year and otherwise leave it alone',
    body: 'Rebalance when a holding drifts more than about five percentage points from its target. Checking the price weekly changes nothing except how you feel, and how you feel is the thing most likely to cost you money.',
  })

  return out
}
