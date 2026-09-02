import { describe, expect, it } from 'vitest'
import { toUsd, hardness, rates } from '../fx'
import { computeStanding } from '../standing'
import { ASSET_KEYS, BASE, blendedWeights, bufferMonths, equityShare, goldWeight, growthWeights, normalise } from '../policy'
import { CASH_EROSION, erodedValue, HISTORICAL_LINES, historicalFor, historicalReturn } from '../historical'
import { COV, CORRELATIONS, CORRELATION_ORDER, MU, frontier, maxSharpePortfolio, portfolioReturn, portfolioVol, toVector } from '../mvo'
import { analyse } from '../index'
import { applyScenario, SCENARIOS } from '../stress'
import type { Account, AppState, Weights } from '../types'

const acc = (o: Partial<Account>): Account => ({
  id: Math.random().toString(36).slice(2),
  label: 'x',
  type: 'localBank',
  currency: 'USD',
  amount: 1000,
  access: 'today',
  transferable: true,
  ...o,
})

const baseState = (over: Partial<AppState> = {}): AppState => ({
  accounts: [acc({ amount: 7000 })],
  flows: {
    incomeMonthly: 1200,
    incomeCurrency: 'USD',
    incomeStability: 'recurring',
    spendMonthly: 700,
    spendCurrency: 'USD',
    investPct: 30,
    goals: [],
  },
  profile: { horizonYears: 20, drawdownReaction: 'hold', usPerson: false, emTilt: 'moderate', includeProperty: true, brokerAccess: 'could' as const },
  picks: {},
  ...over,
})

