import { useMemo, useState } from 'react'
import {
  CONSTRAINT_NOTE,
  HISTORICAL,
  LANDMARKS,
  MVO_CAVEAT,
  WHY_NOT_TWELVE,
  fmtUsd,
  frontier,
  historicalReturn,
  instrumentById,
  instrumentsFor,
  maxSharpePortfolio,
  portfolioReturn,
  portfolioVol,
  toVector,
  type Analysis,
  type AppState,
} from '../engine'
import { Box, Define, Disclose, Pill, Reveal, SectionHead, Select, Source, Swatch, CHART_COLOR } from './ui'
import { Donut, FrontierChart, SplitBar } from './charts'

const money = (n: number) => fmtUsd(n)

export function SecPortfolio({
  a,
  state,
  onPick,
}: {
  a: Analysis
  state: AppState
  onPick: (key: string, id: string) => void
}) {
  const [showFunds, setShowFunds] = useState(true)
  const slices = a.allocation.rows.map((r) => ({ key: r.key, label: r.label, value: r.weight }))

  const curve = useMemo(() => frontier().map((p) => ({ ret: p.ret, vol: p.vol })), [])
  const best = useMemo(() => maxSharpePortfolio(), [])
  const markers = useMemo(() => {
    const whole = toVector(a.weights)
    const sleeve = toVector(a.growth)
    return [
      { label: 'your whole plan, buffer included', ret: portfolioReturn(whole), vol: portfolioVol(whole), emphasis: true },
      { label: 'the long-term part on its own', ret: portfolioReturn(sleeve), vol: portfolioVol(sleeve) },
      { label: 'best trade-off in theory', ret: best.ret, vol: best.vol, hollow: true },
    ]
  }, [a, best])

  return (
    <div className="mwm-stack" style={{ gap: '3.5rem' }}>
      <SectionHead
        eyebrow="Section 04"
        title="Your portfolio"
        lede={`Your money does three jobs, in order: money you can reach in a day, money for things inside three years, and only what is left over goes into the long-term mix.`}
      />

      {state.profile.brokerAccess === 'no' && a.tiering.growthUsd > 0 ? (
        <Reveal>
          <Box variant="accent">
            <p className="mwm-eyebrow">Read this section differently</p>
            <p className="mwm-body" style={{ marginTop: '1rem' }}>
              You said a foreign brokerage account is not realistic for you. Then everything below is a target, not a
              shopping list, and pretending otherwise would be the kind of dishonesty this tool exists to avoid. What
              the mix is still for: it tells you what you are exposed to by not holding it, it gives you the shape to
              build toward the year access opens up, and its gold and cash lines are usually reachable without any
              broker at all. What it is not: instructions you can execute this month.
            </p>
          </Box>
        </Reveal>
      ) : null}

      {/* three jobs */}
      <Reveal>
        <Box>
          <div className="mwm-row" style={{ justifyContent: 'space-between', marginBottom: '1.2rem' }}>
            <p className="mwm-eyebrow">How {money(a.tiering.investableUsd)} splits up</p>
          </div>
          <SplitBar
            segments={[
              { key: 'safety', label: 'emergency money', value: a.tiering.safetyUsd, color: 'var(--c-shortGov)' },
              { key: 'goals', label: 'things inside 3 years', value: a.tiering.shortGoalsUsd, color: 'var(--c-tips)' },
              { key: 'growth', label: 'the long-term mix', value: a.tiering.growthUsd, color: 'var(--accent)' },
            ]}
          />
          <div className="mwm-grid mwm-grid--3" style={{ marginTop: '2rem' }}>
            {[
              {
                t: `Emergency money, ${a.tiering.bufferTargetMonths} months`,
                v: money(a.tiering.safetyUsd),
                s:
                  a.tiering.shortfallUsd > 0
                    ? `You are ${money(a.tiering.shortfallUsd)} short. Fill this before anything else.`
                    : 'Full. This is the thing that lets the rest be left alone.',
              },
              {
                t: 'Things inside three years',
                v: money(a.tiering.shortGoalsUsd),
                s: 'Cash and short government bonds. Money with a date on it does not belong in shares.',
              },
              {
                t: 'The long-term mix',
                v: money(a.tiering.growthUsd),
                s: 'The only part allowed to take real risk, because it is the only part you will not need soon.',
              },
            ].map((x) => (
              <div key={x.t}>
                <p className="mwm-eyebrow">{x.t}</p>
                <p className="mwm-num" style={{ fontSize: '2rem', margin: '0.5rem 0 0.5rem' }}>
                  {x.v}
                </p>
                <p className="mwm-note">{x.s}</p>
              </div>
            ))}
          </div>
        </Box>
      </Reveal>

      {/* the three levels, side by side */}
      <div>
        <div className="mwm-head" style={{ marginBottom: '1.8rem' }}>
          <div>
            <h3>Three ways to build the long-term part</h3>
          </div>
          <p className="mwm-note">
            These are the long-term money on its own, not the whole plan. Your emergency money is the same whichever
            you pick, so comparing the whole plan hides the actual difference between them.
          </p>
        </div>

        <div className="mwm-grid mwm-grid--3">
          {a.alternatives.map((alt, i) => {
            const chosen = alt.level === a.risk.level
            return (
              <Reveal key={alt.level} delay={i * 0.08}>
                <Box variant={chosen ? 'accent' : 'quiet'} style={{ height: '100%' }}>
                  <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
                    <h4 style={{ fontSize: '1.6rem' }}>{alt.level}</h4>
                    {chosen ? <Pill tone="warn">yours</Pill> : null}
                  </div>

                  <div className="mwm-stack" style={{ gap: '1.3rem', marginTop: '1.6rem' }}>
                    <div>
                      <p className="mwm-tiny">If the last 100 years repeat</p>
                      <p className="mwm-num" style={{ fontSize: '2.6rem', marginTop: '0.2rem' }}>
                        {alt.historical.toFixed(1)}%
                      </p>
                    </div>
                    <hr className="mwm-rule" />
                    <div>
                      <p className="mwm-tiny">What the big houses forecast</p>
                      <p className="mwm-num" style={{ fontSize: '1.8rem', marginTop: '0.2rem', color: 'var(--muted)' }}>
                        {alt.sleeve.stat.expectedReturn.toFixed(1)}%
                      </p>
                    </div>
                    <hr className="mwm-rule" />
                    <div className="mwm-stack" style={{ gap: '0.6rem' }}>
                      <Line k="In shares" v={`${alt.equityPct.toFixed(0)}%`} />
                      <Line k="Moves about" v={`${alt.sleeve.stat.volatility.toFixed(0)}% a year`} />
                      <Line
                        k="A really bad year"
                        v={`${(alt.sleeve.stat.expectedReturn - 2 * alt.sleeve.stat.volatility).toFixed(0)}%`}
                      />
                    </div>
                  </div>
                </Box>
              </Reveal>
            )
          })}
        </div>

        {a.risk.override ? (
          <Box variant="quiet" style={{ marginTop: '1.2rem' }}>
            <p className="mwm-note">
              <strong>We moved you. </strong>
              {a.risk.override}
            </p>
          </Box>
        ) : null}
      </div>

      {/* why not 12 */}
      <Reveal>
        <Box>
          <div className="mwm-grid mwm-grid--narrow" style={{ gap: '2.5rem', alignItems: 'start' }}>
            <div>
              <p className="mwm-eyebrow">A fair question</p>
              <h4 style={{ marginTop: '0.9rem', fontSize: '1.5rem' }}>{WHY_NOT_TWELVE.question}</h4>
            </div>
            <div>
              <p className="mwm-body">{WHY_NOT_TWELVE.answer}</p>
              <div className="mwm-grid mwm-grid--2" style={{ marginTop: '1.8rem', gap: '1rem' }}>
                {LANDMARKS.slice(0, 4).map((l) => (
                  <div key={l.label}>
                    <p className="mwm-num" style={{ fontSize: '2rem' }}>
                      {l.value}
                    </p>
                    <p className="mwm-tiny" style={{ marginTop: '0.3rem' }}>
                      {l.label}. {l.sub} <Source url={l.source} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Box>
      </Reveal>

      {/* the mix itself */}
      <div className="mwm-grid mwm-grid--wide" style={{ alignItems: 'start' }}>
        <Reveal>
          <Box>
            <div className="mwm-row" style={{ justifyContent: 'space-between', marginBottom: '1.2rem' }}>
              <p className="mwm-eyebrow">What you would hold</p>
              <button className="mwm-link" onClick={() => setShowFunds((s) => !s)}>
                {showFunds ? 'Hide the funds' : 'Show the funds'}
              </button>
            </div>

            <div className="mwm-stack" style={{ gap: '0.2rem' }}>
              {a.allocation.rows.map((r) => {
                const inst = instrumentById(r.instrumentId)!
                const options = instrumentsFor(r.key)
                return (
                  <div key={r.key} style={{ padding: '1.1rem 0', borderBottom: '1px solid var(--edge)' }}>
                    <div
                      className="mwm-row"
                      style={{ justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline' }}
                    >
                      <span className="mwm-row" style={{ gap: '0.6rem', flex: 1, minWidth: 0 }}>
                        <Swatch color={CHART_COLOR[r.key]} />
                        <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{r.label}</span>
                      </span>
                      <span className="mwm-num" style={{ fontSize: '1.5rem' }}>
                        {r.weight.toFixed(0)}%
                      </span>
                      <span className="mwm-note mwm-tabular" style={{ minWidth: '5rem', textAlign: 'right' }}>
                        {money(r.usd)}
                      </span>
                    </div>
                    <p className="mwm-note" style={{ marginTop: '0.5rem' }}>
                      {r.plain}
                    </p>

                    {showFunds ? (
                      <div style={{ marginTop: '0.9rem' }}>
                        {options.length > 1 ? (
                          <Select
                            value={inst.id}
                            onChange={(v) => onPick(r.key, v)}
                            options={options.map((o) => ({
                              value: o.id,
                              label: `${o.id} · ${o.domicile === 'Ireland' ? 'Irish' : 'American'} · costs ${o.ter}% a year`,
                            }))}
                          />
                        ) : (
                          <p className="mwm-note">{inst.id}</p>
                        )}
                        <p className="mwm-tiny" style={{ marginTop: '0.5rem' }}>
                          {inst.name}. <Source url={inst.source} />
                        </p>
                        {inst.concentration ? (
                          <p className="mwm-tiny mwm-accent" style={{ marginTop: '0.35rem' }}>
                            {inst.concentration}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <Disclose summary="Why Irish funds and not American ones">
              <p className="mwm-note">
                If you are not American, the tool picks Irish funds. An Irish fund that owns American shares pays 15
                percent US tax on the dividends it collects, under a treaty between Ireland and America. Buy the
                American version directly from a country with no such treaty, like Lebanon, and it is 30 percent. On
                top of that, American assets worth more than 60,000 dollars are exposed to American inheritance tax at
                up to 40 percent when a foreigner dies, and an Irish fund is not an American asset. Sources are in
                section 06.
              </p>
            </Disclose>
          </Box>
        </Reveal>

        <div className="mwm-stack" style={{ gap: '1.5rem' }}>
          <Reveal delay={0.08}>
            <Box>
              <Donut slices={slices} />
              <div className="mwm-stack" style={{ gap: '0.6rem', marginTop: '1.5rem' }}>
                {a.allocation.rows.map((r) => (
                  <div key={r.key} className="mwm-row" style={{ justifyContent: 'space-between' }}>
                    <span className="mwm-row" style={{ gap: '0.5rem' }}>
                      <Swatch color={CHART_COLOR[r.key]} />
                      <span className="mwm-note" style={{ color: 'var(--fg)' }}>
                        {r.label}
                      </span>
                    </span>
                    <span className="mwm-tabular mwm-note">{r.weight.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </Box>
          </Reveal>

          <Reveal delay={0.14}>
            <Box variant="accent">
              <p className="mwm-eyebrow">Your whole plan, buffer included</p>
              <div className="mwm-stack" style={{ gap: '1.2rem', marginTop: '1.2rem' }}>
                <Big
                  k={<>If the last 100 years repeat</>}
                  v={`${historicalReturn(a.weights).toFixed(1)}%`}
                  s="a year"
                />
                <hr className="mwm-rule" />
                <Big
                  k={
                    <>
                      <Define term="expectedReturn">What the houses forecast</Define>
                    </>
                  }
                  v={`${a.allocation.stat.expectedReturn.toFixed(1)}%`}
                  s="a year, next 10 to 15 years"
                />
                <hr className="mwm-rule" />
                <Big
                  k={
                    <>
                      <Define term="volatility">How much it moves</Define>
                    </>
                  }
                  v={`${a.allocation.stat.volatility.toFixed(0)}%`}
                  s="in a normal year, either way"
                />
                <hr className="mwm-rule" />
                <Big
                  k={
                    <>
                      <Define term="ter">What it costs you</Define>
                    </>
                  }
                  v={`${a.allocation.stat.ter.toFixed(2)}%`}
                  s={`${money(a.allocation.stat.terUsdPerYear)} a year on this amount`}
                />
              </div>
              <p className="mwm-tiny" style={{ marginTop: '1.4rem' }}>
                In roughly two years out of three this lands between {money(a.band.typicalLow)} and{' '}
                {money(a.band.typicalHigh)}. About one year in twenty is worse than {money(a.band.badYear)}.
              </p>
            </Box>
          </Reveal>
        </div>
      </div>

      {a.tiering.growthUsd > 0 ? (
        <Reveal>
          <Box>
            <div className="mwm-head" style={{ marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.7rem' }}>The optimiser, shown as a check</h3>
              </div>
              <p className="mwm-note">
                The curve is every mix that earns the most for a given amount of movement. Your plan is dot 1 and it
                sits low, because most of it is emergency cash. The long-term part on its own is dot 2.
              </p>
            </div>
            <FrontierChart curve={curve} markers={markers} />
            <div style={{ marginTop: '1.5rem' }}>
              <Disclose summary="Why not just take the optimiser's answer">
                <p className="mwm-note">{MVO_CAVEAT}</p>
                <p className="mwm-note" style={{ marginTop: '1rem' }}>
                  {CONSTRAINT_NOTE}
                </p>
              </Disclose>
            </div>
          </Box>
        </Reveal>
      ) : (
        <Box variant="quiet">
          <p className="mwm-note">
            There is no long-term mix yet, and that is the right answer rather than a failure. Everything you can
            reach is doing a more important job first. Fill the emergency money and this part appears.
          </p>
        </Box>
      )}

      <p className="mwm-tiny">
        {HISTORICAL.note} <Source url={HISTORICAL.primarySourceUrl} label="the historical source" />
      </p>
    </div>
  )
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="mwm-row" style={{ justifyContent: 'space-between', gap: '0.8rem' }}>
      <span className="mwm-note">{k}</span>
      <span className="mwm-tabular" style={{ fontWeight: 600 }}>
        {v}
      </span>
    </div>
  )
}

function Big({ k, v, s }: { k: React.ReactNode; v: string; s: string }) {
  return (
    <div className="mwm-row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
      <span className="mwm-note" style={{ color: 'var(--fg)', flex: 1, minWidth: 0 }}>
        {k}
      </span>
      <span style={{ textAlign: 'right' }}>
        <span className="mwm-num" style={{ fontSize: '1.9rem' }}>
          {v}
        </span>
        <span className="mwm-tiny" style={{ display: 'block' }}>
          {s}
        </span>
      </span>
    </div>
  )
}
