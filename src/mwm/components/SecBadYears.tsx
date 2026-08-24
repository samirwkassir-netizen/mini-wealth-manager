import { useMemo, useState } from 'react'
import {
  ASSET_KEYS,
  SCENARIOS,
  applyScenario,
  assetMeta,
  fmtUsd,
  haircutRestricted,
  type Analysis,
} from '../engine'
import { Box, Pill, Reveal, SectionHead, Slider, Source, Disclose } from './ui'
import { StressBars } from './charts'

const money = (n: number) => fmtUsd(n)

export function SecBadYears({ a }: { a: Analysis }) {
  const [active, setActive] = useState(SCENARIOS[0].id)
  const [custom, setCustom] = useState<Record<string, number>>({})
  const [recovery, setRecovery] = useState(20)

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
  const cut = haircutRestricted(a.standing.restrictedUsd, a.standing.totalUsd, recovery)

  return (
    <div className="mwm-stack" style={{ gap: '3rem' }}>
      <SectionHead
        eyebrow="Section 05"
        title="Bad years"
        lede="Three of these really happened. The fourth has not and may never. Where a real figure could not be found, the line is held flat and labelled rather than filled in with something plausible."
      />

      <div className="mwm-row" style={{ gap: '0.6rem' }}>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            className={`mwm-btn ${active === s.id ? '' : 'mwm-btn--ghost'}`}
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

        <div className="mwm-stack" style={{ gap: '1.5rem' }}>
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
                  Nothing moves, because none of your money is invested yet. It is all emergency cash. That is not a
                  bug and it is not nothing: it is exactly what a full cushion buys you. The price is that the same
                  money barely keeps up with prices while it sits there.
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

          {a.standing.restrictedUsd > 0 ? (
            <Reveal delay={0.14}>
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
                <p className="mwm-note" style={{ marginTop: '1.4rem' }}>
                  Compare that to the crash beside it. For a lot of people reading this, the bigger risk to their money
                  is not the stock market. It is the bank holding the part they think of as safe.
                </p>
              </Box>
            </Reveal>
          ) : null}
        </div>
      </div>
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
