import { useMemo, useState } from 'react'
import {
  ASSET_KEYS,
  CONSTRAINT_NOTE,
  MVO_CAVEAT,
  assetMeta,
  fmtPct,
  fmtUsd,
  frontier,
  instrumentById,
  instrumentsFor,
  maxSharpePortfolio,
  portfolioReturn,
  portfolioVol,
  toVector,
  type Analysis,
} from '../engine'
import { Card, Reveal, SectionHead, Select, Swatch, Why, CHART_COLOR } from './ui'
import { Donut, FrontierChart, SplitBar } from './charts'

export function AllocationSection({
  a,
  onPick,
}: {
  a: Analysis
  onPick: (key: string, id: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const slices = a.allocation.rows.map((r) => ({ key: r.key, label: r.label, value: r.weight }))

  const curve = useMemo(() => frontier().map((p) => ({ ret: p.ret, vol: p.vol })), [])
  const best = useMemo(() => maxSharpePortfolio(), [])

  const markers = useMemo(() => {
    const whole = toVector(a.weights)
    const sleeve = toVector(a.growth)
    return [
      { label: 'your whole plan', ret: portfolioReturn(whole), vol: portfolioVol(whole), emphasis: true },
      { label: 'your long-term sleeve alone', ret: portfolioReturn(sleeve), vol: portfolioVol(sleeve) },
      { label: 'best risk-adjusted, in theory', ret: best.ret, vol: best.vol, hollow: true },
    ]
  }, [a, best])

  const tierSegments = [
    { key: 'safety', label: 'buffer', value: a.tiering.safetyUsd, color: 'var(--c-shortGov)' },
    { key: 'goals', label: 'near-term goals', value: a.tiering.shortGoalsUsd, color: 'var(--c-tips)' },
    { key: 'growth', label: 'long-term portfolio', value: a.tiering.growthUsd, color: 'var(--oxblood)' },
  ]

  return (
    <section style={{ paddingTop: '3rem' }}>
      <SectionHead
        index="The portfolio"
        title={`${a.risk.level}, because of what you told us`}
        intro={
          a.tiering.growthUsd > 0
            ? 'Three tiers. A buffer you can reach, money for anything you need inside three years, and only then a long-term portfolio. The tiers come first because the order is what makes the third one survivable.'
            : 'There is no long-term portfolio yet, and that is the correct answer rather than a failure. Everything you can reach is doing a more important job first.'
        }
      />

      {a.risk.override ? (
        <Card tone="flat" style={{ marginBottom: '1.2rem' }}>
          <p className="mwm-small">
            <strong>Adjusted. </strong>
            {a.risk.override}
          </p>
        </Card>
      ) : null}

      <Reveal>
        <Card>
          <p className="mwm-eyebrow">How {fmtUsd(a.tiering.investableUsd)} gets split</p>
          <div style={{ marginTop: '0.9rem' }}>
            <SplitBar segments={tierSegments} />
          </div>
          <div className="mwm-grid mwm-grid--3" style={{ marginTop: '1.3rem' }}>
            {[
              {
                t: `${a.tiering.bufferTargetMonths} months of buffer`,
                v: fmtUsd(a.tiering.safetyUsd),
                s:
                  a.tiering.shortfallUsd > 0
                    ? `${fmtUsd(a.tiering.shortfallUsd)} short of the target. Fill this before anything else.`
                    : 'Full. This is what lets the rest be left alone.',
              },
              {
                t: 'Goals inside three years',
                v: fmtUsd(a.tiering.shortGoalsUsd),
                s: 'Held in cash and short government bonds. Money with a date on it does not belong in shares.',
              },
              {
                t: 'The long-term portfolio',
                v: fmtUsd(a.tiering.growthUsd),
                s: 'What is left after the first two are honest. This is the only part that gets to take risk.',
              },
            ].map((x) => (
              <div key={x.t}>
                <p className="mwm-eyebrow">{x.t}</p>
                <p className="mwm-tabular" style={{ fontSize: '1.4rem', fontWeight: 600, marginTop: '0.3rem' }}>
                  {x.v}
                </p>
                <p className="mwm-small" style={{ marginTop: '0.25rem' }}>
                  {x.s}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      <div className="mwm-grid mwm-grid--sidebar" style={{ marginTop: '1.2rem', alignItems: 'start' }}>
        <Reveal delay={0.05}>
          <Card>
            <p className="mwm-eyebrow">What you would actually hold</p>
            <div className="mwm-scroll-x" style={{ marginTop: '0.9rem' }}>
              <table className="mwm-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th className="num">Weight</th>
                    <th className="num">Amount</th>
                    <th>Fund</th>
                    <th className="num">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {a.allocation.rows.map((r) => {
                    const inst = instrumentById(r.instrumentId)!
                    const options = instrumentsFor(r.key)
                    return (
                      <tr key={r.key}>
                        <td>
                          <span className="mwm-row" style={{ gap: '0.45rem' }}>
                            <Swatch color={CHART_COLOR[r.key]} />
                            <span style={{ fontWeight: 600 }}>{r.label}</span>
                          </span>
                          <p className="mwm-small" style={{ marginTop: '0.2rem', maxWidth: '30ch' }}>
                            {r.plain}
                          </p>
                        </td>
                        <td className="num" style={{ fontWeight: 600 }}>
                          {r.weight.toFixed(1)}%
                        </td>
                        <td className="num">{fmtUsd(r.usd)}</td>
                        <td style={{ minWidth: '13rem' }}>
                          {options.length > 1 ? (
                            <Select
                              value={inst.id}
                              onChange={(v) => onPick(r.key, v)}
                              options={options.map((o) => ({ value: o.id, label: `${o.id} · ${o.domicile === 'Ireland' ? 'Irish' : 'US'} · ${o.ter}%` }))}
                            />
                          ) : (
                            <span>{inst.id}</span>
                          )}
                          <p className="mwm-small" style={{ marginTop: '0.25rem' }}>
                            {inst.name}
                          </p>
                          {inst.concentration ? (
                            <p className="mwm-small" style={{ marginTop: '0.2rem', color: 'var(--oxblood)' }}>
                              {inst.concentration}
                            </p>
                          ) : null}
                        </td>
                        <td className="num">{inst.ter.toFixed(2)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Why title="Why these funds and not the American ones">
              <p>
                If you are not a US person, the tool defaults to Irish funds. An Irish fund holding American shares
                pays 15 percent US tax on the dividends it receives under the US-Ireland treaty. Holding the American
                fund directly, from a country with no US tax treaty, means 30 percent. On top of that, US-situated
                assets above 60,000 dollars are exposed to US estate tax at rates up to 40 percent for a
                non-resident, and shares of an Irish company are not US-situated property. Sources are in the ledger
                at the bottom of this page.
              </p>
            </Why>
          </Card>
        </Reveal>

        <div className="mwm-stack" style={{ gap: '1rem' }}>
          <Reveal delay={0.1}>
            <Card>
              <div style={{ display: 'grid', placeItems: 'center' }}>
                <Donut slices={slices} />
              </div>
              <div className="mwm-stack" style={{ gap: '0.35rem', marginTop: '1.1rem' }}>
                {a.allocation.rows.map((r) => (
                  <div key={r.key} className="mwm-row" style={{ justifyContent: 'space-between' }}>
                    <span className="mwm-row" style={{ gap: '0.4rem' }}>
                      <Swatch color={CHART_COLOR[r.key]} />
                      <span style={{ fontSize: '0.84rem' }}>{r.label}</span>
                    </span>
                    <span className="mwm-tabular mwm-small">{r.weight.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.15}>
            <Card tone="ink">
              <p className="mwm-eyebrow">What the model expects</p>
              <div className="mwm-stack" style={{ gap: '0.7rem', marginTop: '0.9rem' }}>
                {[
                  { k: 'Expected return', v: fmtPct(a.allocation.stat.expectedReturn), s: 'per year, before inflation of 2.5 percent' },
                  { k: 'Volatility', v: fmtPct(a.allocation.stat.volatility), s: 'roughly how much it moves in a typical year' },
                  { k: 'Cost', v: `${a.allocation.stat.ter.toFixed(2)}%`, s: `${fmtUsd(a.allocation.stat.terUsdPerYear)} a year on this amount` },
                ].map((x) => (
                  <div key={x.k} className="mwm-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.86rem' }}>{x.k}</span>
                    <span style={{ textAlign: 'right' }}>
                      <span className="mwm-tabular" style={{ fontSize: '1.15rem', fontWeight: 600 }}>
                        {x.v}
                      </span>
                      <span className="mwm-small" style={{ display: 'block' }}>
                        {x.s}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mwm-small" style={{ marginTop: '1rem' }}>
                About two years in three land between {fmtUsd(a.band.typicalLow)} and {fmtUsd(a.band.typicalHigh)}.
                About one year in twenty is worse than {fmtUsd(a.band.badYear)}. These come out of the volatility
                number and assume markets behave better in a crisis than they do.
              </p>
            </Card>
          </Reveal>
        </div>
      </div>

      <Reveal delay={0.1}>
        <Card style={{ marginTop: '1.2rem' }}>
          <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
            <p className="mwm-eyebrow">The other two levels, for comparison</p>
            <button className="mwm-linkish" onClick={() => setShowAll((s) => !s)}>
              {showAll ? 'hide' : 'show'}
            </button>
          </div>
          {showAll ? (
            <div className="mwm-scroll-x" style={{ marginTop: '0.9rem' }}>
              <table className="mwm-table">
                <thead>
                  <tr>
                    <th>Level</th>
                    {ASSET_KEYS.map((k) => (
                      <th key={k} className="num">
                        {assetMeta(k).label}
                      </th>
                    ))}
                    <th className="num">Return</th>
                    <th className="num">Vol</th>
                  </tr>
                </thead>
                <tbody>
                  {a.alternatives.map((alt) => (
                    <tr key={alt.level} style={alt.level === a.risk.level ? { background: 'rgb(122 31 42 / 0.04)' } : undefined}>
                      <td style={{ fontWeight: alt.level === a.risk.level ? 700 : 400 }}>
                        {alt.level}
                        {alt.level === a.risk.level ? ' ·' : ''}
                      </td>
                      {ASSET_KEYS.map((k) => (
                        <td key={k} className="num">
                          {alt.allocation.weights[k] < 0.05 ? '·' : `${alt.allocation.weights[k].toFixed(0)}%`}
                        </td>
                      ))}
                      <td className="num">{fmtPct(alt.allocation.stat.expectedReturn)}</td>
                      <td className="num">{fmtPct(alt.allocation.stat.volatility)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      </Reveal>

      {a.tiering.growthUsd > 0 ? (
        <Reveal delay={0.1}>
          <Card style={{ marginTop: '1.2rem' }}>
            <p className="mwm-eyebrow">The optimiser, shown as a check rather than as the answer</p>
            <p className="mwm-lede" style={{ marginTop: '0.7rem', fontSize: '0.95rem' }}>
              The curve is every portfolio that gets the most expected return for a given amount of movement, using
              the same published assumptions this page runs on. Your whole plan is the filled dot and it sits low,
              because most of it is buffer. The long-term sleeve on its own sits further up the curve. Neither one
              is exactly on the curve, and that is deliberate.
            </p>
            <div style={{ marginTop: '1.2rem' }}>
              <FrontierChart curve={curve} markers={markers} />
            </div>
            <Why title="Why not just take the optimiser's answer">
              <p>{MVO_CAVEAT}</p>
              <p style={{ marginTop: '0.7rem' }}>{CONSTRAINT_NOTE}</p>
            </Why>
          </Card>
        </Reveal>
      ) : (
        <Card tone="flat" style={{ marginTop: '1.2rem' }}>
          <p className="mwm-small">
            The efficient frontier is not drawn here because there is no long-term portfolio to place on it yet.
            Everything you can reach is buffer and near-term goals. Fill the buffer, come back, and this section
            appears.
          </p>
        </Card>
      )}
    </section>
  )
}
