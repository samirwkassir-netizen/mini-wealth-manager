import { useMemo, useState } from 'react'
import {
  CASH_EROSION,
  INSTRUMENTS,
  RISK_DESCRIPTION,
  RISK_LEVELS,
  SCENARIOS,
  applyScenario,
  defaultUplift,
  hardness,
  simulateBreaks,
  toUsd,
  touchedCurrencies,
  haircutRestricted,
  outcomeBand,
  resolvePicks,
  type Analysis,
  type AppState,
  type BrokerAccess,
  type DrawdownReaction,
  type Horizon,
  type RiskLevel,
} from '../engine'
import accessData from '../data/access.json'
import { Segmented, Why, months, usd } from './bits'
import { splitByFreedom } from './Headline'

/* ================================================================== */
/* Safety net                                                          */
/* ================================================================== */

export function SafetyNet({ a, state }: { a: Analysis; state: AppState }) {
  const f = a.flow
  const t = a.tiering
  const reach = f.runwayAccessibleMonths
  const all = f.runwayTotalMonths
  const target = t.bufferTargetMonths
  const n = Math.min(24, Math.max(6, target + 1, Math.ceil(Math.min(all, 24))))
  const gap = Math.max(0, f.spendUsd * target - a.standing.accessibleTodayUsd)
  const fillMonths = f.surplusUsd > 0 ? gap / f.surplusUsd : Infinity
  const picks = resolvePicks(state.profile, state.picks)

  if (f.spendUsd <= 0) {
    return (
      <div className="w-view w-empty">
        <p className="w-view-big">Add what you spend each month.</p>
        <p className="w-muted">Rainy-day money is counted in months of your own spending, so this needs that one number.</p>
      </div>
    )
  }

  return (
    <div className="w-view">
      <div className="w-view-top">
        <div>
          <p className="w-view-big">
            <span className="w-accent">{months(reach)}</span> {reach === 1 ? 'month' : 'months'} of spending you can really use
          </p>
          <p className="w-muted">
            Your goal: {target} months.{' '}
            <Why title={`Why ${target} months`}>
              <p>
                Everyone starts at three. The goal grows when money is stuck or slow, sits mostly in one place, is held in a
                currency that has lost value before, or when income is not steady. Yours:
              </p>
              <ul className="w-pop-list">
                {a.standing.fragility.parts.map((p) => (
                  <li key={p.key}>
                    {p.label}: <b>{p.points}</b> of {p.max}
                  </li>
                ))}
                <li>
                  Income: <b>{state.flows.incomeStability === 'recurring' ? 'steady' : state.flows.incomeStability === 'irregular' ? 'up and down, +2 months' : 'none yet, +3 months'}</b>
                </li>
              </ul>
            </Why>
          </p>
        </div>
      </div>

      <div className="w-months" role="img" aria-label={`${months(reach)} months you can really use, ${months(all)} months counting everything, goal ${target}`}>
        {Array.from({ length: n }, (_, i) => {
          const fill = Math.max(0, Math.min(1, reach - i))
          const owned = Math.max(0, Math.min(1, all - i))
          return (
            <span key={i} className={`w-month${i === target - 1 ? ' is-target' : ''}`}>
              <span className="w-month-owned" style={{ width: `${owned * 100}%` }} />
              <span className="w-month-fill" style={{ width: `${fill * 100}%` }} />
            </span>
          )
        })}
      </div>
      <ul className="w-key">
        <li>
          <span className="w-dot w-dot--free" /> You can use it
        </li>
        {all > reach + 0.05 ? (
          <li>
            <span className="w-dot w-dot--stuck" /> Yours, but out of reach ({months(all)} months in all)
          </li>
        ) : null}
        <li>
          <span className="w-tick" /> Goal
        </li>
      </ul>

      <dl className="w-facts">
        <div>
          <dt>Left over each month</dt>
          <dd className={f.surplusUsd < 0 ? 'is-bad' : ''}>
            {f.incomeUsd > 0 ? (
              <>
                {usd(f.surplusUsd)}
                <small> a month{f.surplusUsd > 0 ? `, ${Math.round(f.savingsRatePct)}% of income` : ''}</small>
              </>
            ) : (
              <>No income yet</>
            )}
          </dd>
        </div>
        <div>
          <dt>Still to save</dt>
          <dd>
            {gap <= 0 ? (
              <>Done</>
            ) : (
              <>
                {usd(gap)}
                <small>{Number.isFinite(fillMonths) ? ` · about ${months(fillMonths)} months of saving` : ' · needs something left over each month'}</small>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Where to keep it</dt>
          <dd>
            Cash you can get to, plus a very safe fund{' '}
            <Why title={picks.cash.name}>
              <p>
                <b>{picks.cash.tickers}</b>. {picks.cash.coverage.replace(/\.$/, '')}. It costs {picks.cash.ter}% a year.
              </p>
              <p>
                It holds short US government loans, pays about the US interest rate, and you can sell it on any working day.
                That is all rainy-day money has to do: be boring and be there. Money in a local bank only counts while you
                can actually take it out.
              </p>
            </Why>
          </dd>
        </div>
      </dl>

      <p className="w-tiny">
        Cash that just sits also shrinks: a dollar kept since {CASH_EROSION.startLabel}, when Lebanon’s banking crisis began,
        bought {CASH_EROSION.purchasingPowerLostPct} percent less in the US by {CASH_EROSION.endLabel}.{' '}
        <Why title={CASH_EROSION.label}>
          <p>
            US consumer prices rose {CASH_EROSION.pricesRosePct} percent from {CASH_EROSION.startLabel} to {CASH_EROSION.endLabel}{' '}
            (the official US price index, {CASH_EROSION.startIndex} to {CASH_EROSION.endIndex}). That is about{' '}
            {CASH_EROSION.annualLossPct} percent of buying power lost each year.
          </p>
          <p>{CASH_EROSION.caution}</p>
          <p>
            <a href={CASH_EROSION.sourceUrl} target="_blank" rel="noopener noreferrer">
              BLS CPI release
            </a>
          </p>
        </Why>
      </p>
    </div>
  )
}

/* ================================================================== */
/* Invest                                                              */
/* ================================================================== */

export function Invest({
  a,
  state,
  level,
  setLevel,
  onUsPerson,
  onBroker,
  onProfile,
}: {
  a: Analysis
  state: AppState
  level: RiskLevel | null
  setLevel: (l: RiskLevel | null) => void
  onUsPerson: (v: boolean) => void
  onBroker: (v: BrokerAccess) => void
  onProfile: (p: { horizonYears?: Horizon; drawdownReaction?: DrawdownReaction }) => void
}) {
  const t = a.tiering
  const g = a.growthOnly
  const suggested = (a.risk as typeof a.risk & { suggested: RiskLevel }).suggested
  const band = outcomeBand(g.stat, t.growthUsd)
  const byId = useMemo(() => new Map(INSTRUMENTS.map((i) => [i.id, i])), [])
  const maxW = Math.max(...g.rows.map((r) => r.weight), 1)

  if (t.investableUsd <= 0) {
    return (
      <div className="w-view w-empty">
        <p className="w-view-big">Nothing here can be invested yet.</p>
        <p className="w-muted">
          An investing account abroad needs money that can leave the country, and none of your Free jars has money in it yet.
          Getting even a little into one is the first real step.
        </p>
      </div>
    )
  }

  if (t.growthUsd <= 0) {
    return (
      <div className="w-view w-empty">
        <p className="w-view-big">Not yet. That is the plan working.</p>
        <p className="w-muted">
          All {usd(t.investableUsd)} you can move belongs in your rainy-day money until it covers {t.bufferTargetMonths} months.
          After that, every extra dollar comes here, split the way the {a.risk.level.toLowerCase()} mix says.
        </p>
      </div>
    )
  }

  return (
    <div className="w-view">
      <div className="w-view-top w-view-top--row">
        <div>
          <p className="w-view-big">
            <span className="w-accent">{usd(t.growthUsd)}</span> you can invest
          </p>
          <p className="w-muted">What is left once {usd(t.safetyUsd + t.shortGoalsUsd)} stays as rainy-day money.</p>
        </div>
        <div className="w-level">
          <Segmented<RiskLevel>
            size="sm"
            label="How bumpy a ride"
            value={a.risk.level}
            onChange={(l) => setLevel(l === suggested ? null : l)}
            options={RISK_LEVELS.map((l) => ({ value: l, label: l, title: RISK_DESCRIPTION[l] }))}
          />
          <p className="w-tiny">
            {level && level !== suggested ? <>Your pick. We suggest {suggested}.</> : <>Picked from your answers.</>}{' '}
            <Why title={a.risk.level}>
              <p>{RISK_DESCRIPTION[a.risk.level]}</p>
              {a.risk.override ? <p>{a.risk.override}</p> : null}
              <p className="w-tiny">
                Your score, {a.risk.score} of {a.risk.max}: {a.risk.parts.map((p) => `${p.label.toLowerCase()} ${p.points}/${p.max}`).join(', ')}.
              </p>
            </Why>
          </p>
        </div>
      </div>

      <div className="w-about" role="group" aria-label="About you">
        <div className="w-field">
          <span className="w-label">
            You might need it in{' '}
            <Why title="Two questions decide the mix">
              <p>
                How long until you need the money, and what you would really do if it dropped by 30 percent. An honest
                "Sell" is worth more than a brave answer you would not stick to.
              </p>
            </Why>
          </span>
          <Segmented<Horizon>
            size="sm"
            label="Years until you need the money"
            value={state.profile.horizonYears}
            onChange={(v) => onProfile({ horizonYears: v })}
            options={[
              { value: 2, label: '2 yrs' },
              { value: 5, label: '5 yrs' },
              { value: 10, label: '10 yrs' },
              { value: 20, label: '20+' },
            ]}
          />
        </div>
        <div className="w-field">
          <span className="w-label">If it dropped 30%, you would</span>
          <Segmented<DrawdownReaction>
            size="sm"
            label="What you would do if it dropped by 30 percent"
            value={state.profile.drawdownReaction}
            onChange={(v) => onProfile({ drawdownReaction: v })}
            options={[
              { value: 'sell', label: 'Sell' },
              { value: 'hold', label: 'Wait' },
              { value: 'buy', label: 'Buy more' },
            ]}
          />
        </div>
      </div>

      <ul className="w-alloc">
        {g.rows.map((r) => {
          const ins = byId.get(r.instrumentId)
          return (
            <li key={r.key}>
              <span className="w-alloc-name">
                {r.label}
                <small>{ins ? ins.id : ''}</small>
              </span>
              <span className="w-alloc-bar">
                <span className={`w-alloc-fill w-c-${r.key}`} style={{ width: `${(r.weight / maxW) * 100}%` }} />
              </span>
              <span className="w-alloc-pct">{Math.round(r.weight)}%</span>
              <span className="w-alloc-usd">{usd(r.usd)}</span>
            </li>
          )
        })}
      </ul>

      <dl className="w-facts w-facts--3">
        <div>
          <dt>
            Might grow{' '}
            <Why title="Where this number comes from">
              <p>
                J.P. Morgan’s 2026 long-term forecasts, which look 10 to 15 years ahead. They change them every year, sometimes
                by more than a point. Treat it as a careful guess, not a promise.
              </p>
            </Why>
          </dt>
          <dd>
            {g.stat.expectedReturn.toFixed(1)}%<small> a year</small>
          </dd>
        </div>
        <div>
          <dt>A bad year could cost</dt>
          <dd className="is-bad">
            {usd(band.badYear - t.growthUsd)}
            <small> · about 1 year in 20</small>
          </dd>
        </div>
        <div>
          <dt>Fees</dt>
          <dd>
            {usd(g.stat.terUsdPerYear)}
            <small> a year</small>
          </dd>
        </div>
      </dl>

      <div className="w-invest-foot">
      <div className="w-dials">
        <span className="w-label">An investing account abroad?</span>
        <Segmented<BrokerAccess>
          size="sm"
          label="Can you open an investing account abroad?"
          value={state.profile.brokerAccess}
          onChange={onBroker}
          options={[
            { value: 'have', label: 'I have one' },
            { value: 'could', label: 'I could open one' },
            { value: 'no', label: 'Not really' },
          ]}
        />
      </div>
      <p className="w-tiny">
        <Why label="Where would I hold this?" title={accessData.broker.title}>
          <ul className="w-pop-list">
            {accessData.broker.points.map((pt) => (
              <li key={pt.claim}>
                {pt.claim}{' '}
                {pt.source ? (
                  <a href={pt.source} target="_blank" rel="noopener noreferrer">
                    source
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="w-tiny">Checked {accessData.meta.checkedOn}. Not a recommendation of any company.</p>
        </Why>
      </p>
      {state.profile.brokerAccess === 'no' ? (
        <p className="w-callout">Then this mix is a goal, not a shopping list. Your next steps say what still works without one.</p>
      ) : null}

      <label className="w-check">
        <input type="checkbox" checked={state.profile.usPerson} onChange={(e) => onUsPerson(e.currentTarget.checked)} />
        I am a US citizen or I live in the US
        <Why title="Why the fund names change">
          <p>
            If you are not American, a US fund loses 30% of its dividends to US tax, unless a tax treaty lowers it, and US
            inheritance tax can apply above $60,000 of US assets. An Irish fund holding the same shares loses only 15%, and
            does not count as a US asset. Americans should use US funds instead.
          </p>
          <p className="w-tiny">Sources: IRS rules for non-US investors, the US-Ireland tax treaty, IRS estate tax for non-residents.</p>
        </Why>
      </label>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Bad years                                                           */
/* ================================================================== */

const SCENARIO_TABS = [
  { value: 'hard', label: 'Hard months' },
  { value: 'gfc2008', label: '2008 crash' },
  { value: 'covid2020', label: 'Covid' },
  { value: 'inflation1974', label: '1970s' },
  { value: 'freeze', label: 'Bank freeze' },
]

export function BadYears({ a, state }: { a: Analysis; state: AppState }) {
  const [id, setId] = useState('hard')
  const [recovery, setRecovery] = useState(30)
  const t = a.tiering
  const parts = splitByFreedom(state)
  const atRisk = parts.slow + parts.stuck

  return (
    <div className="w-view">
      <div className="w-view-top w-view-top--row">
        <p className="w-view-big">What if things go wrong?</p>
        <Segmented size="sm" label="Scenario" value={id} onChange={setId} options={SCENARIO_TABS} />
      </div>

      {id === 'hard' ? (
        <HardMonths state={state} />
      ) : id === 'freeze' ? (
        <Freeze atRisk={atRisk} total={a.standing.totalUsd} recovery={recovery} setRecovery={setRecovery} />
      ) : (
        <Market a={a} id={id} amount={t.investableUsd} />
      )}
    </div>
  )
}

function HardMonths({ state }: { state: AppState }) {
  const [incomeStops, setIncomeStops] = useState(true)
  const [slowFreezes, setSlowFreezes] = useState(false)
  const [fall, setFall] = useState(0)
  // Only currencies that have repriced before get the dial; pegs and the euro stay put.
  const soft = touchedCurrencies(state.accounts, state.flows).filter((c) => hardness(c) >= 0.5)
  const fxShocks = Object.fromEntries(soft.map((c) => [c, -fall]))
  // Spending is held at its dollar value: when a currency falls, local prices follow.
  const flowsUsd = {
    ...state.flows,
    spendMonthly: toUsd(state.flows.spendMonthly || 0, state.flows.spendCurrency),
    spendCurrency: 'USD',
  }
  const r = simulateBreaks(state.accounts, flowsUsd, { incomeStops, slowMoneyFreezes: slowFreezes, fxShocks })
  const spend = r.spendAfterUsd

  if (spend <= 0) {
    return (
      <div className="w-empty">
        <p className="w-muted">Add what you spend each month on the left, and this plays your money forward, month by month.</p>
      </div>
    )
  }

  const slots = Array.from({ length: 25 }, (_, m) => r.timeline.find((p) => p.month === m)?.poolUsd ?? 0)
  const peak = Math.max(...slots, 1)

  return (
    <>
      <div className="w-dials" role="group" aria-label="What goes wrong">
        <label>
          <input type="checkbox" checked={incomeStops} onChange={(e) => setIncomeStops(e.currentTarget.checked)} />
          Income stops
        </label>
        <label>
          <input type="checkbox" checked={slowFreezes} onChange={(e) => setSlowFreezes(e.currentTarget.checked)} />
          Slow money freezes
        </label>
        {soft.length ? (
          <label>
            {soft.join(' and ')} {soft.length > 1 ? 'fall' : 'falls'}
            <input type="range" min={0} max={60} step={5} value={fall} onChange={(e) => setFall(Number(e.currentTarget.value))} />
            <output>{fall}%</output>
          </label>
        ) : null}
      </div>

      <div className="w-stress-head">
        <p className={`w-stress-num ${r.survivalMonths === null ? 'is-good' : 'is-bad'}`}>
          {r.survivalMonths === null ? 'You don’t run out' : r.survivalMonths === 0 ? 'Not even one month' : `You last ${r.survivalMonths} ${r.survivalMonths === 1 ? 'month' : 'months'}`}
          <small>{r.survivalMonths === null ? ' in five years' : r.survivalMonths === 0 ? ': the money you can use does not cover one month' : ' before the money you can use runs out'}</small>
        </p>
        <p className="w-muted">
          {incomeStops ? (
            <>With no income, {usd(spend)} a month comes out of your savings. </>
          ) : r.monthlyBurnUsd > 0 ? (
            <>You spend {usd(r.monthlyBurnUsd)} a month more than comes in. </>
          ) : (
            <>Income still covers spending. </>
          )}
          You start with {usd(r.startingPoolUsd)} you can use
          {r.dripTotalUsd > 0 ? <>, plus {usd(r.dripTotalUsd)} dripping in month by month</> : null}.{' '}
          <Why title="How this is worked out">
            <p>
              Your real jars, month by month: the money you can use first, then whatever the Slow jars pay out under the limit
              you gave. Stuck money, and Slow money with no limit, never arrives, because the tool will not count on money you
              could not count on.
            </p>
            <p>Nothing here predicts that your income stops or a currency falls. It answers: if it did, which month hurts.</p>
            <p>
              When a currency falls, your spending stays the same in dollars, as if local prices rise to match. That is close to
              what Lebanon lived through after 2019. Currencies tied to the dollar, and the euro, do not move with the slider.
            </p>
          </Why>
        </p>
      </div>

      <div className="w-runway" role="img" aria-label="Money you can use at the start of each month, for two years">
        {slots.map((v, m) => (
          <span key={m} className={v <= 0 ? 'is-out' : ''} style={{ height: `${Math.max(4, (v / peak) * 100)}%` }} title={`Month ${m}: ${usd(v)}`} />
        ))}
      </div>
      <p className="w-tiny">Money you can use at the start of each month, over two years.</p>

      {r.events.length ? (
        <ul className="w-events">
          {r.events.map((e) => (
            <li key={e.id}>
              <b>{e.month ? `Month ${e.month}. ` : ''}</b>
              {e.title}. <small>{e.detail}</small>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}

function Market({ a, id, amount }: { a: Analysis; id: string; amount: number }) {
  const sc = SCENARIOS.find((s) => s.id === id)!
  if (amount <= 0) {
    return (
      <div className="w-empty">
        <p className="w-muted">
          None of your money is invested, so {sc.name.toLowerCase()} would not touch it directly. Your risk is the other kind:
          try <b>Bank freeze</b>.
        </p>
      </div>
    )
  }
  const r = applyScenario(a.allocation.weights, sc.shocks, amount, a.flow.spendUsd, a.allocation.stat.expectedReturn, sc)
  const rows = [...r.contributions].sort((x, y) => x.contribution - y.contribution)
  const maxAbs = Math.max(...rows.map((c) => Math.abs(c.shock)), 1)

  return (
    <>
      <div className="w-stress-head">
        <p className={`w-stress-num ${r.portfolioUsd < 0 ? 'is-bad' : 'is-good'}`}>
          {r.portfolioUsd >= 0 ? '+' : ''}
          {usd(r.portfolioUsd)}
          <small> ({r.portfolioPct >= 0 ? '+' : ''}{r.portfolioPct.toFixed(1)}%)</small>
        </p>
        <p className="w-muted">
          {r.portfolioUsd < 0 ? (
            <>
              On the {usd(amount)} you can move, in the suggested mix. That is {months(r.monthsOfSpendLost)} months of spending
              {r.yearsToRecover > 0 ? <>, back in about {months(r.yearsToRecover)} years if it grows as expected</> : null}.
            </>
          ) : (
            <>On the {usd(amount)} you can move, in the suggested mix. This one would have helped.</>
          )}{' '}
          <Why title={sc.name}>
            <p>{sc.summary}</p>
            <p>{sc.headline}</p>
            <p className="w-tiny">Lines marked "no data" show zero because no checked figure was found, not because nothing happened.</p>
          </Why>
        </p>
      </div>
      <ul className="w-stress">
        {rows.map((c) => (
          <li key={c.key}>
            <span className="w-stress-name">
              {c.label} <small>{Math.round(c.weight)}%</small>
            </span>
            <span className="w-stress-track">
              <span className="w-stress-zero" />
              {c.verified || c.shock !== 0 || c.key === 'cash' ? (
                <span
                  className={`w-stress-bar ${c.shock < 0 ? 'is-neg' : 'is-pos'}`}
                  style={{ width: `${(Math.abs(c.shock) / maxAbs) * 50}%` }}
                />
              ) : null}
            </span>
            <span className="w-stress-val">
              {c.verified || c.shock !== 0 || c.key === 'cash' ? `${c.shock > 0 ? '+' : ''}${c.shock.toFixed(0)}%` : 'no data'}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

function Freeze({
  atRisk,
  total,
  recovery,
  setRecovery,
}: {
  atRisk: number
  total: number
  recovery: number
  setRecovery: (n: number) => void
}) {
  if (atRisk <= 0) {
    return (
      <div className="w-empty">
        <p className="w-muted">
          None of your jars is Slow or Stuck. A bank freeze at home would be a bad week, not a lost ten years. That is the
          strongest spot to be in.
        </p>
      </div>
    )
  }
  const h = haircutRestricted(atRisk, total, recovery)
  return (
    <>
      <div className="w-stress-head">
        <p className="w-stress-num is-bad">
          {usd(-h.lost)}
          <small> ({h.lossPctOfNetWorth.toFixed(0)}% of everything you own)</small>
        </p>
        <p className="w-muted">
          If your Slow and Stuck money ({usd(atRisk)}) came back at {recovery} cents on the dollar.{' '}
          <Why title="This one is not history, it is a slider">
            <p>
              Lebanese savers have waited since 2019. In Egypt, Nigeria, Argentina and Türkiye, savings lost a big part of their
              value in the last ten years. Nobody knows how much of yours will come back, so you choose.
            </p>
          </Why>
        </p>
      </div>
      <label className="w-range">
        <span className="w-label">Cents back on the dollar</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={recovery}
          onChange={(e) => setRecovery(Number(e.currentTarget.value))}
        />
        <output>{recovery}¢</output>
      </label>
      <p className="w-callout">Your plan does not change. It never counted on that money, and that is exactly why it was built this way.</p>
    </>
  )
}

/* ================================================================== */
/* You first                                                           */
/* ================================================================== */

export function YouFirst({ a, uplift, setUplift }: { a: Analysis; uplift: number; setUplift: (n: number) => void }) {
  const h = a.human
  // With nothing invested yet the blended mix has no return, so fall back to
  // the long-term mix the tool would build. Never show infinity on screen.
  const r = a.allocation.stat.expectedReturn > 0 ? a.allocation.stat.expectedReturn : a.growthOnly.stat.expectedReturn
  const value = r > 0 ? (uplift * 12) / (r / 100) : 0
  const monthly = (h.investableUsd * (r / 100)) / 12
  const multiple = h.investableUsd > 0 ? value / h.investableUsd : null
  const fallback = defaultUplift(a.flow.incomeUsd)

  return (
    <div className="w-view">
      <p className="w-view-big">
        {multiple === null || multiple >= 1
          ? 'With small savings, your income is the best thing you own.'
          : 'At this size, your investments earn more than a raise would. Protect them first.'}
      </p>

      <div className="w-compare">
        <div>
          <p className="w-k">{h.investableUsd > 0 ? <>Your {usd(h.investableUsd)}, invested, earns</> : <>Money you could invest earns</>}</p>
          <p className="w-mid">
            {usd(monthly)}
            <small> a month</small>
          </p>
        </div>
        <div>
          <p className="w-k">A raise of {usd(uplift)} a month is like having</p>
          <p className="w-mid w-accent">
            {usd(value)}
            <small> invested</small>
          </p>
        </div>
      </div>

      <label className="w-range">
        <span className="w-label">Extra money a month</span>
        <input type="range" min={50} max={2000} step={50} value={uplift} onChange={(e) => setUplift(Number(e.currentTarget.value))} />
        <output>{usd(uplift)}</output>
      </label>

      <p className="w-muted">
        {multiple !== null ? (
          <>
            That raise is worth <b>{multiple >= 10 ? Math.round(multiple) : multiple.toFixed(1)} times</b> what you can invest today.{' '}
          </>
        ) : null}
        {r > 0 ? <>At about {r.toFixed(1)}% a year, each extra dollar you earn every month is worth about {usd(12 / (r / 100))} in savings. </> : null}
        {multiple === null || multiple >= 1 ? <>A course, a skill or a better job usually beats any fund at this size. </> : null}
        <Why title="Is it worth spending on?">
          <p>Spend on it if you can say yes to two of these three:</p>
          <ol className="w-pop-list">
            <li>Will it pay you back within a year, in money you can name?</li>
            <li>Would it still matter if software did the cheap version of your job?</li>
            <li>Does it make the next step easier?</li>
          </ol>
          {uplift !== fallback ? null : <p className="w-tiny">The starting raise is a quarter of your income, up to a limit.</p>}
        </Why>
      </p>
    </div>
  )
}
