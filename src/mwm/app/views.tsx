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
        <p className="w-muted">A safety net is measured in months of your own spending, so this needs that one number.</p>
      </div>
    )
  }

  return (
    <div className="w-view">
      <div className="w-view-top">
        <div>
          <p className="w-view-big">
            <span className="w-accent">{months(reach)}</span> {reach === 1 ? 'month' : 'months'} of spending within reach
          </p>
          <p className="w-muted">
            Target: {target} months.{' '}
            <Why title={`Why ${target} months`}>
              <p>
                Everyone starts at three. The target grows when money is stuck or slow, sits mostly in one place, is
                held in a currency that has repriced before, or when income is not steady. Yours:
              </p>
              <ul className="w-pop-list">
                {a.standing.fragility.parts.map((p) => (
                  <li key={p.key}>
                    {p.label}: <b>{p.points}</b> of {p.max}
                  </li>
                ))}
                <li>
                  Income: <b>{state.flows.incomeStability === 'recurring' ? 'steady' : state.flows.incomeStability === 'irregular' ? 'irregular, +2 months' : 'none yet, +3 months'}</b>
                </li>
              </ul>
            </Why>
          </p>
        </div>
      </div>

      <div className="w-months" role="img" aria-label={`${months(reach)} months within reach, ${months(all)} months counting everything, target ${target}`}>
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
          <span className="w-dot w-dot--free" /> Within reach
        </li>
        {all > reach + 0.05 ? (
          <li>
            <span className="w-dot w-dot--stuck" /> Yours, out of reach ({months(all)} months in total)
          </li>
        ) : null}
        <li>
          <span className="w-tick" /> Target
        </li>
      </ul>

      <dl className="w-facts">
        <div>
          <dt>You keep</dt>
          <dd className={f.surplusUsd < 0 ? 'is-bad' : ''}>
            {f.incomeUsd > 0 ? (
              <>
                {usd(f.surplusUsd)}
                <small> a month{f.surplusUsd > 0 ? `, ${Math.round(f.savingsRatePct)}% of income` : ''}</small>
              </>
            ) : (
              <>No income entered</>
            )}
          </dd>
        </div>
        <div>
          <dt>To reach the target</dt>
          <dd>
            {gap <= 0 ? (
              <>Done</>
            ) : (
              <>
                {usd(gap)}
                <small>{Number.isFinite(fillMonths) ? ` · about ${months(fillMonths)} months of saving` : ' · needs a monthly surplus'}</small>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Keep it in</dt>
          <dd>
            Cash you can reach, plus a short Treasury fund{' '}
            <Why title={picks.cash.name}>
              <p>
                <b>{picks.cash.tickers}</b>. {picks.cash.coverage} Ongoing cost {picks.cash.ter}% a year.
              </p>
              <p>
                It pays roughly the US short-term interest rate and can be sold any trading day. That is the whole job of a
                safety net: boring and reachable. Money in a local bank counts toward it only while you can actually withdraw
                it.
              </p>
            </Why>
          </dd>
        </div>
      </dl>

      <p className="w-tiny">
        Cash that only sits also shrinks: a dollar held untouched since {CASH_EROSION.startLabel}, when Lebanon’s banking crisis
        began, bought {CASH_EROSION.purchasingPowerLostPct} percent less in the US by {CASH_EROSION.endLabel}.{' '}
        <Why title={CASH_EROSION.label}>
          <p>
            US consumer prices rose {CASH_EROSION.pricesRosePct} percent from {CASH_EROSION.startLabel} to {CASH_EROSION.endLabel}{' '}
            (BLS CPI-U, index {CASH_EROSION.startIndex} to {CASH_EROSION.endIndex}). That is about {CASH_EROSION.annualLossPct} percent of
            buying power a year.
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
}: {
  a: Analysis
  state: AppState
  level: RiskLevel | null
  setLevel: (l: RiskLevel | null) => void
  onUsPerson: (v: boolean) => void
  onBroker: (v: BrokerAccess) => void
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
          An investment account abroad has to be funded from money that is yours and can move. None of your pots marked
          Free has money in it yet. Getting even a small amount into one is the first real step.
        </p>
      </div>
    )
  }

  if (t.growthUsd <= 0) {
    return (
      <div className="w-view w-empty">
        <p className="w-view-big">Not yet. And that is the plan working.</p>
        <p className="w-muted">
          All {usd(t.investableUsd)} you can move belongs in your safety net until it covers {t.bufferTargetMonths} months.
          After that, every extra dollar lands here, split the way the {a.risk.level.toLowerCase()} mix says.
        </p>
      </div>
    )
  }

  return (
    <div className="w-view">
      <div className="w-view-top w-view-top--row">
        <div>
          <p className="w-view-big">
            <span className="w-accent">{usd(t.growthUsd)}</span> to invest
          </p>
          <p className="w-muted">What is left after {usd(t.safetyUsd + t.shortGoalsUsd)} stays in your safety net.</p>
        </div>
        <div className="w-level">
          <Segmented<RiskLevel>
            size="sm"
            label="Risk level"
            value={a.risk.level}
            onChange={(l) => setLevel(l === suggested ? null : l)}
            options={RISK_LEVELS.map((l) => ({ value: l, label: l, title: RISK_DESCRIPTION[l] }))}
          />
          <p className="w-tiny">
            {level && level !== suggested ? <>Your pick. Suggested: {suggested}.</> : <>Suggested from your answers.</>}{' '}
            <Why title={a.risk.level}>
              <p>{RISK_DESCRIPTION[a.risk.level]}</p>
              {a.risk.override ? <p>{a.risk.override}</p> : null}
              <p className="w-tiny">
                Score {a.risk.score} of {a.risk.max}: {a.risk.parts.map((p) => `${p.label.toLowerCase()} ${p.points}/${p.max}`).join(', ')}.
              </p>
            </Why>
          </p>
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
            Expected{' '}
            <Why title="Where this number comes from">
              <p>
                J.P. Morgan's 2026 long-term capital market assumptions, a 10 to 15 year view. They revise it every year,
                sometimes by more than a point. Treat it as a considered guess, not a promise.
              </p>
            </Why>
          </dt>
          <dd>
            {g.stat.expectedReturn.toFixed(1)}%<small> a year</small>
          </dd>
        </div>
        <div>
          <dt>A bad year</dt>
          <dd className="is-bad">
            {usd(band.badYear - t.growthUsd)}
            <small> · about 1 year in 20</small>
          </dd>
        </div>
        <div>
          <dt>Costs</dt>
          <dd>
            {usd(g.stat.terUsdPerYear)}
            <small> a year</small>
          </dd>
        </div>
      </dl>

      <div className="w-dials">
        <span className="w-label">An investment account abroad</span>
        <Segmented<BrokerAccess>
          size="sm"
          label="Can you open an investment account abroad?"
          value={state.profile.brokerAccess}
          onChange={onBroker}
          options={[
            { value: 'have', label: 'I have one' },
            { value: 'could', label: 'I could open one' },
            { value: 'no', label: 'Not realistic' },
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
          <p className="w-tiny">Checked {accessData.meta.checkedOn}. Not a recommendation of any broker.</p>
        </Why>
      </p>
      {state.profile.brokerAccess === 'no' ? (
        <p className="w-callout">Then this mix is a target, not a shopping list. Your next moves say what still works without one.</p>
      ) : null}

      <label className="w-check">
        <input type="checkbox" checked={state.profile.usPerson} onChange={(e) => onUsPerson(e.currentTarget.checked)} />
        I am a US citizen or US resident
        <Why title="Why the fund names change">
          <p>
            A US-listed fund pays a foreigner's dividends after 30% US withholding, unless a tax treaty cuts it, and US
            estate tax can apply above $60,000 of US assets. An Irish fund holding the same shares suffers 15% inside the
            fund and is not a US asset. US persons should use US-listed funds instead.
          </p>
          <p className="w-tiny">Sources: IRS NRA withholding, US-Ireland treaty, IRS estate tax for nonresidents.</p>
        </Why>
      </label>
    </div>
  )
}

/* ================================================================== */
/* Bad years                                                           */
/* ================================================================== */

const SCENARIO_TABS = [
  { value: 'hard', label: 'Hard months' },
  { value: 'gfc2008', label: '2008' },
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
        <p className="w-view-big">If things go wrong</p>
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
        <p className="w-muted">Add what you spend each month on the left, and this plays your money forward month by month.</p>
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
          {r.survivalMonths === null ? 'You do not run out' : r.survivalMonths === 0 ? 'Not even one month' : `${r.survivalMonths} ${r.survivalMonths === 1 ? 'month' : 'months'}`}
          <small>{r.survivalMonths === null ? ' over five years' : r.survivalMonths === 0 ? ': the reachable money does not cover one month' : ' before the reachable money runs out'}</small>
        </p>
        <p className="w-muted">
          {incomeStops ? (
            <>With the income stopped, {usd(spend)} a month comes out of what you hold. </>
          ) : r.monthlyBurnUsd > 0 ? (
            <>Spending runs {usd(r.monthlyBurnUsd)} a month ahead of income. </>
          ) : (
            <>Income still covers spending. </>
          )}
          You start with {usd(r.startingPoolUsd)} in hand
          {r.dripTotalUsd > 0 ? <>, plus {usd(r.dripTotalUsd)} arriving on a monthly limit</> : null}.{' '}
          <Why title="How this is worked out">
            <p>
              Your real pots, month by month: reachable money first, then whatever the Slow pots pay out under the limit you
              gave. Stuck money, and Slow money with no limit, never arrives, because the tool will not schedule money you
              could not.
            </p>
            <p>Nothing here predicts that your income stops or a currency falls. It answers: if it did, which month hurts.</p>
            <p>
              When a currency falls, your spending is held at its dollar value, as if local prices rise to match. That is close
              to what Lebanon lived through after 2019. Pegged currencies and the euro are not moved by the dial.
            </p>
          </Why>
        </p>
      </div>

      <div className="w-runway" role="img" aria-label="Money in hand at the start of each month, for two years">
        {slots.map((v, m) => (
          <span key={m} className={v <= 0 ? 'is-out' : ''} style={{ height: `${Math.max(4, (v / peak) * 100)}%` }} title={`Month ${m}: ${usd(v)}`} />
        ))}
      </div>
      <p className="w-tiny">Money in hand at the start of each month, over two years.</p>

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
          Nothing you hold is invested in markets, so {sc.name.toLowerCase()} would not touch it directly. Your exposure is
          the other kind: try <b>Bank freeze</b>.
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
              {r.yearsToRecover > 0 ? <>, back in about {months(r.yearsToRecover)} years at the expected return</> : null}.
            </>
          ) : (
            <>On the {usd(amount)} you can move, in the suggested mix. This one would have helped.</>
          )}{' '}
          <Why title={sc.name}>
            <p>{sc.summary}</p>
            <p>{sc.headline}</p>
            <p className="w-tiny">Lines marked "no data" are held at zero because no verified figure was found, not because nothing happened.</p>
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
          Nothing you hold is marked Slow or Stuck. A freeze at home would be a bad week, not a lost decade. That is the
          strongest position on this page.
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
          <small> ({h.lossPctOfNetWorth.toFixed(0)}% of everything)</small>
        </p>
        <p className="w-muted">
          If your Slow and Stuck money ({usd(atRisk)}) came back at {recovery} cents on the dollar.{' '}
          <Why title="This one is not history, it is a dial">
            <p>
              Lebanese depositors have waited since 2019. Egypt, Nigeria, Argentina and Turkey have all repriced savings in
              the last decade. Nobody knows what your recovery rate will be, so you set it.
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
      <p className="w-callout">Your plan does not move. It never counted on that money, which is the point of building it this way.</p>
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
          ? 'With a small pile, your income is the best asset you own.'
          : 'At this size the portfolio earns more than a raise would. Protect it first.'}
      </p>

      <div className="w-compare">
        <div>
          <p className="w-k">{h.investableUsd > 0 ? <>Your {usd(h.investableUsd)}, invested</> : <>Invested money you can move</>}</p>
          <p className="w-mid">
            {usd(monthly)}
            <small> a month</small>
          </p>
        </div>
        <div>
          <p className="w-k">A raise of {usd(uplift)} a month is worth</p>
          <p className="w-mid w-accent">
            {usd(value)}
            <small> invested</small>
          </p>
        </div>
      </div>

      <label className="w-range">
        <span className="w-label">Extra income a month</span>
        <input type="range" min={50} max={2000} step={50} value={uplift} onChange={(e) => setUplift(Number(e.currentTarget.value))} />
        <output>{usd(uplift)}</output>
      </label>

      <p className="w-muted">
        {multiple !== null ? (
          <>
            That raise equals <b>{multiple >= 10 ? Math.round(multiple) : multiple.toFixed(1)}×</b> what you can invest today.{' '}
          </>
        ) : null}
        {r > 0 ? <>At about {r.toFixed(1)}% a year, each extra dollar of monthly income is worth roughly {usd(12 / (r / 100))} of capital. </> : null}
        {multiple === null || multiple >= 1 ? <>A course, a tool or a job search that adds income usually beats a fund at this size. </> : null}
        <Why title="Is it worth spending on?">
          <p>Two yeses out of three:</p>
          <ol className="w-pop-list">
            <li>Does it pay you back within a year, in money you can name?</li>
            <li>Would it still matter if software did the cheap version of your job?</li>
            <li>Does it make the next thing easier?</li>
          </ol>
          {uplift !== fallback ? null : <p className="w-tiny">The starting raise is a quarter of your income, capped.</p>}
        </Why>
      </p>
    </div>
  )
}
