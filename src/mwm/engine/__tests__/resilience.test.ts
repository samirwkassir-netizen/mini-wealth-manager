import { describe, expect, it } from 'vitest'
import { accessibleAtMonth, computeLiquidity } from '../liquidity'
import { applyFxStress, mismatchReadout, parallelGaps, touchedCurrencies } from '../fxStress'
import { NO_STRESS, simulateBreaks } from '../breaksFirst'
import { DIALS, DIALS_NOTE } from '../dials'
import { bufferMonths, goldWeight } from '../policy'
import type { Account, Flows } from '../types'
import { rate } from '../fx'

const acc = (o: Partial<Account>): Account => ({
  id: Math.random().toString(36).slice(2),
  label: '',
  type: 'localBank',
  currency: 'USD',
  amount: 1000,
  access: 'today',
  transferable: true,
  ...o,
})

const flows = (o: Partial<Flows> = {}): Flows => ({
  incomeMonthly: 0,
  incomeCurrency: 'USD',
  incomeStability: 'none',
  spendMonthly: 500,
  spendCurrency: 'USD',
  investPct: 0,
  goals: [],
  ...o,
})

describe('the liquidity timeline', () => {
  const accounts = [
    acc({ amount: 1000, access: 'today' }),
    acc({ amount: 1200, access: 'days', monthlyCap: 300 }),
    acc({ amount: 800, access: 'days' }), // slow, no declared limit
    acc({ amount: 5000, access: 'restricted' }),
  ]

  it('sorts every dollar into exactly one band', () => {
    const l = computeLiquidity(accounts)
    expect(l.nowUsd).toBe(1000)
    expect(l.drippingUsd).toBe(1200)
    expect(l.unknownUsd).toBe(800)
    expect(l.trappedUsd).toBe(5000)
    expect(l.nowUsd + l.drippingUsd + l.unknownUsd + l.trappedUsd).toBeCloseTo(l.totalUsd, 6)
  })

  it('drips at the declared rate and not a dollar faster', () => {
    expect(accessibleAtMonth(accounts, 0)).toBe(1000)
    expect(accessibleAtMonth(accounts, 1)).toBe(1300)
    expect(accessibleAtMonth(accounts, 2)).toBe(1600)
    expect(accessibleAtMonth(accounts, 4)).toBe(2200)
    // The drip is exhausted at month 4. Month 12 adds nothing more.
    expect(accessibleAtMonth(accounts, 12)).toBe(2200)
  })

  it('refuses to schedule money with no declared timetable', () => {
    // The 800 with no cap and the 5000 trapped never enter the curve.
    const l = computeLiquidity(accounts)
    const last = l.points[l.points.length - 1]
    expect(last.usd).toBe(2200)
    expect(l.dripDoneMonth).toBe(4)
  })

  it('is monotone: more time never means less access', () => {
    const l = computeLiquidity(accounts)
    for (let i = 1; i < l.points.length; i++) {
      expect(l.points[i].usd).toBeGreaterThanOrEqual(l.points[i - 1].usd)
    }
  })

  it('handles no accounts and no drips without breaking', () => {
    const l = computeLiquidity([])
    expect(l.totalUsd).toBe(0)
    expect(l.dripDoneMonth).toBeNull()
    expect(l.points.every((p) => p.usd === 0)).toBe(true)
  })
})

