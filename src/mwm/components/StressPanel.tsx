import { useMemo, useState } from 'react'
import {
  ASSET_KEYS,
  SCENARIOS,
  applyScenario,
  assetMeta,
  fmtPct,
  fmtUsd,
  haircutRestricted,
  type Analysis,
} from '../engine'
import { Card, Pill, Reveal, SectionHead, Source, Why } from './ui'
import { StressBars } from './charts'

export function StressPanel({ a }: { a: Analysis }) {
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
    <section style={{ paddingTop: '3rem' }}>
      <SectionHead
        index="Stress"
        title="What a bad decade looks like"
        intro="Three of these happened. The fourth has not. Where a figure could not be verified from a real source it is held flat and labelled, which understates how much diversification actually helped. A blank cell is more honest than a plausible guess."
      />

      <div className="mwm-row" style={{ gap: '0.5rem', marginBottom: '1.2rem' }}>
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

      <div className="mwm-grid mwm-grid--sidebar" style={{ alignItems: 'start' }}>
        <Reveal>
          <Card>
            <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
              <p className="mwm-eyebrow">{scenario.period}</p>
              <Pill tone={scenario.kind === 'historical' ? 'default' : 'warn'}>
                {scenario.kind === 'historical' ? 'this happened' : 'this has not happened'}
              </Pill>
            </div>
            <p className="mwm-lede" style={{ marginTop: '0.8rem', fontSize: '0.98rem' }}>
              {scenario.summary}
            </p>
            <p className="mwm-small" style={{ marginTop: '0.7rem' }}>
              {scenario.headline} {scenario.headlineSource ? <Source url={scenario.headlineSource} /> : null}
            </p>

            <hr className="mwm-divider" style={{ margin: '1.3rem 0' }} />

            <p className="mwm-eyebrow">Where the damage comes from</p>
            <div style={{ marginTop: '0.9rem' }}>
              <StressBars rows={result.contributions} />
            </div>

            {scenario.editable ? (
              <div style={{ marginTop: '1.4rem' }}>
                <p className="mwm-eyebrow">These are assumptions. Change them.</p>
                <div className="mwm-stack" style={{ gap: '0.6rem', marginTop: '0.8rem' }}>
                  {ASSET_KEYS.filter((k) => a.weights[k] > 0.05).map((k) => (
                    <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr) auto', gap: '0.7rem', alignItems: 'center' }}>
                      <span className="mwm-small" style={{ color: 'var(--ink)' }}>
                        {assetMeta(k).label}
                      </span>
                      <input
                        type="range"
                        min={-90}
                        max={200}
                        step={5}
                        value={shocks[k] ?? 0}
                        onChange={(e) => setCustom((c) => ({ ...c, [k]: Number(e.target.value) }))}
                        style={{ width: '100%', accentColor: 'var(--oxblood)' }}
                      />
                      <span className="mwm-tabular mwm-small" style={{ minWidth: '3.4rem', textAlign: 'right' }}>
                        {(shocks[k] ?? 0) > 0 ? '+' : ''}
                        {shocks[k] ?? 0}%
                      </span>
                    </div>
                  ))}
                </div>
                <button className="mwm-linkish" style={{ marginTop: '0.8rem' }} onClick={() => setCustom({})}>
                  reset to the defaults
                </button>
              </div>
            ) : null}

            <Why title="Show every figure and where it came from">
              <div className="mwm-scroll-x">
                <table className="mwm-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th className="num">Figure</th>
                      <th>What it actually measures</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenario.lines.map((l) => (
                      <tr key={l.key}>
                        <td>{ASSET_KEYS.includes(l.key as never) ? assetMeta(l.key as never).label : l.key}</td>
                        <td className="num" style={{ fontWeight: l.verified ? 600 : 400, color: l.verified ? 'var(--ink)' : 'var(--smoke)' }}>
                          {l.figure}
                        </td>
                        <td style={{ maxWidth: '34ch' }}>{l.measures}</td>
                        <td>
                          <Source url={l.source} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Why>
          </Card>
        </Reveal>

        <div className="mwm-stack" style={{ gap: '1rem' }}>
          <Reveal delay={0.06}>
            <Card tone="ink">
              <p className="mwm-eyebrow">Your portfolio in this scenario</p>
              <p
                className="mwm-tabular"
                style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '2.6rem', letterSpacing: '-0.03em', marginTop: '0.4rem' }}
              >
                {result.portfolioPct >= 0 ? '+' : ''}
                {result.portfolioPct.toFixed(1)}%
              </p>
              <p className="mwm-small">
                {fmtUsd(amount)} becomes {fmtUsd(result.afterUsd)}.
              </p>
              {a.tiering.growthUsd <= 0 ? (
                <p className="mwm-small" style={{ marginTop: '0.8rem' }}>
                  Nothing moves, because nothing you can reach is invested yet. It is all buffer and near-term
                  goals. That is not a bug in the tool and it is not nothing: it is exactly what a full buffer buys
                  you. The cost is that the same money earns close to inflation while it sits there.
                </p>
              ) : null}

              <div className="mwm-stack" style={{ gap: '0.6rem', marginTop: '1.2rem' }}>
                {result.realPct !== null ? (
                  <Row k="After inflation" v={`${result.realPct.toFixed(1)}%`} s={`Prices rose ${scenario.inflation}% over the same period, so the cash figure flatters it.`} />
                ) : null}
                {result.monthsOfSpendLost > 0 ? (
                  <Row
                    k="In months of your spending"
                    v={result.monthsOfSpendLost.toFixed(1)}
                    s="What the loss would have bought you, which is a more useful unit than a percentage."
                  />
                ) : null}
                {result.yearsToRecover > 0 ? (
                  <Row
                    k="Years to get back"
                    v={result.yearsToRecover.toFixed(1)}
                    s={`At the model's ${fmtPct(a.allocation.stat.expectedReturn)} expected return, and only if you did not sell.`}
                  />
                ) : null}
                {result.worstLine ? (
                  <Row k="Worst holding" v={`${result.worstLine.shock.toFixed(0)}%`} s={result.worstLine.label} />
                ) : null}
              </div>
            </Card>
          </Reveal>

          {a.standing.restrictedUsd > 0 ? (
            <Reveal delay={0.1}>
              <Card>
                <p className="mwm-eyebrow">The stress test nobody else runs</p>
                <p className="mwm-small" style={{ marginTop: '0.6rem' }}>
                  You told us {fmtUsd(a.standing.restrictedUsd)} is money you cannot get at. Suppose it eventually
                  comes back at a fraction of its face value. This tool has no view on what that fraction should be.
                  Set it yourself.
                </p>
                <div style={{ marginTop: '1rem' }}>
                  <p className="mwm-label">You eventually recover {recovery}% of it</p>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={recovery}
                    onChange={(e) => setRecovery(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--oxblood)' }}
                  />
                </div>
                <div className="mwm-stack" style={{ gap: '0.5rem', marginTop: '1rem' }}>
                  <Row k="You get back" v={fmtUsd(cut.recovered)} />
                  <Row k="You lose" v={fmtUsd(cut.lost)} s={`${cut.lossPctOfNetWorth.toFixed(0)}% of everything you own`} />
                  <Row k="Net worth becomes" v={fmtUsd(cut.newTotal)} />
                </div>
                <p className="mwm-small" style={{ marginTop: '0.9rem' }}>
                  Compare that number to the market scenario beside it. For a lot of people reading this, the larger
                  risk to their wealth is not the stock market. It is the institution holding the part of their money
                  they think of as safe.
                </p>
              </Card>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function Row({ k, v, s }: { k: string; v: string; s?: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.8rem' }}>
        <span style={{ fontSize: '0.85rem' }}>{k}</span>
        <span className="mwm-tabular" style={{ fontSize: '1.1rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {v}
        </span>
      </div>
      {s ? (
        <p className="mwm-small" style={{ marginTop: '0.15rem' }}>
          {s}
        </p>
      ) : null}
    </div>
  )
}