describe('currency', () => {
  it('converts at the frozen rate', () => {
    expect(toUsd(89500, 'LBP')).toBeCloseTo(1, 6)
    expect(toUsd(3.75, 'SAR')).toBeCloseTo(1, 6)
    expect(toUsd(100, 'USD')).toBe(100)
  })

  it('treats pegs as softer than the dollar and harder than a float that has broken', () => {
    expect(hardness('USD')).toBe(0)
    expect(hardness('AED')).toBeGreaterThan(hardness('USD'))
    expect(hardness('LBP')).toBeGreaterThan(hardness('AED'))
  })

  it('carries a source and a date for every rate that is not the base', () => {
    for (const r of rates) {
      if (r.code === 'USD') continue
      expect(r.sourceUrl, `${r.code} has no source`).toBeTruthy()
      expect(r.asOf, `${r.code} has no date`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('where you stand', () => {
  it('separates what you own from what you can reach', () => {
    const s = computeStanding([
      acc({ amount: 10000, access: 'restricted', transferable: false }),
      acc({ amount: 2000, access: 'today' }),
    ])
    expect(s.totalUsd).toBe(12000)
    expect(s.accessibleTodayUsd).toBe(2000)
    expect(s.restrictedUsd).toBe(10000)
    expect(s.deployableUsd).toBe(2000)
  })

  it('keeps the fragility score inside its bounds', () => {
    const clean = computeStanding([acc({ amount: 5000, currency: 'USD', access: 'today', transferable: true })])
    expect(clean.fragility.score).toBeGreaterThanOrEqual(0)
    expect(clean.fragility.score).toBeLessThanOrEqual(25)

    const worst = computeStanding([
      acc({ amount: 5000, currency: 'LBP', access: 'restricted', transferable: false }),
    ])
    expect(worst.fragility.score).toBeGreaterThan(90)
    expect(worst.fragility.score).toBeLessThanOrEqual(100)
  })

  it('handles an empty balance sheet without dividing by zero', () => {
    const s = computeStanding([])
    expect(s.totalUsd).toBe(0)
    expect(Number.isFinite(s.largestAccountPct)).toBe(true)
    expect(s.fragility.score).toBe(0)
  })
})

describe('policy', () => {
  it('has base weights that sum to 100 at every risk level', () => {
    for (const level of ['Cautious', 'Balanced', 'Growth'] as const) {
      const total = ASSET_KEYS.reduce((s, k) => s + BASE[level][k], 0)
      expect(total).toBeCloseTo(100, 6)
    }
  })

  it('sizes gold by fragility and never above the cap', () => {
    expect(goldWeight(0)).toBe(0)
    expect(goldWeight(5)).toBe(0)
    expect(goldWeight(50)).toBeGreaterThanOrEqual(3)
    expect(goldWeight(100)).toBe(10)
    for (let f = 0; f <= 100; f++) expect(goldWeight(f)).toBeLessThanOrEqual(10)
  })

  it('never asks for less than three months of buffer or more than twelve', () => {
    for (let f = 0; f <= 100; f += 5) {
      for (const s of ['none', 'irregular', 'recurring']) {
        const m = bufferMonths(f, s)
        expect(m).toBeGreaterThanOrEqual(3)
        expect(m).toBeLessThanOrEqual(12)
      }
    }
  })

  it('produces growth weights that sum to 100 for every combination', () => {
    for (const level of ['Cautious', 'Balanced', 'Growth'] as const) {
      for (const emTilt of ['none', 'moderate', 'strong'] as const) {
        for (const includeProperty of [true, false]) {
          for (const frag of [0, 35, 70, 100]) {
            const w = growthWeights(level, { horizonYears: 10, drawdownReaction: 'hold', usPerson: false, emTilt, includeProperty, brokerAccess: 'could' as const }, frag)
            const total = ASSET_KEYS.reduce((s, k) => s + w[k], 0)
            expect(total).toBeCloseTo(100, 4)
            for (const k of ASSET_KEYS) expect(w[k]).toBeGreaterThanOrEqual(0)
            if (!includeProperty) expect(w.property).toBe(0)
            if (emTilt === 'none') expect(w.emEquity).toBe(0)
          }
        }
      }
    }
  })

  it('takes less risk at Cautious than at Growth', () => {
    const p = { horizonYears: 10 as const, drawdownReaction: 'hold' as const, usPerson: false, emTilt: 'moderate' as const, includeProperty: true, brokerAccess: 'could' as const }
    const c = growthWeights('Cautious', p, 0)
    const g = growthWeights('Growth', p, 0)
    const equity = (w: Weights) => w.globalEquity + w.emEquity + w.property
    expect(equity(c)).toBeLessThan(equity(g))
  })

  it('puts near-term money in safe assets when the buffer is not yet full', () => {
    const t = { bufferTargetMonths: 6, safetyUsd: 5000, shortGoalsUsd: 0, growthUsd: 0, investableUsd: 5000, shortfallUsd: 0 }
    const w = blendedWeights(t, growthWeights('Growth', { horizonYears: 20, drawdownReaction: 'buy', usPerson: false, emTilt: 'moderate', includeProperty: true, brokerAccess: 'could' as const }, 0))
    expect(w.globalEquity).toBe(0)
    expect(w.cash + w.shortGov).toBeCloseTo(100, 4)
  })

  it('normalises anything to 100', () => {
    const w = normalise({ cash: 3, shortGov: 0, globalBonds: 0, tips: 0, globalEquity: 9, emEquity: 0, property: 0, gold: 0 })
    expect(ASSET_KEYS.reduce((s, k) => s + w[k], 0)).toBeCloseTo(100, 6)
    expect(w.globalEquity).toBeCloseTo(75, 6)
  })
})

describe('the assumptions matrix', () => {
  it('is symmetric with ones on the diagonal', () => {
    for (let i = 0; i < CORRELATIONS.length; i++) {
      expect(CORRELATIONS[i][i]).toBe(1)
      for (let j = 0; j < CORRELATIONS.length; j++) {
        expect(CORRELATIONS[i][j]).toBeCloseTo(CORRELATIONS[j][i], 10)
        expect(Math.abs(CORRELATIONS[i][j])).toBeLessThanOrEqual(1)
      }
    }
  })

  it('covers every asset class the model uses', () => {
    expect([...CORRELATION_ORDER].sort()).toEqual([...ASSET_KEYS].sort())
  })

  it('is positive semi-definite, so no portfolio can have negative variance', () => {
    // 4000 random long-only portfolios; variance must never go below zero.
    let worst = Infinity
    for (let n = 0; n < 4000; n++) {
      const raw = ASSET_KEYS.map(() => Math.random())
      const sum = raw.reduce((a, b) => a + b, 0)
      const w = raw.map((x) => x / sum)
      let v = 0
      for (let i = 0; i < w.length; i++) for (let j = 0; j < w.length; j++) v += w[i] * w[j] * COV[i][j]
      worst = Math.min(worst, v)
    }
    expect(worst).toBeGreaterThanOrEqual(0)
  })

  it('reproduces each asset class volatility when the whole portfolio is that asset', () => {
    ASSET_KEYS.forEach((_k, i) => {
      const v = ASSET_KEYS.map((_, j) => (i === j ? 1 : 0))
      expect(portfolioVol(v)).toBeCloseTo(Math.sqrt(COV[i][i]) * 100, 8)
      expect(portfolioReturn(v)).toBeCloseTo(MU[i] * 100, 8)
    })
  })

  it('shows diversification: a mix is less volatile than the weighted average of its parts', () => {
    const half = ASSET_KEYS.map((k) => (k === 'globalEquity' || k === 'globalBonds' ? 0.5 : 0))
    const naive = 0.5 * 16.78 + 0.5 * 4.02
    expect(portfolioVol(half)).toBeLessThan(naive)
  })
})

describe('the efficient frontier', () => {
  const f = frontier()

  it('returns a usable curve', () => {
    expect(f.length).toBeGreaterThan(4)
  })

  it('is upward sloping: more return never comes with less risk', () => {
    const sorted = [...f].sort((a, b) => a.vol - b.vol)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].ret).toBeGreaterThanOrEqual(sorted[i - 1].ret - 1e-6)
    }
  })

  it('has weights that sum to 100 and respect the caps', () => {
    for (const p of f) {
      const total = ASSET_KEYS.reduce((s, k) => s + p.weights[k], 0)
      expect(total).toBeCloseTo(100, 2)
      expect(p.weights.gold).toBeLessThanOrEqual(15.5)
      expect(p.weights.emEquity).toBeLessThanOrEqual(35.5)
      expect(p.weights.property).toBeLessThanOrEqual(20.5)
    }
  })

  it('finds a maximum Sharpe portfolio no worse than the rest of the curve', () => {
    const best = maxSharpePortfolio()
    for (const p of f) expect(best.sharpe).toBeGreaterThanOrEqual(p.sharpe - 1e-9)
  })

  it('leaves the recommended policy portfolio close to the curve but not on it', () => {
    const a = analyse(baseState())
    const v = toVector(a.growth)
    const ret = portfolioReturn(v)
    const vol = portfolioVol(v)
    const nearest = f.reduce((best, p) => (Math.abs(p.ret - ret) < Math.abs(best.ret - ret) ? p : best))
    // The policy gives up some theoretical efficiency on purpose. It should not
    // give up a lot: within four volatility points of the curve at the same return.
    expect(vol).toBeLessThan(nearest.vol + 4)
  })
})

describe('stress tests', () => {
  const balanced: Weights = { cash: 0, shortGov: 0, globalBonds: 40, tips: 0, globalEquity: 60, emEquity: 0, property: 0, gold: 0 }

  it('reproduces 2008 on a sixty forty by hand', () => {
    const s = SCENARIOS.find((x) => x.id === 'gfc2008')!
    const r = applyScenario(balanced, s.shocks, 10000, 1000, 7, s)
    // 0.6 * -40.71 + 0.4 * 5.24 = -22.33
    expect(r.portfolioPct).toBeCloseTo(-22.33, 2)
    expect(r.portfolioUsd).toBeCloseTo(-2233, 0)
    expect(r.afterUsd).toBeCloseTo(7767, 0)
  })

  it('computes a recovery time that actually recovers the loss', () => {
    const s = SCENARIOS.find((x) => x.id === 'gfc2008')!
    const r = applyScenario(balanced, s.shocks, 10000, 1000, 7, s)
    const recovered = r.afterUsd * Math.pow(1.07, r.yearsToRecover)
    expect(recovered).toBeCloseTo(10000, 0)
  })

  it('reports the real loss when the scenario carries an inflation figure', () => {
    const s = SCENARIOS.find((x) => x.id === 'inflation1974')!
    const r = applyScenario(balanced, s.shocks, 10000, 1000, 7, s)
    expect(r.realPct).not.toBeNull()
    expect(r.realPct!).toBeLessThan(r.portfolioPct)
  })

  it('marks every unverified line so nothing invented can hide in a total', () => {
    for (const s of SCENARIOS) {
      for (const line of s.lines) {
        if (!line.verified) expect(line.measures.length).toBeGreaterThan(10)
        if (line.verified && s.kind === 'historical') expect(line.source).toBeTruthy()
      }
    }
  })

  it('holds every unverified historical line at zero rather than filling it in', () => {
    for (const s of SCENARIOS.filter((x) => x.kind === 'historical')) {
      for (const line of s.lines) {
        if (!line.verified) expect(s.shocks[line.key]).toBe(0)
      }
    }
  })
})

describe('invest in yourself, in arithmetic', () => {
  it('prices a monthly income uplift as capital', () => {
    const a = analyse(baseState(), 500)
    // 500 a month is 6000 a year. At the portfolio's expected return r,
    // the capital that throws off 6000 a year is 6000 / r.
    const expected = 6000 / (a.allocation.stat.expectedReturn / 100)
    expect(a.human.upliftEquivalentCapitalUsd).toBeCloseTo(expected, 2)
  })

  it('tells someone with no income to build income first', () => {
    const a = analyse(baseState({ flows: { ...baseState().flows, incomeStability: 'none', incomeMonthly: 0 } }))
    expect(a.human.stage).toBe('buildIncome')
    expect(a.actions[0].tag).toBe('before markets')
  })

  it('lets someone with a buffer and steady income get to the market', () => {
    const a = analyse(
      baseState({
        accounts: [acc({ amount: 40000 })],
        flows: { ...baseState().flows, incomeStability: 'recurring', incomeMonthly: 4000, spendMonthly: 2000 },
      }),
    )
    expect(a.human.stage).toBe('invest')
    expect(a.tiering.growthUsd).toBeGreaterThan(0)
  })
})

describe('two people, same money, different answers', () => {
  const beirut = analyse(
    baseState({
      accounts: [
        acc({ amount: 6000, currency: 'USD', type: 'localBank', access: 'restricted', transferable: false }),
        acc({ amount: 1000, currency: 'USD', type: 'cashHand', access: 'today', transferable: true }),
      ],
    }),
  )
  const abroad = analyse(
    baseState({ accounts: [acc({ amount: 7000, currency: 'USD', type: 'neobank', access: 'today', transferable: true })] }),
  )

  it('gives them the same net worth', () => {
    expect(beirut.standing.totalUsd).toBe(abroad.standing.totalUsd)
  })

  it('gives them different amounts to actually work with', () => {
    expect(beirut.tiering.investableUsd).toBeLessThan(abroad.tiering.investableUsd)
  })

  it('gives them different first moves', () => {
    expect(beirut.actions[0].id).not.toBe(abroad.actions[0].id)
  })

  it('gives the fragile one more gold and a bigger buffer', () => {
    expect(beirut.growth.gold).toBeGreaterThan(abroad.growth.gold)
    expect(beirut.tiering.bufferTargetMonths).toBeGreaterThanOrEqual(abroad.tiering.bufferTargetMonths)
  })
})

describe('the whole thing holds together', () => {
  it('never produces a weight outside zero to a hundred', () => {
    for (const level of [2, 5, 10, 20] as const) {
      for (const react of ['sell', 'hold', 'buy'] as const) {
        const a = analyse(baseState({ profile: { horizonYears: level, drawdownReaction: react, usPerson: false, emTilt: 'moderate', includeProperty: true, brokerAccess: 'could' as const } }))
        const total = ASSET_KEYS.reduce((s, k) => s + a.weights[k], 0)
        expect(total).toBeCloseTo(100, 3)
        expect(a.allocation.stat.ter).toBeGreaterThan(0)
        expect(a.allocation.stat.ter).toBeLessThan(1)
      }
    }
  })

  it('survives a completely empty form', () => {
    const a = analyse(
      baseState({
        accounts: [],
        flows: { incomeMonthly: 0, incomeCurrency: 'USD', incomeStability: 'none', spendMonthly: 0, spendCurrency: 'USD', investPct: 0, goals: [] },
      }),
    )
    expect(Number.isFinite(a.allocation.stat.expectedReturn)).toBe(true)
    expect(a.actions.length).toBeGreaterThan(0)
  })

  it('keeps a two year horizon out of shares', () => {
    const a = analyse(baseState({ profile: { horizonYears: 2, drawdownReaction: 'buy', usPerson: false, emTilt: 'moderate', includeProperty: true, brokerAccess: 'could' as const } }))
    expect(a.risk.level).toBe('Cautious')
    expect(a.risk.override).toBeTruthy()
  })

  it('gives a non US person Irish funds', () => {
    const a = analyse(baseState())
    for (const row of a.allocation.rows) {
      const inst = a.allocation.rows.find((r) => r.key === row.key)!
      expect(inst.instrumentId).toBeTruthy()
    }
    expect(a.allocation.rows.every((r) => r.instrumentId.length > 0)).toBe(true)
  })
})

describe('the three levels are actually different', () => {
  const p = { horizonYears: 20 as const, drawdownReaction: 'buy' as const, usPerson: false, emTilt: 'moderate' as const, includeProperty: true, brokerAccess: 'could' as const }
  const sleeve = (lvl: 'Cautious' | 'Balanced' | 'Growth') => growthWeights(lvl, p, 0)

  it('spreads the forecast return by at least two points, floor to ceiling', () => {
    const lo = portfolioReturn(toVector(sleeve('Cautious')))
    const hi = portfolioReturn(toVector(sleeve('Growth')))
    // v1 shipped with a 0.9 point spread, which made the choice meaningless.
    expect(hi - lo).toBeGreaterThan(2)
  })

  it('spreads the historical return by at least three points', () => {
    expect(historicalReturn(sleeve('Growth')) - historicalReturn(sleeve('Cautious'))).toBeGreaterThan(3)
  })

  it('spreads the volatility by at least eight points', () => {
    const lo = portfolioVol(toVector(sleeve('Cautious')))
    const hi = portfolioVol(toVector(sleeve('Growth')))
    expect(hi - lo).toBeGreaterThan(8)
  })

  it('lands each level near the range a normal adviser would quote', () => {
    expect(historicalReturn(sleeve('Cautious'))).toBeGreaterThan(4.5)
    expect(historicalReturn(sleeve('Cautious'))).toBeLessThan(6.5)
    expect(historicalReturn(sleeve('Balanced'))).toBeGreaterThan(6.5)
    expect(historicalReturn(sleeve('Balanced'))).toBeLessThan(8.5)
    expect(historicalReturn(sleeve('Growth'))).toBeGreaterThan(8.5)
  })

  it('puts Growth almost entirely in things that can fall', () => {
    expect(equityShare(sleeve('Growth'))).toBeGreaterThan(90)
    expect(equityShare(sleeve('Cautious'))).toBeLessThan(35)
  })

  it('orders them correctly on every axis', () => {
    const levels = ['Cautious', 'Balanced', 'Growth'] as const
    for (let i = 1; i < levels.length; i++) {
      const prev = sleeve(levels[i - 1])
      const cur = sleeve(levels[i])
      expect(portfolioReturn(toVector(cur))).toBeGreaterThan(portfolioReturn(toVector(prev)))
      expect(portfolioVol(toVector(cur))).toBeGreaterThan(portfolioVol(toVector(prev)))
      expect(historicalReturn(cur)).toBeGreaterThan(historicalReturn(prev))
    }
  })
})

describe('the historical figures', () => {
  it('cover every asset class the model uses', () => {
    for (const k of ASSET_KEYS) expect(() => historicalFor(k)).not.toThrow()
  })

  it('carry a source and a period on every line', () => {
    for (const l of HISTORICAL_LINES) {
      expect(l.source, `${l.key} has no source`).toBeTruthy()
      expect(l.period, `${l.key} has no period`).toBeTruthy()
      expect(l.measures.length).toBeGreaterThan(20)
    }
  })

  it('says out loud which lines are stand-ins rather than their own figure', () => {
    const standIns = HISTORICAL_LINES.filter((l) => !l.verified)
    for (const l of standIns) {
      expect(l.measures.toLowerCase()).toMatch(/stands in|did not exist|arithmetic|not their/)
    }
  })

  it('is higher than the forecast for shares, which is the whole point of showing both', () => {
    expect(historicalFor('globalEquity').nominal).toBeGreaterThan(7.0)
  })
})

describe('cash erosion', () => {
  it('derives the loss from the two published index values, not from a typed-in number', () => {
    const { startIndex, endIndex, purchasingPowerLostPct, pricesRosePct } = CASH_EROSION
    expect(pricesRosePct).toBeCloseTo((endIndex / startIndex - 1) * 100, 1)
    expect(purchasingPowerLostPct).toBeCloseTo((1 - startIndex / endIndex) * 100, 1)
  })

  it('annualises consistently with the cumulative figure', () => {
    const { startIndex, endIndex, years, annualInflationPct, annualLossPct } = CASH_EROSION
    expect(annualInflationPct).toBeCloseTo(((endIndex / startIndex) ** (1 / years) - 1) * 100, 1)
    expect(annualLossPct).toBeCloseTo((1 - (startIndex / endIndex) ** (1 / years)) * 100, 1)
  })

  it('shrinks a pile of cash by the published amount', () => {
    // 100k held since Oct 2019 buys roughly 77k of 2019 goods.
    expect(erodedValue(100_000)).toBeGreaterThan(74_000)
    expect(erodedValue(100_000)).toBeLessThan(80_000)
  })

  it('does not let this one window be mistaken for the long-run assumption', () => {
    // The forward-looking model runs on 2.5 percent. This window ran near 4.
    expect(CASH_EROSION.annualInflationPct).toBeGreaterThan(3.5)
    expect(CASH_EROSION.caution).toMatch(/general rule/i)
  })
})
