import { useState } from 'react'
import selfData from '../data/selfInvestment.json'
import { fmtUsd, type Analysis } from '../engine'
import { Card, Counter, Pill, Reveal, SectionHead, StatTile, Source, Why } from './ui'
import { AllocationSection } from './Allocation'
import { StressPanel } from './StressPanel'
import { AccessPanel, Ledger } from './Ledger'

const money = (n: number) => fmtUsd(n)

export function Results({
  a,
  mirror,
  uplift,
  setUplift,
  onPick,
  onRestart,
}: {
  a: Analysis
  mirror: Analysis
  uplift: number
  setUplift: (n: number) => void
  onPick: (key: string, id: string) => void
  onRestart: () => void
}) {
  return (
    <div className="mwm-shell" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <Headline a={a} mirror={mirror} />
      <FirstMoves a={a} />
      <Yourself a={a} uplift={uplift} setUplift={setUplift} />
      <AllocationSection a={a} onPick={onPick} />
      <StressPanel a={a} />
      <AccessPanel />
      <Ledger />

      <div className="mwm-row mwm-noprint" style={{ marginTop: '2.5rem', gap: '0.7rem' }}>
        <button className="mwm-btn mwm-btn--ghost" onClick={onRestart}>
          Start again
        </button>
        <button className="mwm-btn mwm-btn--ghost" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Headline({ a, mirror }: { a: Analysis; mirror: Analysis }) {
  const gap = a.standing.totalUsd - a.standing.deployableUsd

  return (
    <section>
      <SectionHead
        index="What this comes to"
        title="Your plan runs on the second number"
        intro="The first number is what you own. The second is what you can reach and move. Everything below is built on the second one, because a balance you cannot draw on will not pay a bill."
      />

      <div className="mwm-grid mwm-grid--3">
        <Reveal>
          <StatTile
            label="What you own"
            value={<Counter value={a.standing.totalUsd} format={money} />}
            sub="Everything, converted at the frozen rates in the ledger at the bottom of this page."
          />
        </Reveal>
        <Reveal delay={0.07}>
          <StatTile
            label="What you can put to work"
            value={<Counter value={a.standing.deployableUsd} format={money} />}
            sub={
              gap > 1
                ? `${money(gap)} is trapped, slow, or cannot cross a border. It is not gone. It is just not something you can plan around.`
                : 'All of it is reachable and can move. That is a stronger position than most people reading this are in.'
            }
            tone="ink"
          />
        </Reveal>
        <Reveal delay={0.14}>
          <StatTile
            label="Runway you can reach"
            value={`${a.flow.runwayAccessibleMonths.toFixed(1)} mo`}
            sub={`Against a target of ${a.tiering.bufferTargetMonths} months, which your own answers set rather than a rule of thumb.`}
          />
        </Reveal>
      </div>

      {a.standing.deployableUsd < a.standing.totalUsd - 1 ? (
        <Reveal delay={0.1}>
          <Card style={{ marginTop: '1.2rem' }}>
            <p className="mwm-eyebrow">The same money, held somewhere it can move</p>
            <p className="mwm-lede" style={{ marginTop: '0.6rem', fontSize: '0.95rem' }}>
              Nothing changes here except where the money sits. Same amount, same income, same answers to every
              question. This is the difference the standard model does not price.
            </p>
            <div className="mwm-stack" style={{ gap: '0.1rem', marginTop: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '0.8rem', paddingBottom: '0.5rem' }}>
                <p className="mwm-eyebrow" style={{ color: 'var(--smoke)' }}>
                  You, as things are
                </p>
                <p className="mwm-eyebrow">The same money, reachable</p>
              </div>
              {[
                { k: 'Money you can put to work', l: money(a.standing.deployableUsd), r: money(mirror.standing.deployableUsd) },
                { k: 'Runway', l: `${a.flow.runwayAccessibleMonths.toFixed(1)} months`, r: `${mirror.flow.runwayAccessibleMonths.toFixed(1)} months` },
                { k: 'Buffer the tool asks for', l: `${a.tiering.bufferTargetMonths} months`, r: `${mirror.tiering.bufferTargetMonths} months` },
                { k: 'Gold in the portfolio', l: `${a.growth.gold.toFixed(0)}%`, r: `${mirror.growth.gold.toFixed(0)}%` },
                { k: 'Long-term portfolio', l: money(a.tiering.growthUsd), r: money(mirror.tiering.growthUsd) },
                { k: 'First thing to do', l: a.actions[0]?.title ?? '', r: mirror.actions[0]?.title ?? '' },
              ].map((row) => (
                <div key={row.k} style={{ borderTop: '1px solid var(--hairline)', padding: '0.7rem 0' }}>
                  <p className="mwm-small" style={{ marginBottom: '0.35rem' }}>
                    {row.k}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '0.8rem' }}>
                    <span className="mwm-tabular" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                      {row.l}
                    </span>
                    <span className="mwm-tabular" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--oxblood)' }}>
                      {row.r}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>
      ) : null}

      {a.standing.flags.concat(a.flow.flags).filter((f) => f.severity !== 'note').length ? (
        <Reveal delay={0.1}>
          <Card style={{ marginTop: '1.2rem' }}>
            <p className="mwm-eyebrow">What stands out</p>
            <div className="mwm-stack" style={{ gap: '1rem', marginTop: '0.9rem' }}>
              {a.standing.flags
                .concat(a.flow.flags)
                .filter((f) => f.severity !== 'note')
                .map((f) => (
                  <div key={f.id} className={`mwm-callout mwm-callout--${f.severity}`}>
                    <p style={{ fontWeight: 600, fontSize: '0.92rem' }}>{f.title}</p>
                    <p className="mwm-small" style={{ marginTop: '0.25rem' }}>
                      {f.body}
                    </p>
                  </div>
                ))}
            </div>
          </Card>
        </Reveal>
      ) : null}
    </section>
  )
}

/* ------------------------------------------------------------------ */

function FirstMoves({ a }: { a: Analysis }) {
  return (
    <section style={{ paddingTop: '3rem' }}>
      <SectionHead
        index="In order"
        title="What to do, first to last"
        intro="Two people with the same seven thousand dollars get different first moves here. That is the argument of this whole project: the right answer depends on which system holds your money, not only on how much of it there is."
      />

      <div className="mwm-stack" style={{ gap: '0.7rem' }}>
        {a.actions.map((m, i) => (
          <Reveal key={m.id} delay={i * 0.05}>
            <Card>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: '1rem', alignItems: 'start' }}>
                <span
                  className="mwm-tabular"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '999px',
                    background: m.tag === 'before markets' ? 'var(--oxblood)' : 'var(--ink)',
                    color: 'var(--paper)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {m.order}
                </span>
                <div>
                  <div className="mwm-row" style={{ justifyContent: 'space-between', gap: '0.6rem' }}>
                    <p style={{ fontWeight: 600, fontSize: '1.02rem' }}>{m.title}</p>
                    <Pill tone={m.tag === 'before markets' ? 'warn' : 'default'}>{m.tag}</Pill>
                  </div>
                  <p className="mwm-small" style={{ marginTop: '0.4rem', maxWidth: '72ch' }}>
                    {m.body}
                  </p>
                </div>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Yourself({ a, uplift, setUplift }: { a: Analysis; uplift: number; setUplift: (n: number) => void }) {
  const [openTest, setOpenTest] = useState(false)
  const cfa = selfData.categories.find((c) => c.id === 'credential')?.verifiedCost

  const perDollar = a.allocation.stat.expectedReturn > 0 ? 12 / (a.allocation.stat.expectedReturn / 100) : 0

  return (
    <section style={{ paddingTop: '3rem' }}>
      <SectionHead
        index="Before the market"
        title="The highest return available to you is probably not a fund"
        intro="This is the part most portfolio tools leave out, because there is no product to sell at the end of it. If you do not yet have a significant or recurring income, the capital you have is worth more building that income than it is sitting in an index."
      />

      <Reveal>
        <Card tone="ink">
          <p className="mwm-eyebrow">The arithmetic, using your own numbers</p>

          <div className="mwm-grid mwm-grid--2" style={{ marginTop: '1.2rem', gap: '1.6rem' }}>
            <div>
              <p style={{ fontSize: '0.9rem' }}>
                {money(a.human.investableUsd)} invested, at the model&rsquo;s expected return of{' '}
                {a.allocation.stat.expectedReturn.toFixed(1)} percent, throws off
              </p>
              <p
                className="mwm-tabular"
                style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', marginTop: '0.4rem' }}
              >
                <Counter value={a.human.marketIncomeMonthUsd} format={money} /> a month
              </p>
              <p className="mwm-small" style={{ marginTop: '0.3rem' }}>
                Before inflation, before tax, and only on average across a long stretch of years.
              </p>
            </div>

            <div>
              <p style={{ fontSize: '0.9rem' }}>
                Earning an extra <strong>{money(uplift)}</strong> a month is worth the same as having
              </p>
              <p
                className="mwm-tabular"
                style={{
                  fontFamily: "'EB Garamond', Georgia, serif",
                  fontSize: 'clamp(2rem,5vw,3rem)',
                  letterSpacing: '-0.03em',
                  marginTop: '0.4rem',
                  color: 'rgb(250 250 247)',
                }}
              >
                <Counter value={a.human.upliftEquivalentCapitalUsd} format={money} />
              </p>
              <p className="mwm-small" style={{ marginTop: '0.3rem' }}>
                invested. That is{' '}
                {Number.isFinite(a.human.multiple) && a.human.multiple > 0
                  ? `${a.human.multiple.toFixed(a.human.multiple > 10 ? 0 : 1)} times what you can put to work today`
                  : 'more than you have'}
                .
              </p>
            </div>
          </div>

          <div style={{ marginTop: '1.6rem' }}>
            <p className="mwm-label" style={{ color: 'var(--paper)' }}>
              Drag to change the income uplift: {money(uplift)} a month
            </p>
            <input
              type="range"
              min={50}
              max={3000}
              step={50}
              value={uplift}
              onChange={(e) => setUplift(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--paper)' }}
            />
          </div>

          <p className="mwm-small" style={{ marginTop: '1.2rem' }}>
            At this portfolio&rsquo;s expected return, one dollar a month of extra income is worth about{' '}
            {perDollar.toFixed(0)} dollars of capital. Nobody is telling you not to invest. The point is that at your
            stage the two things are not competing on equal terms, and the arithmetic is not close.
          </p>
        </Card>
      </Reveal>

      <Reveal delay={0.06}>
        <Card style={{ marginTop: '1.2rem' }}>
          <p className="mwm-eyebrow">Why this applies to you right now</p>
          <div className="mwm-stack" style={{ gap: '0.8rem', marginTop: '0.9rem' }}>
            {a.human.reasons.map((r) => (
              <p key={r} className="mwm-callout" style={{ fontSize: '0.9rem' }}>
                {r}
              </p>
            ))}
          </div>
          <div className="mwm-row" style={{ marginTop: '1rem' }}>
            <Pill tone={a.human.stage === 'invest' ? 'ok' : 'warn'}>
              {a.human.stage === 'buildIncome'
                ? 'stage one: build the income'
                : a.human.stage === 'buildBuffer'
                  ? 'stage two: build the buffer'
                  : 'stage three: invest'}
            </Pill>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.1}>
        <Card style={{ marginTop: '1.2rem' }}>
          <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
            <p className="mwm-eyebrow">Where that capital goes</p>
            <button className="mwm-linkish" onClick={() => setOpenTest((o) => !o)}>
              {openTest ? 'hide the test' : 'the three-question test'}
            </button>
          </div>

          {openTest ? (
            <p className="mwm-why mwm-small" style={{ marginTop: '0.8rem' }}>
              {selfData.meta.test}
            </p>
          ) : null}

          <div className="mwm-grid mwm-grid--2" style={{ marginTop: '1.1rem' }}>
            {selfData.categories.map((c) => {
              const score = [c.incomeWithin12m, c.aiResilient, c.compounds].filter(Boolean).length
              return (
                <div key={c.id} className="mwm-card mwm-card--flat" style={{ height: '100%' }}>
                  <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</p>
                    <Pill tone={score >= 2 ? 'ok' : 'warn'}>{score} of 3</Pill>
                  </div>
                  <p className="mwm-small" style={{ marginTop: '0.4rem' }}>
                    {c.examples}
                  </p>
                  <p className="mwm-small" style={{ marginTop: '0.5rem', color: 'var(--ink)' }}>
                    {'note' in c ? c.note : null}
                    {'warning' in c ? c.warning : null}
                  </p>
                  {'verifiedCost' in c && c.verifiedCost ? (
                    <p className="mwm-small" style={{ marginTop: '0.5rem' }}>
                      <strong>{c.verifiedCost.label}: </strong>
                      {money(c.verifiedCost.early)} early or {money(c.verifiedCost.standard)} standard.{' '}
                      {c.verifiedCost.note} <Source url={c.verifiedCost.source} />
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>

          <Why title="Why there are no prices on this list">
            <p>{selfData.meta.note}</p>
          </Why>
        </Card>
      </Reveal>

      {cfa ? (
        <p className="mwm-small" style={{ marginTop: '1rem' }}>
          Costs checked on {cfa.checkedOn}.
        </p>
      ) : null}
    </section>
  )
}
