import { useState } from 'react'
import selfData from '../data/selfInvestment.json'
import { fmtUsd, type Analysis } from '../engine'
import { Box, Counter, Pill, Reveal, SectionHead, Slider, Source, Tile } from './ui'

const money = (n: number) => fmtUsd(n)

interface Item {
  name: string
  price: number
  priceHigh?: number
  per?: string
  note: string
  source: string
  flag?: boolean
}

export function SecYourself({
  a,
  uplift,
  setUplift,
}: {
  a: Analysis
  uplift: number
  setUplift: (n: number) => void
}) {
  const [showPayback, setShowPayback] = useState(true)
  const perDollar = a.allocation.stat.expectedReturn > 0 ? 12 / (a.allocation.stat.expectedReturn / 100) : 0

  return (
    <div className="mwm-stack" style={{ gap: '3.5rem' }}>
      <SectionHead
        eyebrow="Section 03"
        title="Before the market"
        lede="Most tools skip this part, because there is nothing to sell at the end of it. If you do not have a steady income yet, money spent on making yourself worth more beats money put in a fund. Here is the arithmetic, with your numbers."
      />

      {/* the headline arithmetic */}
      <Reveal>
        <Box variant="accent">
          <div className="mwm-grid mwm-grid--2" style={{ gap: '2.5rem' }}>
            <div>
              <p className="mwm-eyebrow">If you invest what you have</p>
              <p className="mwm-num" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.4rem)', marginTop: '0.8rem' }}>
                <Counter value={a.human.marketIncomeMonthUsd} format={money} />
                <span style={{ fontSize: '1.4rem', fontFamily: 'Inter, sans-serif', letterSpacing: 0 }}> a month</span>
              </p>
              <p className="mwm-note" style={{ marginTop: '0.7rem' }}>
                That is {money(a.human.investableUsd)} earning {a.allocation.stat.expectedReturn.toFixed(1)} percent a
                year, spread across twelve months. Before inflation, before tax, and only on average.
              </p>
            </div>

            <div>
              <p className="mwm-eyebrow">If you earn {money(uplift)} more a month</p>
              <p className="mwm-num mwm-accent" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.4rem)', marginTop: '0.8rem' }}>
                <Counter value={a.human.upliftEquivalentCapitalUsd} format={money} />
              </p>
              <p className="mwm-note" style={{ marginTop: '0.7rem' }}>
                That is how much money you would need invested to produce the same thing.{' '}
                {Number.isFinite(a.human.multiple) && a.human.multiple > 1
                  ? `About ${a.human.multiple.toFixed(a.human.multiple > 10 ? 0 : 1)} times everything you can invest today.`
                  : null}
              </p>
            </div>
          </div>

          <hr className="mwm-rule" style={{ margin: '2.2rem 0 1.6rem' }} />

          <div className="mwm-grid mwm-grid--narrow" style={{ alignItems: 'center', gap: '2rem' }}>
            <div>
              <p className="mwm-label">Drag: how much more per month</p>
              <p className="mwm-num" style={{ fontSize: '2rem', margin: '0.3rem 0 0.6rem' }}>
                {money(uplift)}
              </p>
              <Slider value={uplift} onChange={setUplift} min={50} max={3000} step={50} />
            </div>
            <p className="mwm-body">
              At this mix, one extra dollar a month of income is worth about{' '}
              <strong>{perDollar.toFixed(0)} dollars</strong> of invested money. Nobody is telling you not to invest.
              The point is that at your stage the two are not competing on equal terms, and it is not close.
            </p>
          </div>
        </Box>
      </Reveal>

      {/* where you are */}
      <Reveal>
        <div className="mwm-grid mwm-grid--3">
          {[
            {
              on: a.human.stage === 'buildIncome',
              n: 'Stage 1',
              t: 'Build the income',
              d: 'No steady money coming in yet. Everything you have is worth more spent on making that change.',
            },
            {
              on: a.human.stage === 'buildBuffer',
              n: 'Stage 2',
              t: 'Build the cushion',
              d: 'Income is steady. Now get to a few months of money you can reach, before anything goes into markets.',
            },
            {
              on: a.human.stage === 'invest',
              n: 'Stage 3',
              t: 'Invest',
              d: 'Steady income, cushion in place, money left over. This is the point where markets start doing more for you than another course would.',
            },
          ].map((s) => (
            <Box key={s.n} variant={s.on ? undefined : 'quiet'} style={{ opacity: s.on ? 1 : 0.5 }}>
              <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
                <span className="mwm-eyebrow">{s.n}</span>
                {s.on ? <Pill tone="ok">you are here</Pill> : null}
              </div>
              <h4 style={{ marginTop: '0.8rem' }}>{s.t}</h4>
              <p className="mwm-note" style={{ marginTop: '0.6rem' }}>
                {s.d}
              </p>
            </Box>
          ))}
        </div>
      </Reveal>

      {a.human.reasons.length ? (
        <Reveal>
          <Box variant="quiet">
            <p className="mwm-eyebrow">Why, in your case</p>
            <div className="mwm-grid mwm-grid--2" style={{ marginTop: '1.2rem' }}>
              {a.human.reasons.map((r) => (
                <p key={r} className="mwm-body">
                  {r}
                </p>
              ))}
            </div>
          </Box>
        </Reveal>
      ) : null}

      {/* the three questions, one per row */}
      <div>
        <h3 style={{ marginBottom: '0.8rem' }}>Before you buy any of it, three questions</h3>
        <p className="mwm-body" style={{ marginBottom: '2rem' }}>
          You need two yeses. Two out of three is a good use of money. Zero out of three is shopping.
        </p>

        <div className="mwm-stack" style={{ gap: '1rem' }}>
          {selfData.questions.map((q, i) => (
            <Reveal key={q.n} delay={i * 0.08}>
              <Box>
                <div className="mwm-grid mwm-grid--narrow" style={{ gap: '1.5rem', alignItems: 'start' }}>
                  <div className="mwm-row" style={{ gap: '1.1rem', alignItems: 'baseline' }}>
                    <span className="mwm-num mwm-accent" style={{ fontSize: '2.6rem' }}>
                      {q.n}
                    </span>
                    <h4 style={{ flex: 1, minWidth: 0 }}>{q.short}</h4>
                  </div>
                  <p className="mwm-note">{q.long}</p>
                </div>
              </Box>
            </Reveal>
          ))}
        </div>
      </div>

      {/* the things, with real prices */}
      <div>
        <div className="mwm-row" style={{ justifyContent: 'space-between', marginBottom: '1.6rem' }}>
          <h3>What to actually spend it on</h3>
          <button className="mwm-link" onClick={() => setShowPayback((s) => !s)}>
            {showPayback ? 'Hide how fast it pays back' : 'Show how fast it pays back'}
          </button>
        </div>

        <div className="mwm-stack" style={{ gap: '1.2rem' }}>
          {selfData.categories.map((c, ci) => {
            const yes = c.answers.filter(Boolean).length
            const items = (c.items ?? []) as Item[]
            return (
              <Reveal key={c.id} delay={ci * 0.04}>
                <Box>
                  <div className="mwm-grid mwm-grid--narrow" style={{ gap: '2rem', alignItems: 'start' }}>
                    <div>
                      <div className="mwm-row" style={{ justifyContent: 'space-between', gap: '1rem' }}>
                        <h4>{c.name}</h4>
                        <Pill tone={yes >= 2 ? 'ok' : 'warn'}>{yes} of 3</Pill>
                      </div>
                      <p className="mwm-note" style={{ marginTop: '0.6rem', fontStyle: 'italic' }}>
                        {c.plain}
                      </p>
                      <p className="mwm-note" style={{ marginTop: '0.9rem' }}>
                        {c.why}
                      </p>
                      <div className="mwm-row" style={{ gap: '0.4rem', marginTop: '1rem' }}>
                        {c.answers.map((ok, i) => (
                          <span
                            key={i}
                            className="mwm-tiny"
                            title={selfData.questions[i].short}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: 999,
                              border: '1px solid var(--edge)',
                              color: ok ? 'var(--pos)' : 'var(--muted)',
                            }}
                          >
                            {ok ? '✓' : '✕'} Q{i + 1}
                          </span>
                        ))}
                      </div>
                    </div>

                    {items.length ? (
                      <div className="mwm-stack" style={{ gap: '0.9rem' }}>
                        {items.map((it) => {
                          const monthly = it.per === 'month'
                          const annual = it.per === 'year'
                          const oneOff = !monthly && !annual
                          const months = uplift > 0 ? it.price / uplift : Infinity
                          return (
                            <div key={it.name}>
                              <div
                                className="mwm-row"
                                style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}
                              >
                                <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{it.name}</span>
                                <span className="mwm-num" style={{ fontSize: '1.35rem', whiteSpace: 'nowrap' }}>
                                  {it.price === 0 ? 'free' : money(it.price)}
                                  {it.priceHigh ? ` to ${money(it.priceHigh)}` : ''}
                                  {it.per ? (
                                    <span
                                      className="mwm-tiny"
                                      style={{ fontFamily: 'Inter, sans-serif', letterSpacing: 0 }}
                                    >
                                      {' '}
                                      / {it.per}
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                              <p className="mwm-tiny" style={{ marginTop: '0.3rem' }}>
                                {it.note} <Source url={it.source} />
                                {it.flag ? <span className="mwm-accent"> · check this figure yourself</span> : null}
                              </p>
                              {showPayback && oneOff && it.price > 0 && Number.isFinite(months) ? (
                                <p className="mwm-tiny mwm-accent" style={{ marginTop: '0.25rem' }}>
                                  Pays for itself in {months < 1 ? 'under a month' : `${months.toFixed(1)} months`} if it
                                  gets you {money(uplift)} more a month.
                                </p>
                              ) : null}
                              <hr className="mwm-rule" style={{ marginTop: '0.8rem' }} />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="mwm-note" style={{ fontStyle: 'italic' }}>
                        No price list for this one. What it costs depends entirely on where you are going and who you
                        need to see.
                      </p>
                    )}
                  </div>
                </Box>
              </Reveal>
            )
          })}
        </div>

        <p className="mwm-tiny" style={{ marginTop: '1.5rem' }}>
          Prices checked on {selfData.meta.checkedOn}. {selfData.meta.note}
        </p>
      </div>

      <Reveal>
        <div className="mwm-grid mwm-grid--3">
          <Tile
            label="Cheapest thing here"
            value="Free"
            sub="Bloomberg Market Concepts, on any university terminal including AUB. Eight hours of your time and nothing else."
          />
          <Tile
            label="Best value per dollar"
            value="$20"
            sub="A month of a serious AI subscription, if you genuinely use it daily. If you do not, cancel it."
            hero
          />
          <Tile
            label="Most expensive mistake"
            value="$1,490"
            sub="A qualification bought because it sounded good, when you could not name the door it opens."
          />
        </div>
      </Reveal>
    </div>
  )
}