describe('the currency stress test', () => {
  it('halves the dollar value of holdings in a currency that halves', () => {
    const accounts = [acc({ amount: 89500 * 2000, currency: 'LBP' }), acc({ amount: 3000, currency: 'USD' })]
    const r = applyFxStress(accounts, flows(), { LBP: -50 })
    expect(r.totalUsd).toBeCloseTo(5000, 0)
    expect(r.totalAfterUsd).toBeCloseTo(4000, 0)
  })

  it('moves income and spending with their own currencies', () => {
    const f = flows({ incomeMonthly: 89500 * 1000, incomeCurrency: 'LBP', spendMonthly: 600, spendCurrency: 'USD' })
    const r = applyFxStress([acc({ amount: 6000 })], f, { LBP: -60 })
    expect(r.incomeUsd).toBeCloseTo(1000, 0)
    expect(r.incomeAfterUsd).toBeCloseTo(400, 0)
    expect(r.spendAfterUsd).toBeCloseTo(600, 0)
    // Earn soft, spend hard: the surplus collapses.
    expect(r.surplusUsd).toBeCloseTo(400, 0)
    expect(r.surplusAfterUsd).toBeCloseTo(-200, 0)
  })

  it('shows the good side of the trade: hard income, soft spending', () => {
    const f = flows({ incomeMonthly: 1000, incomeCurrency: 'USD', spendMonthly: 600 * 89500, spendCurrency: 'LBP' })
    const r = applyFxStress([acc({ amount: 6000 })], f, { LBP: -60 })
    expect(r.spendAfterUsd).toBeCloseTo(240, 0)
    expect(r.surplusAfterUsd).toBeGreaterThan(r.surplusUsd)
    // Runway stretches when your costs reprice down.
    expect(r.runwayAfterMonths).toBeGreaterThan(r.runwayMonths)
  })

  it('never lets a currency lose more than everything', () => {
    const r = applyFxStress([acc({ amount: 89500 * 1000, currency: 'LBP' })], flows(), { LBP: -250 })
    expect(r.totalAfterUsd).toBe(0)
  })

  it('lists the currencies a person actually touches, softest first', () => {
    const accounts = [acc({ amount: 1000, currency: 'USD' }), acc({ amount: 1000 * 89500, currency: 'LBP' })]
    const f = flows({ incomeMonthly: 500, incomeCurrency: 'EUR', spendMonthly: 100, spendCurrency: 'AED' })
    const list = touchedCurrencies(accounts, f)
    expect(list).toContain('LBP')
    expect(list).toContain('EUR')
    expect(list).toContain('AED')
    expect(list).not.toContain('USD')
    expect(list[0]).toBe('LBP')
  })
})

describe('the mismatch readout', () => {
  it('knows which side of the trade you are on', () => {
    expect(mismatchReadout([], flows({ incomeCurrency: 'USD', spendCurrency: 'LBP' })).side).toBe('good')
    expect(mismatchReadout([], flows({ incomeCurrency: 'LBP', spendCurrency: 'USD' })).side).toBe('bad')
    expect(mismatchReadout([], flows({ incomeCurrency: 'USD', spendCurrency: 'USD' })).side).toBe('neutral')
  })

  it('measures the share of holdings softer than the spending currency', () => {
    const accounts = [acc({ amount: 89500 * 3000, currency: 'LBP' }), acc({ amount: 1000, currency: 'USD' })]
    const m = mismatchReadout(accounts, flows({ spendCurrency: 'USD' }))
    expect(m.holdingsSofterThanSpendPct).toBeCloseTo(75, 0)
  })
})

describe('the official-versus-street gap', () => {
  it('computes the haircut from the two published rates', () => {
    // Read the frozen rates rather than hard-coding them, so refreshing fx.json does not break the test.
    const ngn = rate('NGN')
    const amount = ngn.perUsd * 1000
    const gaps = parallelGaps([acc({ amount, currency: 'NGN' })])
    expect(gaps).toHaveLength(1)
    expect(gaps[0].usdAtOfficial).toBeCloseTo(1000, 0)
    expect(gaps[0].usdAtParallel).toBeCloseTo(amount / (ngn.parallelPerUsd as number), 0)
    expect(gaps[0].gapPct).toBeLessThan(0)
    expect(gaps[0].gapPct).toBeGreaterThan(-10)
  })

  it('stays silent for currencies with a single rate', () => {
    expect(parallelGaps([acc({ amount: 1000, currency: 'USD' })])).toHaveLength(0)
    expect(parallelGaps([acc({ amount: 1000, currency: 'EUR' })])).toHaveLength(0)
  })
})

