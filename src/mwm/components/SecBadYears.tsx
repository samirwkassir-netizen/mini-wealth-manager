import { useMemo, useState } from 'react'
import {
  ASSET_KEYS,
  NO_STRESS,
  SCENARIOS,
  applyFxStress,
  applyScenario,
  assetMeta,
  fmtUsd,
  haircutRestricted,
  rate,
  simulateBreaks,
  touchedCurrencies,
  type Analysis,
  type AppState,
} from '../engine'
import { Box, Pill, Reveal, SectionHead, Slider, Source, Disclose, Choices, Pair } from './ui'
import { StressBars, TimelineChart } from './charts'

const money = (n: number) => fmtUsd(n)

export function SecBadYears({ a, state }: { a: Analysis; state: AppState }) {
  return (
    <div className="mwm-stack" style={{ gap: '4rem' }}>
      <SectionHead
        eyebrow="Section 05"
        title="What breaks first"
        lede="Three ways your money can get hurt: the market falls, the bank does not pay, the currency reprices. Most tools only test the first. For a lot of people reading this, it is the least likely of the three."
      />

      <MarketPanel a={a} />
      <BankPanel a={a} />
      <CurrencyPanel a={a} state={state} />
      <TimelinePanel state={state} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 1. the market                                                       */
/* ------------------------------------------------------------------ */

function MarketPanel({ a }: { a: Analysis }) {
  const [active, setActive] = useState(SCENARIOS[0].id)
  const [custom, setCustom] = useState<Record<string, number>>({})

  const scenario = SCENARIOS.find((s) => s.id === active)!
  const shocks = useMemo(
    () => (scenario.editable ? { ...scenario.shocks, ...custom } : scenario.shocks),
    [scenario, custom],
  )

  const amount = a.tiering.investableUsd
  const result = useMemo(
    () => applyScenario(a.weights, shocks, amount, a.flow.spendUsd, a.allocation.stat.expectedReturn, scenario),
    [a, shocks, amount, scenario],
  )

  return (
    <div className="mwm-stack" style={{ gap: '1.5rem' }}>
      <PanelHead
        n="First"
        title="The market falls"
        blurb="Three of these really happened. The fourth has not and may never. Where a real figure could not be found, the line is held flat and labelled rather than filled in with something plausible."
      />

      <div className="mwm-row" style={{ gap: '0.6rem' }}>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            className={`mwm-btn mwm-btn--sm ${active === s.id ? '' : 'mwm-btn--ghost'}`}
            onClick={() => setActive(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="mwm-grid mwm-grid--wide" style={{ alignItems: 'start' }}>
        <div className="mwm-stack" style={{ gap: '1.5rem' }}>
          <Reveal>
            <Box>
              <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
                <p className="mwm-eyebrow">{scenario.period}</p>
                <Pill tone={scenario.kind === 'historical' ? 'default' : 'warn'}>
                  {scenario.kind === 'historical' ? 'this really happened' : 'this has not happened'}
                </Pill>
              </div>
              <p className="mwm-body" style={{ marginTop: '1.1rem', fontSize: '1.2rem' }}>
                {scenario.summary}
              </p>
              <p className="mwm-note" style={{ marginTop: '1rem' }}>
                {scenario.headline} {scenario.headlineSource ? <Source url={scenario.headlineSource} /> : null}
              </p>
            </Box>
          </Reveal>

          <Reveal delay={0.06}>
            <Box>
              <p className="mwm-eyebrow">Where the damage comes from</p>
              <div style={{ marginTop: '1.4rem' }}>
                <StressBars rows={result.contributions} />
              </div>

              {scenario.editable ? (
                <div style={{ marginTop: '2rem' }}>
                  <p className="mwm-eyebrow">Every number here is a guess. Change them.</p>
                  <div className="mwm-stack" style={{ gap: '1rem', marginTop: '1.2rem' }}>
                    {ASSET_KEYS.filter((k) => a.weights[k] > 0.05).map((k) => (
                      <div key={k}>
                        <div className="mwm-row" style={{ justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span className="mwm-note" style={{ color: 'var(--fg)' }}>
                            {assetMeta(k).label}
                          </span>
                          <span className="mwm-tabular" style={{ fontWeight: 600 }}>
                            {(shocks[k] ?? 0) > 0 ? '+' : ''}
                            {shocks[k] ?? 0}%
                          </span>
                        </div>
                        <Slider
                          value={shocks[k] ?? 0}
                          onChange={(v) => setCustom((c) => ({ ...c, [k]: v }))}
                          min={-90}
                          max={200}
                          step={5}
                        />
                      </div>
                    ))}
                  </div>
                  <button className="mwm-link" style={{ marginTop: '1rem' }} onClick={() => setCustom({})}>
                    Put them back
                  </button>
                </div>
              ) : null}

              <div style={{ marginTop: '1.6rem' }}>
                <Disclose summary="Show every figure and where it came from">
                  <div className="mwm-stack" style={{ gap: '1.2rem' }}>
                    {scenario.lines.map((l) => (
                      <div key={l.key}>
                        <div className="mwm-row" style={{ justifyContent: 'space-between', gap: '1rem' }}>
                          <span style={{ fontWeight: 600 }}>
                            {ASSET_KEYS.includes(l.key as never) ? assetMeta(l.key as never).label : l.key}
                          </span>
                          <span
                            className="mwm-tabular"
                            style={{ fontWeight: l.verified ? 600 : 400, color: l.verified ? 'var(--fg)' : 'var(--muted)' }}
                          >
                            {l.figure}
                          </span>
                        </div>
                        <p className="mwm-tiny" style={{ marginTop: '0.3rem' }}>
                          {l.measures} <Source url={l.source} />
                        </p>
                      </div>
                    ))}
                  </div>
                </Disclose>
              </div>
            </Box>
          </Reveal>
        </div>

        <Reveal delay={0.08}>
          <Box variant="accent">
            <p className="mwm-eyebrow">What happens to your money</p>
            <p className="mwm-num" style={{ fontSize: 'clamp(3rem, 6vw, 4.2rem)', marginTop: '0.6rem' }}>
              {result.portfolioPct >= 0 ? '+' : ''}
              {result.portfolioPct.toFixed(1)}%
            </p>
            <p className="mwm-note" style={{ marginTop: '0.5rem' }}>
              {money(amount)} becomes {money(result.afterUsd)}.
            </p>

            {a.tiering.growthUsd <= 0 ? (
              <p className="mwm-note" style={{ marginTop: '1.2rem' }}>
                Nothing moves, because none of your money is invested yet. It is all emergency cash. That is not a bug
                and it is not nothing: it is exactly what a full cushion buys you. The price is that the same money
                barely keeps up with prices while it sits there.
              </p>
            ) : null}

            <div className="mwm-stack" style={{ gap: '1.1rem', marginTop: '1.8rem' }}>
              {result.realPct !== null ? (
                <Row
                  k="After prices went up"
                  v={`${result.realPct.toFixed(1)}%`}
                  s={`Prices rose ${scenario.inflation} percent over the same period, so the cash figure flatters it.`}
                />
              ) : null}
              {result.monthsOfSpendLost > 0 ? (
                <Row
                  k="In months of your spending"
                  v={result.monthsOfSpendLost.toFixed(1)}
                  s="What the loss would have paid for. A more useful unit than a percentage."
                />
              ) : null}
              {result.yearsToRecover > 0 ? (
                <Row
                  k="Years to get back to even"
                  v={result.yearsToRecover.toFixed(1)}
                  s="Only if you did not sell. Selling is what turns a bad year into a permanent loss."
                />
              ) : null}
              {result.worstLine ? (
                <Row k="Worst thing you hold" v={`${result.worstLine.shock.toFixed(0)}%`} s={result.worstLine.label} />
              ) : null}
            </div>
          </Box>
        </Reveal>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 2. the bank                                                         */
/* ------------------------------------------------------------------ */

function BankPanel({ a }: { a: Analysis }) {
  const [recovery, setRecovery] = useState(20)
  const cut = haircutRestricted(a.standing.restrictedUsd, a.standing.totalUsd, recovery)

  return (
    <div className="mwm-stack" style={{ gap: '1.5rem' }}>
      <PanelHead
        n="Second"
        title="The bank does not pay"
        blurb="Every portfolio tool will show you 2008. None will ask what the money you already marked as unreachable is really worth. For a lot of people this is the larger risk by an order of magnitude."
      />

      {a.standing.restrictedUsd > 0 ? (
        <div className="mwm-grid mwm-grid--wide" style={{ alignItems: 'start' }}>
          <Reveal>
            <Box>
              <p className="mwm-eyebrow">The test nobody else runs</p>
              <p className="mwm-note" style={{ marginTop: '0.8rem' }}>
                You told us {money(a.standing.restrictedUsd)} is money you cannot get at. Suppose it eventually comes
                back, but only part of it. This tool has no view on how much. You decide.
              </p>
              <div style={{ marginTop: '1.4rem' }}>
                <p className="mwm-label">You get back {recovery}% of it</p>
                <Slider value={recovery} onChange={setRecovery} min={0} max={100} step={5} />
              </div>
              <div className="mwm-stack" style={{ gap: '1rem', marginTop: '1.4rem' }}>
                <Row k="You get back" v={money(cut.recovered)} />
                <Row k="You lose" v={money(cut.lost)} s={`${cut.lossPctOfNetWorth.toFixed(0)}% of everything you own`} />
                <Row k="What you are left with" v={money(cut.newTotal)} />
              </div>
            </Box>
          </Reveal>

          <Reveal delay={0.08}>
            <Box variant="quiet">
              <p className="mwm-eyebrow">Why this panel exists</p>
              <p className="mwm-body" style={{ marginTop: '1rem' }}>
                A market crash takes a percentage of the part of your money you chose to put at risk. A bank failure
                takes a percentage of the part you thought was safe. That is the difference, and it is why the number
                on the left deserves at least as much of your attention as the crash above it.
              </p>
              <p className="mwm-note" style={{ marginTop: '1rem' }}>
                Compare the two directly: at the recovery rate you set, the bank costs you{' '}
                <strong>{money(cut.lost)}</strong>. The 2008 scenario, run on your mix, costs{' '}
                <strong>{money(Math.abs(gfcLoss(a)))}</strong>. Neither number is a prediction. The comparison is the
                point.
              </p>
            </Box>
          </Reveal>
        </div>
      ) : (
        <Box variant="quiet">
          <p className="mwm-note">
            You marked nothing as unreachable, so there is nothing for this test to cut. That is the position to
            protect. The fastest way to lose it is to let one institution hold everything, which is what the
            concentration line in your fragility score watches.
          </p>
        </Box>
      )}
    </div>
  )
}

function gfcLoss(a: Analysis): number {
  const s = SCENARIOS.find((x) => x.id === 'gfc2008')!
  return applyScenario(a.weights, s.shocks, a.tiering.investableUsd, a.flow.spendUsd, a.allocation.stat.expectedReturn, s)
    .portfolioUsd
}

/* ------------------------------------------------------------------ */
/* 3. the currency                                                     */
/* ------------------------------------------------------------------ */

function CurrencyPanel({ a, state }: { a: Analysis; state: AppState }) {
  const codes = useMemo(() => touchedCurrencies(state.accounts, state.flows), [state])
  const [shocks, setShocks] = useState<Record<string, number>>({})
  const r = useMemo(() => applyFxStress(state.accounts, state.flows, shocks), [state, shocks])

  return (
    <div className="mwm-stack" style={{ gap: '1.5rem' }}>
      <PanelHead
        n="Third"
        title="The currency reprices"
        blurb="A repricing hits three things at once: what you hold in that currency, an income paid in it, and the dollar cost of a life spent in it. Which side you come out on depends on which of the three are yours."
      />

      {codes.length === 0 ? (
        <Box variant="quiet">
          <p className="mwm-note">
            Everything you hold, earn and spend is in dollars, so there is no exchange rate to test. What can still
            reprice is what a dollar buys. That test is the 1970s scenario in the market panel above.
          </p>
        </Box>
      ) : (
        <div className="mwm-grid mwm-grid--wide" style={{ alignItems: 'start' }}>
          <div className="mwm-stack" style={{ gap: '1.5rem' }}>
            <Reveal>
              <Box>
                <p className="mwm-eyebrow">Set the shock. The tool has no opinion.</p>
                <div className="mwm-stack" style={{ gap: '1.3rem', marginTop: '1.4rem' }}>
                  {codes.map((code) => (
                    <div key={code}>
                      <div className="mwm-row" style={{ justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span className="mwm-note" style={{ color: 'var(--fg)' }}>
                          {code} · {rate(code).name}
                        </span>
                        <span className="mwm-tabular" style={{ fontWeight: 600 }}>
                          {shocks[code] ? `loses ${Math.abs(shocks[code])}% of its dollar value` : 'unchanged'}
                        </span>
                      </div>
                      <Slider
                        value={shocks[code] ?? 0}
                        onChange={(v) => setShocks((s) => ({ ...s, [code]: v }))}
                        min={-95}
                        max={0}
                        step={5}
                      />
                    </div>
                  ))}
                </div>
                {Object.values(shocks).some((v) => v !== 0) ? (
                  <button className="mwm-link" style={{ marginTop: '1.2rem' }} onClick={() => setShocks({})}>
                    Put them back
                  </button>
                ) : null}
                <p className="mwm-tiny" style={{ marginTop: '1.2rem' }}>
                  For scale: Lebanon's official rate moved from 1,507.5 pounds per dollar to 89,500 between February
                  2023 and early 2024. Money valued at the old official rate kept about{' '}
                  {((1507.5 / 89500) * 100).toFixed(1)} percent of its dollar value at the new one.{' '}
                  <Source url="https://bdl.gov.lb/currentrate.php" label="Banque du Liban" />
                </p>
              </Box>
            </Reveal>

            <Reveal delay={0.06}>
              <Box variant="quiet">
                <p className="mwm-eyebrow">Which side of the trade you are on</p>
                <p className="mwm-body" style={{ marginTop: '1rem' }}>
                  {a.mismatch.side === 'good'
                    ? `You earn in ${a.mismatch.incomeCurrency} and spend in ${a.mismatch.spendCurrency}. Earning in the harder currency and spending in the softer one is the good side of this trade, and it is worth protecting: when the soft currency falls, your costs fall with it and your income does not.`
                    : a.mismatch.side === 'bad'
                      ? `You earn in ${a.mismatch.incomeCurrency} and spend in ${a.mismatch.spendCurrency}. Earning in the softer currency and spending in the harder one is the wrong side of this trade. Your income can fall against your costs without a single visible event. Watch what the sliders do to your monthly surplus.`
                      : `You earn and spend in the same currency, so a repricing moves your income and your costs together. The exposed part is whatever you hold in currencies softer than the one your life is priced in.`}
                </p>
                {a.mismatch.holdingsSofterThanSpendPct > 1 ? (
                  <p className="mwm-note" style={{ marginTop: '0.9rem' }}>
                    {a.mismatch.holdingsSofterThanSpendPct.toFixed(0)} percent of what you hold sits in currencies
                    softer than the one you spend in.
                  </p>
                ) : null}
              </Box>
            </Reveal>
          </div>

          <Reveal delay={0.08}>
            <Box variant={r.shocked ? 'accent' : 'edge'}>
              <p className="mwm-eyebrow">{r.shocked ? 'After your shock' : 'Move a slider to see the damage'}</p>
              <div className="mwm-stack" style={{ gap: '1.1rem', marginTop: '1.4rem' }}>
                <Before k="What you hold" before={r.totalUsd} after={r.totalAfterUsd} />
                <Before k="Income, a month" before={r.incomeUsd} after={r.incomeAfterUsd} />
                <Before k="Spending, a month" before={r.spendUsd} after={r.spendAfterUsd} />
                <Before k="Left over, a month" before={r.surplusUsd} after={r.surplusAfterUsd} signed />
                {r.spendUsd > 0 ? (
                  <div>
                    <div className="mwm-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="mwm-note" style={{ color: 'var(--fg)' }}>
                        Months covered
                      </span>
                      <span className="mwm-num" style={{ fontSize: '1.7rem' }}>
                        {r.runwayMonths.toFixed(1)} <span style={{ color: 'var(--muted)' }}>→</span>{' '}
                        {r.runwayAfterMonths.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
              {r.shocked && r.spendAfterUsd < r.spendUsd ? (
                <p className="mwm-tiny" style={{ marginTop: '1.4rem' }}>
                  Your spending got cheaper in dollars because your life is priced in the falling currency. Be careful
                  with that comfort: after a repricing, local prices tend to chase the dollar. This shows the day-one
                  arithmetic, not the year-two equilibrium.
                </p>
              ) : null}
            </Box>
          </Reveal>
        </div>
      )}
    </div>
  )
}

function Before({ k, before, after, signed = false }: { k: string; before: number; after: number; signed?: boolean }) {
  const moved = Math.abs(after - before) > 0.5
  return (
    <div>
      <div className="mwm-row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
        <span className="mwm-note" style={{ color: 'var(--fg)' }}>
          {k}
        </span>
        <span className="mwm-num" style={{ fontSize: '1.7rem', whiteSpace: 'nowrap' }}>
          {moved ? (
            <>
              {fmtUsd(before, { sign: signed && before > 0 })} <span style={{ color: 'var(--muted)' }}>→</span>{' '}
              <span className={after < before ? 'mwm-accent' : ''}>{fmtUsd(after, { sign: signed && after > 0 })}</span>
            </>
          ) : (
            fmtUsd(before, { sign: signed && before > 0 })
          )}
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 4. the timeline                                                     */
/* ------------------------------------------------------------------ */

function TimelinePanel({ state }: { state: AppState }) {
  const [incomeStops, setIncomeStops] = useState(true)
  const [slowFreezes, setSlowFreezes] = useState(false)
  const codes = useMemo(() => touchedCurrencies(state.accounts, state.flows), [state])
  const [fxOn, setFxOn] = useState(false)
  const [fxPct, setFxPct] = useState(-50)

  const dials = useMemo(
    () => ({
      incomeStops,
      slowMoneyFreezes: slowFreezes,
      fxShocks: fxOn ? Object.fromEntries(codes.map((c) => [c, fxPct])) : {},
    }),
    [incomeStops, slowFreezes, fxOn, fxPct, codes],
  )

  const calm = useMemo(() => simulateBreaks(state.accounts, state.flows, NO_STRESS), [state])
  const stressed = useMemo(() => simulateBreaks(state.accounts, state.flows, dials), [state, dials])

  return (
    <div className="mwm-stack" style={{ gap: '1.5rem' }}>
      <PanelHead
        n="Last"
        title="The timeline"
        blurb="Everything above, combined and put on a calendar. The simulation spends your reachable money first, then whatever the declared limits deliver each month. Money with no timetable never arrives, because scheduling it would mean inventing the schedule."
      />

      <div className="mwm-grid mwm-grid--wide" style={{ alignItems: 'start' }}>
        <div className="mwm-stack" style={{ gap: '1.5rem' }}>
          <Reveal>
            <Box>
              <p className="mwm-eyebrow">The dials</p>
              <div className="mwm-stack" style={{ gap: '1.6rem', marginTop: '1.4rem' }}>
                <div>
                  <p className="mwm-label" style={{ marginBottom: '0.6rem' }}>
                    Your income
                  </p>
                  <Choices
                    row
                    value={incomeStops ? 'stops' : 'continues'}
                    onChange={(v) => setIncomeStops(v === 'stops')}
                    options={[
                      { value: 'stops', label: 'It stops tomorrow' },
                      { value: 'continues', label: 'It keeps coming' },
                    ]}
                  />
                </div>
                <div>
                  <p className="mwm-label" style={{ marginBottom: '0.6rem' }}>
                    The slow accounts
                  </p>
                  <Choices
                    row
                    value={slowFreezes ? 'freeze' : 'drip'}
                    onChange={(v) => setSlowFreezes(v === 'freeze')}
                    options={[
                      { value: 'drip', label: 'Keep paying their limits' },
                      { value: 'freeze', label: 'Freeze entirely' },
                    ]}
                  />
                </div>
                {codes.length > 0 ? (
                  <div>
                    <p className="mwm-label" style={{ marginBottom: '0.6rem' }}>
                      The soft currencies
                    </p>
                    <Choices
                      row
                      value={fxOn ? 'fall' : 'hold'}
                      onChange={(v) => setFxOn(v === 'fall')}
                      options={[
                        { value: 'hold', label: 'Hold their value' },
                        { value: 'fall', label: 'All reprice at once' },
                      ]}
                    />
                    {fxOn ? (
                      <div style={{ marginTop: '1rem' }}>
                        <p className="mwm-note" style={{ marginBottom: '0.3rem' }}>
                          Each loses {Math.abs(fxPct)}% of its dollar value
                        </p>
                        <Slider value={fxPct} onChange={setFxPct} min={-95} max={0} step={5} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Box>
          </Reveal>

          <Reveal delay={0.06}>
            <Box>
              <p className="mwm-eyebrow">What gives out, in order</p>
              <div className="mwm-stack" style={{ gap: '1.3rem', marginTop: '1.4rem' }}>
                {stressed.events.length ? (
                  stressed.events.map((e) => (
                    <div key={e.id} className="mwm-row" style={{ gap: '1rem', alignItems: 'flex-start' }}>
                      <span
                        className="mwm-num"
                        style={{ fontSize: '1.8rem', color: 'var(--accent)', minWidth: '3.4rem', lineHeight: 1.1 }}
                      >
                        {e.month !== null ? `m${e.month}` : '—'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600 }}>{e.title}</p>
                        <p className="mwm-tiny" style={{ marginTop: '0.3rem' }}>
                          {e.detail}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="mwm-note">
                    Nothing gives out. Under these settings your income covers your spending and the pool never
                    drains. Stress it harder and watch where the first crack appears.
                  </p>
                )}
              </div>
            </Box>
          </Reveal>
        </div>

        <div className="mwm-stack" style={{ gap: '1.5rem' }}>
          <Reveal delay={0.08}>
            <Box variant="accent">
              <p className="mwm-eyebrow">The last month you cover in full</p>
              <p className="mwm-num" style={{ fontSize: 'clamp(3rem, 6vw, 4.2rem)', marginTop: '0.6rem' }}>
                {stressed.survivalMonths === null ? 'Never breaks' : `Month ${stressed.survivalMonths}`}
              </p>
              <p className="mwm-note" style={{ marginTop: '0.6rem' }}>
                {stressed.survivalMonths === null
                  ? 'Income and drips cover the burn for at least five years under these settings.'
                  : `After month ${stressed.survivalMonths}, the money with a real timetable cannot pay for a full month of your life.`}
              </p>
              <div style={{ marginTop: '1.8rem' }}>
                <TimelineChart
                  timeline={stressed.timeline}
                  breakMonth={stressed.survivalMonths}
                  monthlySpendUsd={stressed.spendAfterUsd}
                />
              </div>
            </Box>
          </Reveal>

          <Reveal delay={0.12}>
            <Pair
              left={
                <>
                  <p className="mwm-tiny">as things are, income intact</p>
                  <p className="mwm-num" style={{ fontSize: '1.9rem', marginTop: '0.4rem' }}>
                    {calm.survivalMonths === null ? 'holds' : `${calm.survivalMonths} mo`}
                  </p>
                </>
              }
              right={
                <>
                  <p className="mwm-tiny">under your dials</p>
                  <p className="mwm-num mwm-accent" style={{ fontSize: '1.9rem', marginTop: '0.4rem' }}>
                    {stressed.survivalMonths === null ? 'holds' : `${stressed.survivalMonths} mo`}
                  </p>
                </>
              }
            />
          </Reveal>

          {stressed.strandedUsd > 0 ? (
            <Reveal delay={0.16}>
              <Box variant="quiet">
                <p className="mwm-note">
                  Throughout all of this, <strong>{money(stressed.strandedUsd)}</strong> of yours sits on the
                  sidelines: trapped, frozen, or slow with no declared limit. The simulation never spends it. That is
                  not pessimism about your money. It is a refusal to budget with money that has no date on it.
                </p>
              </Box>
            </Reveal>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function PanelHead({ n, title, blurb }: { n: string; title: string; blurb: string }) {
  return (
    <div className="mwm-head" style={{ marginBottom: 0 }}>
      <div>
        <p className="mwm-eyebrow">{n}</p>
        <h3 style={{ marginTop: '0.6rem' }}>{title}</h3>
      </div>
      <p className="mwm-note">{blurb}</p>
    </div>
  )
}

function Row({ k, v, s }: { k: string; v: string; s?: string }) {
  return (
    <div>
      <div className="mwm-row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
        <span className="mwm-note" style={{ color: 'var(--fg)' }}>
          {k}
        </span>
        <span className="mwm-num" style={{ fontSize: '1.7rem', whiteSpace: 'nowrap' }}>
          {v}
        </span>
      </div>
      {s ? (
        <p className="mwm-tiny" style={{ marginTop: '0.25rem' }}>
          {s}
        </p>
      ) : null}
    </div>
  )
}
