import type { Account, AppState, FlowResult, HumanCapital, Standing, Tiering } from './types'
import { fmtUsd } from './fx'

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

  if (flow.surplusUsd < 0) {
    push({
      id: 'deficit',
      tag: 'before markets',
      title: `Close a gap of ${fmtUsd(Math.abs(flow.surplusUsd))} a month`,
      body: 'Nothing else on this page works while more goes out than comes in. Every month of deficit eats a month of buffer, and buffer is what an allocation is built on.',
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

  if (standing.largestAccountPct > 70 && standing.totalUsd > 0) {
    push({
      id: 'split',
      tag: 'first',
      title: 'Open a second account somewhere unrelated',
      body: `${standing.largestAccountPct.toFixed(0)} percent of your money is in one place. Splitting it costs nothing and removes the only risk on this page that can take everything at once.`,
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

  if (tiering.growthUsd > 0 && noBrokerRoute) {
    push({
      id: 'noBroker',
      tag: 'then',
      title: 'Work the access problem before the allocation',
      body: `You said a foreign brokerage is not realistic. Then the mix below is a target, not a shopping list. What is usually still reachable without one: physical gold bought locally, hard-currency cash held outside the fragile bank, and paying down any debt you carry, which earns its interest rate risk-free. Revisit the broker question once a year. The situation that makes it impossible has a habit of changing.`,
    })
  }

  if (tiering.growthUsd > 0 && !hasBrokerage && !noBrokerRoute) {
    push({
      id: 'broker',
      tag: 'then',
      title: 'Open the brokerage account',
      body: 'It takes a few days and it is the step people put off for years. The account has to be in your own name and funded from an account in your own name. If you are not a US person, the funds this tool points you to are Irish, and the reason is in the tax panel below.',
    })
  }

  if (tiering.growthUsd > 0 && !noBrokerRoute) {
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
      body: 'A standing order on payday, before you see the money. Every study of this finds the same thing: the decision to save is made once, or it is made badly every month.',
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