describe('what breaks first', () => {
  it('computes survival by hand: cash only, income stopped', () => {
    const r = simulateBreaks([acc({ amount: 1000 })], flows({ spendMonthly: 500 }), {
      incomeStops: true,
      fxShocks: {},
      slowMoneyFreezes: false,
    })
    expect(r.survivalMonths).toBe(2)
    expect(r.events.find((e) => e.id === 'cashOut')?.month).toBe(2)
  })

  it('lets a declared drip extend the runway, and no further than it should', () => {
    const accounts = [acc({ amount: 1000 }), acc({ amount: 1200, access: 'days', monthlyCap: 300 })]
    // Burn 500 a month. Pool: 1000, +300 drip for four months.
    // m1 800, m2 600, m3 400, m4 200, m5 fails.
    const r = simulateBreaks(accounts, flows({ spendMonthly: 500 }), {
      incomeStops: true,
      fxShocks: {},
      slowMoneyFreezes: false,
    })
    expect(r.survivalMonths).toBe(4)
    expect(r.events.find((e) => e.id === 'dripEnds')?.month).toBe(4)
  })

  it('freezing the slow money strands it and shortens the runway', () => {
    const accounts = [acc({ amount: 1000 }), acc({ amount: 1200, access: 'days', monthlyCap: 300 })]
    const r = simulateBreaks(accounts, flows({ spendMonthly: 500 }), {
      incomeStops: true,
      fxShocks: {},
      slowMoneyFreezes: true,
    })
    expect(r.survivalMonths).toBe(2)
    expect(r.strandedUsd).toBe(1200)
  })

  it('never breaks while income covers spending', () => {
    const r = simulateBreaks(
      [acc({ amount: 1000 })],
      flows({ incomeMonthly: 800, incomeStability: 'recurring', spendMonthly: 500 }),
      NO_STRESS,
    )
    expect(r.survivalMonths).toBeNull()
    expect(r.events.find((e) => e.id === 'cashOut')).toBeUndefined()
  })

  it('a currency shock can turn a surplus into a countdown', () => {
    const f = flows({
      incomeMonthly: 800 * 89500,
      incomeCurrency: 'LBP',
      incomeStability: 'recurring',
      spendMonthly: 500,
      spendCurrency: 'USD',
    })
    const calm = simulateBreaks([acc({ amount: 2000 })], f, NO_STRESS)
    const shocked = simulateBreaks([acc({ amount: 2000 })], f, {
      incomeStops: false,
      fxShocks: { LBP: -60 },
      slowMoneyFreezes: false,
    })
    expect(calm.survivalMonths).toBeNull()
    // Income falls to 320, burn is 180 a month against a 2000 pool.
    expect(shocked.survivalMonths).toBe(11)
  })

  it('counts trapped money as stranded, not as runway', () => {
    const accounts = [acc({ amount: 1000 }), acc({ amount: 50000, access: 'restricted' })]
    const r = simulateBreaks(accounts, flows({ spendMonthly: 500 }), NO_STRESS)
    expect(r.survivalMonths).toBe(2)
    expect(r.strandedUsd).toBe(50000)
    expect(r.events.find((e) => e.id === 'onlyTrapped')).toBeTruthy()
  })

  it('survives zero spending without dividing by anything', () => {
    const r = simulateBreaks([acc({ amount: 1000 })], flows({ spendMonthly: 0 }), NO_STRESS)
    expect(r.survivalMonths).toBeNull()
  })
})

describe('the dials ledger', () => {
  it('has a why and a distrust line for every dial', () => {
    expect(DIALS.length).toBeGreaterThan(10)
    for (const d of DIALS) {
      expect(d.why.length, `${d.id} has no why`).toBeGreaterThan(30)
      expect(d.distrust.length, `${d.id} has no distrust line`).toBeGreaterThan(20)
    }
    expect(DIALS_NOTE.length).toBeGreaterThan(50)
  })

  it('matches the code on the dials a test can reach', () => {
    // buffer: 3 to 12 months
    expect(bufferMonths(0, 'recurring')).toBe(3)
    expect(bufferMonths(100, 'none')).toBe(12)
    // gold: 0 below 10 fragility, capped at 10
    expect(goldWeight(9)).toBe(0)
    expect(goldWeight(100)).toBe(10)
    const buffer = DIALS.find((d) => d.id === 'buffer-formula')!
    expect(buffer.value).toMatch(/3/)
    expect(buffer.value).toMatch(/12/)
    const gold = DIALS.find((d) => d.id === 'gold-formula')!
    expect(gold.value).toMatch(/10/)
  })
})
