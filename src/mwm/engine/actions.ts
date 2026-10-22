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
      title: 'Leave Stuck money out of your plan',
      body: `You have ${fmtUsd(standing.totalUsd)}, and you can really use ${fmtUsd(standing.accessibleTodayUsd)} of it. Plan with ${fmtUsd(standing.accessibleTodayUsd)}. Keep trying to get the rest out, but do not count it as savings, because money you cannot take out will not pay a bill.`,
    })
  }

  if (flow.surplusUsd < 0 && flow.incomeUsd > 0) {
    push({
      id: 'deficit',
      tag: 'before markets',
      title: `You spend ${fmtUsd(Math.abs(flow.surplusUsd))} a month more than you earn`,
      body: 'Nothing else on this page works while more money goes out than comes in. Each month like this eats into your rainy-day money, and the rest of the plan stands on that money.',
    })
  } else if (flow.incomeUsd <= 0 && flow.spendUsd > 0) {
    push({
      id: 'deficit',
      tag: 'before markets',
      title: `You are living on savings: ${fmtUsd(flow.spendUsd)} a month`,
      body: 'Every month is paid for from what you already have. That is fine for a while, as long as you know how many months it lasts and what will start your income.',
    })
  }

  if (human.stage === 'buildIncome') {
    push({
      id: 'income',
      tag: 'before markets',
      title: 'Put money into your earning power first',
      body: `At the return this tool expects, ${fmtUsd(human.investableUsd)} invested earns about ${fmtUsd(human.marketIncomeMonthUsd)} a month. Earning ${fmtUsd(human.upliftMonthlyUsd)} more each month is worth the same as having ${fmtUsd(human.upliftEquivalentCapitalUsd)} invested. If that second amount is many times what you have, money spent on your skills and earning power beats money put in a fund, by a long way.`,
    })
  }

  if (tiering.shortfallUsd > 0) {
    push({
      id: 'buffer',
      tag: 'first',
      title: `Build up ${tiering.bufferTargetMonths} months of rainy-day money`,
      body: `You need ${fmtUsd(tiering.shortfallUsd)} more to get there. Keep it in cash, or in a fund that holds short US government loans (very safe, pays a little interest). It is meant to be boring: it stops you selling your investments at the worst moment, which is the mistake that really costs people their gains.`,
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
      title: 'Open a second account somewhere else',
      body: `${reachLargestPct.toFixed(0)} percent of the money you can really use is in one place. A second account in your own name, at a bank or app with no link to the first, means one problem cannot hit all of it.`,
    })
  }

  if (standing.nonTransferablePct > 40 && standing.deployableUsd > 0) {
    push({
      id: 'route',
      tag: 'first',
      title: 'Set up a way to send money abroad',
      body: 'Much of what you have cannot leave the country. Open one way to send money out now, while nothing is wrong, and test it with a small amount. That is worth more than any choice about how to split your money.',
    })
  }

  const investing = human.stage === 'invest' && flow.spendUsd > 0

  if (tiering.growthUsd > 0 && !investing) {
    push({
      id: 'park',
      tag: 'then',
      title: 'Keep long-term money safe until income is steady',
      body: `Keep ${tiering.bufferTargetMonths} months of spending where you can get it fast. The rest can wait in a fund that holds short US government loans (very safe, pays a little interest) until your income is steady. Or, if you are sure you will not need it for five years, put it into the mix on the Invest tab.`,
    })
  }

  if (tiering.growthUsd > 0 && investing && noBrokerRoute) {
    push({
      id: 'noBroker',
      tag: 'then',
      title: 'Find a way to invest before picking funds',
      body: `You said an investing app or broker abroad (a company that buys funds for you) is not realistic, so the mix on the Invest tab is a goal, not a shopping list. What usually still works without one: gold coins or bars bought locally, cash in a strong currency kept outside a shaky bank, and paying off any debt, which saves you its interest with no risk. Ask the broker question again once a year, because what blocks you now often changes.`,
    })
  }

  if (tiering.growthUsd > 0 && investing && !hasBrokerage && !noBrokerRoute) {
    push({
      id: 'broker',
      tag: 'then',
      title: 'Open an investing account',
      body: 'It takes a few days with an investing app or broker (a company that buys funds for you), and it is the step people put off for years. The account, and the account you pay in from, must both be in your own name. If you are not a US citizen or resident, the funds shown here are Irish ones, and the Why? on the Invest tab explains the reason.',
    })
  }

  if (tiering.growthUsd > 0 && investing && !noBrokerRoute) {
    push({
      id: 'buy',
      tag: 'then',
      title: `Invest ${fmtUsd(tiering.growthUsd)} in two or three purchases`,
      body: 'Not twelve. Each purchase costs a fee and a small extra on the price, and on an amount this size that is a real share of it. Buy the biggest parts of the mix first, and leave the small ones until you next add money.',
    })
  }

  if (flow.freeMonthlyUsd > 0) {
    push({
      id: 'automate',
      tag: 'ongoing',
      title: `Save ${fmtUsd(flow.freeMonthlyUsd)} a month automatically`,
      body: 'Set up an automatic transfer on payday, before you see the money. Research on automatic saving keeps finding the same thing: you decide to save once, or you end up deciding badly every month.',
    })
  }

  push({
    id: 'review',
    tag: 'ongoing',
    title: 'Check it twice a year, then leave it alone',
    body: 'If one part of your mix drifts more than about five percentage points from its target, buy or sell a little to bring it back. Checking prices every week changes nothing except how you feel, and your feelings are the thing most likely to cost you money.',
  })

  return out
}
