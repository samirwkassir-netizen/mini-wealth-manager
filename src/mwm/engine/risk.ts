import type { FlowResult, Flows, Profile, RiskLevel, RiskResult } from './types'

export const RISK_LEVELS: RiskLevel[] = ['Cautious', 'Balanced', 'Growth']

export const RISK_DESCRIPTION: Record<RiskLevel, string> = {
  Cautious:
    'Made to be left alone through a bad year without you touching it. It grows more slowly to do that, and that is the point.',
  Balanced:
    'Most of the long-term growth, most of the time, with enough in safer things that a bad year feels bearable, not frightening.',
  Growth:
    'Nearly all shares. Expect it to be worth a lot more in fifteen years, and expect it to lose a third of its value at some point along the way.',
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
      'Set to Cautious. You said you may need this money within about two years. Over two years, shares go up or down almost like a coin toss, and no score should argue with that.'
  }

  if (profile.drawdownReaction === 'sell' && level === 'Growth') {
    level = 'Balanced'
    override =
      'Moved down one level. You said you would sell if it fell 30 percent. Investments you sell at the bottom earn less than a safer mix you keep, so it is better to take less risk than to promise you will act differently next time.'
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
        detail: `${profile.horizonYears} years. Time is the only thing that reliably turns the ups and downs of shares into growth.`,
      },
      {
        label: 'What you would do in a crash',
        points: reactionPoints,
        max: 5,
        detail:
          profile.drawdownReaction === 'sell'
            ? 'You said you would sell. That is an honest answer, and it is worth more than a brave one.'
            : profile.drawdownReaction === 'hold'
              ? 'You said you would wait. Most people say this, and about half of them actually do it.'
              : 'You said you would buy more. That is the right answer, but it only works if you have cash ready to do it.',
      },
      {
        label: 'How steady your income is',
        points: stabilityPoints,
        max: 3,
        detail:
          flows.incomeStability === 'recurring'
            ? 'Steady income lets your investments be left alone, which is most of what makes them work.'
            : 'Income that stops and starts will one day force you to sell at a bad price.',
      },
      {
        label: 'How much money you can already use',
        points: runwayPoints,
        max: 3,
        detail: `${runway.toFixed(1)} months of spending in money you can really use. This is what stops a bad month from forcing you to sell.`,
      },
    ],
  }
}
