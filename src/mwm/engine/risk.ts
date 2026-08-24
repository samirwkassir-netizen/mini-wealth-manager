import type { FlowResult, Flows, Profile, RiskLevel, RiskResult } from './types'

export const RISK_LEVELS: RiskLevel[] = ['Cautious', 'Balanced', 'Growth']

export const RISK_DESCRIPTION: Record<RiskLevel, string> = {
  Cautious:
    'Built to be left alone through a bad year without you touching it. Gives up return to do that, and the giving up is the point.',
  Balanced:
    'Most of the long-run growth, most of the time, with enough in defensive assets that a bad year is survivable rather than frightening.',
  Growth:
    'Nearly all shares. Expects to be worth a lot more in fifteen years and expects to lose a third of its value somewhere along the way.',
}

export function computeRisk(profile: Profile, flows: Flows, flow: FlowResult): RiskResult {
  const horizonPoints = profile.horizonYears >= 20 ? 5 : profile.horizonYears >= 10 ? 4 : profile.horizonYears >= 5 ? 2 : 0
  const reactionPoints = profile.drawdownReaction === 'buy' ? 5 : profile.drawdownReaction === 'hold' ? 3 : 0
  const stabilityPoints = flows.incomeStability === 'recurring' ? 3 : flows.incomeStability === 'irregular' ? 1 : 0
  const runway = flow.runwayAccessibleMonths
  const runwayPoints = runway >= 12 ? 3 : runway >= 6 ? 2 : runway >= 3 ? 1 : 0

  const score = horizonPoints + reactionPoints + stabilityPoints + runwayPoints
  const max = 16

  let level: RiskLevel = score <= 5 ? 'Cautious' : score <= 11 ? 'Balanced' : 'Growth'
  let override: string | null = null

  if (profile.horizonYears <= 2 && level !== 'Cautious') {
    level = 'Cautious'
    override =
      'Overridden to Cautious. You said you may need this money within about two years. Over two years, shares are close to a coin toss, and no score should be allowed to argue with that.'
  }

  if (profile.drawdownReaction === 'sell' && level === 'Growth') {
    level = 'Balanced'
    override =
      'Overridden down one level. You said you would sell if it fell 30 percent. A portfolio you sell at the bottom returns less than a smaller one you hold, so the honest answer is to hold less risk rather than to promise you will behave differently next time.'
  }

  return {
    level,
    score,
    max,
    override,
    parts: [
      {
        label: 'How long until you need it',
        points: horizonPoints,
        max: 5,
        detail: `${profile.horizonYears} years. Time is the only thing that reliably converts the volatility of shares into their return.`,
      },
      {
        label: 'What you would do in a crash',
        points: reactionPoints,
        max: 5,
        detail:
          profile.drawdownReaction === 'sell'
            ? 'You said you would sell. That is an honest answer and it is worth more than a brave one.'
            : profile.drawdownReaction === 'hold'
              ? 'You said you would hold. Most people say this and about half of them do it.'
              : 'You said you would buy more. That is the right answer and it requires cash sitting there to be true.',
      },
      {
        label: 'How reliable your income is',
        points: stabilityPoints,
        max: 3,
        detail:
          flows.incomeStability === 'recurring'
            ? 'Recurring income lets a portfolio be left alone, which is most of what makes it work.'
            : 'Income that stops and starts eventually forces a sale at a bad price.',
      },
      {
        label: 'How much reachable money you already have',
        points: runwayPoints,
        max: 3,
        detail: `${runway.toFixed(1)} months of spending in money you can get to. This is what stands between a bad month and a forced sale.`,
      },
    ],
  }
}
