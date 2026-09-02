/**
 * Every dial inside the model, in one place, on screen.
 *
 * The published numbers this tool uses all carry a source and a date. These
 * are the other kind of number: the ones we chose. Weights, caps, floors,
 * thresholds. They are defensible, not derivable, and a tool that hides them
 * is asking to be trusted instead of checked.
 *
 * Each entry says what the dial is set to, why, and the situation in which
 * you should not trust it. If a value here disagrees with the code, that is
 * a bug, and there are tests that check the ones a test can reach.
 */

export interface Dial {
  id: string
  area: 'fragility' | 'buffer' | 'allocation' | 'risk' | 'stress'
  label: string
  value: string
  why: string
  distrust: string
}

export const DIALS: Dial[] = [
  {
    id: 'fragility-weights',
    area: 'fragility',
    label: 'The four fragility ingredients weigh 25 points each',
    value: 'Money you cannot reach, money that cannot leave, concentration, soft currency: 25 each, 100 total',
    why: 'There is no published dataset that says trapped money matters 1.7 times more than concentration. Equal weights are the honest default when you cannot defend anything finer.',
    distrust:
      'When one risk clearly dominates your life. If 90 percent of your money is behind a withdrawal limit, your real fragility is worse than a 25-point cap can say.',
  },
  {
    id: 'fragility-days',
    area: 'fragility',
    label: 'Slow money counts 40 percent as unreachable',
    value: 'An account you marked as slow or limited contributes 0.4 of its weight to the unreachable score',
    why: 'Slow money is somewhere between free and frozen. Without a declared limit the tool cannot know where, so it takes a middle position and says so.',
    distrust: 'If you declared a monthly limit, look at the timeline view instead. It uses your number, not this coefficient.',
  },
  {
    id: 'fragility-concentration',
    area: 'fragility',
    label: 'Concentration scores nothing below 40 percent',
    value: 'The largest-account score runs from 40 percent of your money in one place (0 points) to 100 percent (full points)',
    why: 'Two accounts at 60/40 is a normal, sane arrangement. The score is for the person with everything behind one login, not for failing to hold five banks.',
    distrust: 'When your one institution is the specific thing at risk. A perfectly diversified score of zero does not help if the single account is at a bank in trouble.',
  },
  {
    id: 'hardness',
    area: 'fragility',
    label: 'How hard each currency counts',
    value: 'Dollar 0. Euro and pound 0. Gulf pegs 0.15. Lira 0.85. Official-rate currencies 1. Other managed floats 0.8',
    why: 'A peg is a policy, not a law of nature, so pegged money is not quite dollars. A currency quoted at an official rate you cannot transact at is doing the most work of all.',
    distrust:
      'These are judgments, not measurements. A peg can hold for fifty years or break on a Tuesday. If you believe your peg breaks, the currency stress dial is yours to set.',
  },
  {
    id: 'buffer-formula',
    area: 'buffer',
    label: 'Emergency money runs from 3 to 12 months',
    value: '3 months for everyone, up to 6 more as fragility rises, up to 3 more as income steadiness falls, capped at 12',
    why: 'Three months is the standard advice floor. The rest is earned: a fragile balance sheet or a stop-start income makes a forced sale more likely, and the buffer is what prevents one.',
    distrust:
      'If your income could vanish for a year at a time, twelve months may still be thin. The cap exists so the tool never tells anyone to hold only cash forever.',
  },
  {
    id: 'gold-formula',
    area: 'allocation',
    label: 'Gold runs from 0 to 10 percent, sized by fragility',
    value: 'Nothing below a fragility of 10. Then 3 to 10 percent, scaling with the score',
    why: 'Gold is the one asset with no issuer. The case for it scales with how much of your wealth depends on an institution keeping a promise, which is what the fragility score measures.',
    distrust:
      'This is the tool’s single most opinionated dial and it departs from standard models on purpose. If your institutions are fine, the standard model is right and this allocation is a drag.',
  },
  {
    id: 'safety-split',
    area: 'allocation',
    label: 'The safety tier is 60 percent cash, 40 percent short government bonds',
    value: '60/40 across the emergency money and everything needed within three years',
    why: 'All of it must be boring and reachable. The bond share earns slightly more than cash while staying close to it; the cash share is for the week the problem actually happens.',
    distrust: 'When your access to a bond fund is the thing in doubt. Then the split collapses to cash and that is fine.',
  },
  {
    id: 'goal-buckets',
    area: 'allocation',
    label: 'Three years is the line between saving and investing',
    value: 'Goals inside 36 months are funded from safe assets. Only money needed later may take equity risk',
    why: 'Over short windows shares are close to a coin toss. Three years is a round, defensible line for when the toss starts tilting your way.',
    distrust: 'It is a line, not a law. At 35 months and at 37 months the world is the same. Treat the boundary as a reminder, not a rule.',
  },
  {
    id: 'risk-points',
    area: 'risk',
    label: 'How the risk score adds up',
    value: 'Horizon up to 5, crash reaction up to 5, income steadiness up to 3, existing runway up to 3. Cautious to 5, Balanced to 11, Growth above',
    why: 'The two big weights go to the two things that actually destroy portfolios: needing money too soon, and selling at the bottom.',
    distrust: 'Any scoring of temperament from one question is crude. The override below exists because the score cannot be trusted on its own.',
  },
  {
    id: 'risk-overrides',
    area: 'risk',
    label: 'Two answers beat the score',
    value: 'A horizon under about two years forces Cautious. Saying you would sell in a crash moves you down one level',
    why: 'No score should argue someone with next year’s tuition into equities, and a portfolio you sell at the bottom returns less than a smaller one you hold.',
    distrust: 'If you answered the crash question aspirationally, the override under-corrects. The honest answer is worth more than the brave one.',
  },
  {
    id: 'mvo-caps',
    area: 'allocation',
    label: 'What the optimiser is not allowed to do',
    value: 'Emerging market shares capped at 35 percent, listed property 20, gold 15, inflation-linked bonds 40',
    why: 'Uncapped, an optimiser hands its whole budget to whatever scored best, which is how the technique earned the nickname error maximiser.',
    distrust: 'The caps are judgment. Different caps give a different frontier, which is one more reason the recommendation is a policy rather than the curve.',
  },
  {
    id: 'policy-weights',
    area: 'allocation',
    label: 'The three policy mixes are round numbers',
    value: 'Cautious, Balanced and Growth are hand-set weights in increments of whole percent',
    why: 'An allocation stated to one decimal place implies a precision the inputs do not have. The houses disagree with each other by whole percentage points.',
    distrust: 'Round numbers are still choices. The frontier chart shows exactly how much theoretical efficiency they give up.',
  },
  {
    id: 'uplift-default',
    area: 'allocation',
    label: 'The default income uplift in the self-investment section',
    value: 'A quarter of your monthly income, clamped between 200 and 2,000 dollars, rounded to 50',
    why: 'The section needs a starting number to do arithmetic on. A quarter of income is a plausible raise, not a promise. The slider exists because the right number is yours.',
    distrust: 'Always. It is a placeholder for your own estimate, which is why it is the one number on the page you are pushed to drag.',
  },
  {
    id: 'sim-order',
    area: 'stress',
    label: 'What the timeline simulation refuses to schedule',
    value: 'It spends reachable money first, then declared drips. Slow money with no declared limit and trapped money never arrive. It stops at 60 months',
    why: 'Scheduling money with no timetable means inventing the timetable. The simulation would rather show a shorter, real runway than a longer, imagined one.',
    distrust:
      'It is conservative by construction. Slow money usually does arrive eventually, so your true position is somewhere between this floor and the total on your screen.',
  },
]

export const DIALS_NOTE =
  'Two kinds of numbers run this tool. Published figures, which carry sources and dates in the tables above. And these: the weights, caps and thresholds we set ourselves. They are defensible, not derivable. Anyone who tells you their model has no hand-set dials is hiding them.'
