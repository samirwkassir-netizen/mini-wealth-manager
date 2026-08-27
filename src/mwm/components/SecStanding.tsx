import { CASH_EROSION, erodedValue, fmtUsd, type Analysis } from '../engine'
import { Bar, Box, Counter, Define, Pair, Reveal, SectionHead, Source, Swatch, Tile } from './ui'

const money = (n: number) => fmtUsd(n)

export function SecStanding({ a, mirror }: { a: Analysis; mirror: Analysis }) {
  const s = a.standing
  const gap = s.totalUsd - s.deployableUsd
  const flags = s.flags.concat(a.flow.flags).filter((f) => f.severity !== 'note')

  return (
    <div className="mwm-stack" style={{ gap: '3.5rem' }}>
      <SectionHead
        eyebrow="Section 01"
        title="Where you stand"
        lede="Most tools ask how much you have and stop there. The more useful question is how much of it you could actually get your hands on tomorrow morning."
      />

      <div className="mwm-grid mwm-grid--3">
        <Reveal>
          <Tile
            label="What you own"
            value={<Counter value={s.totalUsd} format={money} />}
            sub="Everything added up, converted to dollars."
          />
        </Reveal>
        <Reveal delay={0.08}>
          <Tile
            hero
            label="What you can use"
            value={<Counter value={s.deployableUsd} format={money} />}
            sub={
              gap > 1
                ? `${money(gap)} is stuck, slow, or cannot leave the country. The whole plan is built on the number above.`
                : 'All of it. Reachable tomorrow and able to cross a border.'
            }
          />
        </Reveal>
        <Reveal delay={0.16}>
          <Tile
            label="Months covered"
            value={`${a.flow.runwayAccessibleMonths.toFixed(1)}`}
            sub={
              <>
                How long the money you can reach would pay for your life if income stopped. Your target is{' '}
                {a.tiering.bufferTargetMonths} months.
              </>
            }
          />
        </Reveal>
      </div>

      {gap > 1 ? (
        <Reveal>
          <Box variant="quiet">
            <p className="mwm-eyebrow">The same money, somewhere it can move</p>
            <p className="mwm-body" style={{ marginTop: '1rem' }}>
              Nothing below changes except where the money sits. Same amount, same income, same answers. This is the
              part the standard model does not price.
            </p>
            <div className="mwm-grid mwm-grid--2" style={{ marginTop: '1.8rem' }}>
              {[
                { k: 'Money you can use', l: money(s.deployableUsd), r: money(mirror.standing.deployableUsd) },
                {
                  k: 'Months covered',
                  l: `${a.flow.runwayAccessibleMonths.toFixed(1)}`,
                  r: `${mirror.flow.runwayAccessibleMonths.toFixed(1)}`,
                },
                {
                  k: 'Emergency money you need',
                  l: `${a.tiering.bufferTargetMonths} months`,
                  r: `${mirror.tiering.bufferTargetMonths} months`,
                },
                { k: 'Gold in the mix', l: `${a.growth.gold.toFixed(0)}%`, r: `${mirror.growth.gold.toFixed(0)}%` },
              ].map((row) => (
                <Pair
                  key={row.k}
                  left={
                    <>
                      <p className="mwm-tiny">{row.k}, as things are</p>
                      <p className="mwm-num" style={{ fontSize: '1.9rem', marginTop: '0.4rem' }}>
                        {row.l}
                      </p>
                    </>
                  }
                  right={
                    <>
                      <p className="mwm-tiny">if it were reachable</p>
                      <p className="mwm-num mwm-accent" style={{ fontSize: '1.9rem', marginTop: '0.4rem' }}>
                        {row.r}
                      </p>
                    </>
                  }
                />
              ))}
            </div>
          </Box>
        </Reveal>
      ) : null}

      {s.totalUsd > 0 ? (
        <Reveal>
          <Box variant="accent">
            <p className="mwm-eyebrow">What standing still costs</p>
            <p className="mwm-body" style={{ marginTop: '1rem' }}>
              Money that sits does not stay the same size. It stays the same number. Since {CASH_EROSION.startLabel},
              the month Lebanon's banks stopped giving people their deposits, US prices rose{' '}
              {CASH_EROSION.pricesRosePct} percent. A dollar left alone through that buys{' '}
              {CASH_EROSION.purchasingPowerLostPct} percent less than it did.
            </p>
            <div className="mwm-grid mwm-grid--2" style={{ marginTop: '1.8rem' }}>
              <Pair
                left={
                  <>
                    <p className="mwm-tiny">Your {money(s.totalUsd)}, if you had held it since {CASH_EROSION.startLabel}</p>
                    <p className="mwm-num" style={{ fontSize: '1.9rem', marginTop: '0.4rem' }}>
                      {money(s.totalUsd)}
                    </p>
                  </>
                }
                right={
                  <>
                    <p className="mwm-tiny">would buy what this bought then</p>
                    <p className="mwm-num mwm-accent" style={{ fontSize: '1.9rem', marginTop: '0.4rem' }}>
                      {money(erodedValue(s.totalUsd))}
                    </p>
                  </>
                }
              />
              <Pair
                left={
                  <>
                    <p className="mwm-tiny">Prices, per year, over those {CASH_EROSION.years} years</p>
                    <p className="mwm-num" style={{ fontSize: '1.9rem', marginTop: '0.4rem' }}>
                      +{CASH_EROSION.annualInflationPct}%
                    </p>
                  </>
                }
                right={
                  <>
                    <p className="mwm-tiny">what your cash lost, per year</p>
                    <p className="mwm-num mwm-accent" style={{ fontSize: '1.9rem', marginTop: '0.4rem' }}>
                      -{CASH_EROSION.annualLossPct}%
                    </p>
                  </>
                }
              />
            </div>
            <p className="mwm-tiny" style={{ marginTop: '1.5rem' }}>
              {CASH_EROSION.measures} Index {CASH_EROSION.startIndex} in {CASH_EROSION.startLabel} against{' '}
              {CASH_EROSION.endIndex} in {CASH_EROSION.endLabel}.{' '}
              <Source url={CASH_EROSION.startSourceUrl} label="2019 release" />{' '}
              <Source url={CASH_EROSION.sourceUrl} label="latest release" />
            </p>
            <p className="mwm-tiny" style={{ marginTop: '0.6rem' }}>
              This is one particular six year window and it ran hotter than normal. Over the long run US prices have
              risen nearer 3 percent a year. Do not read the number above as a rule.
            </p>
          </Box>
        </Reveal>
      ) : null}

      <div className="mwm-grid mwm-grid--wide">
        <Reveal>
          <Box>
            <p className="mwm-eyebrow">How safe is your money</p>
            <div className="mwm-row" style={{ alignItems: 'baseline', gap: '1rem', marginTop: '0.8rem' }}>
              <span className="mwm-num" style={{ fontSize: '3.2rem' }}>
                {s.fragility.score}
              </span>
              <span className="mwm-note">out of 100, where 100 is the most exposed</span>
            </div>
            <div style={{ marginTop: '1.2rem' }}>
              <Bar pct={s.fragility.score} />
            </div>
            <p className="mwm-note" style={{ marginTop: '1.2rem' }}>
              This score is built only from what you told us about your own accounts. The tool makes no assumption
              about your country. It decides two things: how much emergency money you need, and how much gold sits in
              your mix.
            </p>

            <div className="mwm-stack" style={{ gap: '1.4rem', marginTop: '2rem' }}>
              {s.fragility.parts.map((p) => (
                <div key={p.key}>
                  <div className="mwm-row" style={{ justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                    <span className="mwm-tabular mwm-note">
                      {p.points} of {p.max}
                    </span>
                  </div>
                  <Bar pct={(p.points / p.max) * 100} color="var(--c-property)" />
                  <p className="mwm-tiny" style={{ marginTop: '0.5rem' }}>
                    {p.detail}
                  </p>
                </div>
              ))}
            </div>
          </Box>
        </Reveal>

        <div className="mwm-stack" style={{ gap: '1.5rem' }}>
          {s.totalUsd > 0 ? (
            <Reveal delay={0.06}>
              <Box variant="edge">
                <p className="mwm-eyebrow">When you could get at it</p>
                <div className="mwm-stack" style={{ gap: '1rem', marginTop: '1.2rem' }}>
                  {[
                    { k: 'today', label: 'Tomorrow morning', usd: s.accessibleTodayUsd, c: 'var(--accent)' },
                    { k: 'days', label: 'Slowly, or only part of it', usd: s.accessibleDaysUsd, c: 'var(--c-property)' },
                    { k: 'restricted', label: 'You cannot get at it', usd: s.restrictedUsd, c: 'var(--c-globalBonds)' },
                  ].map((r) => (
                    <div key={r.k}>
                      <div className="mwm-row" style={{ justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span className="mwm-row" style={{ gap: '0.5rem' }}>
                          <Swatch color={r.c} />
                          <span className="mwm-note" style={{ color: 'var(--fg)' }}>
                            {r.label}
                          </span>
                        </span>
                        <span className="mwm-tabular" style={{ fontWeight: 600 }}>
                          {money(r.usd)}
                        </span>
                      </div>
                      <Bar pct={s.totalUsd ? (r.usd / s.totalUsd) * 100 : 0} color={r.c} />
                    </div>
                  ))}
                </div>
              </Box>
            </Reveal>
          ) : null}

          {s.byCurrency.length > 1 ? (
            <Reveal delay={0.12}>
              <Box variant="edge">
                <p className="mwm-eyebrow">Which currencies</p>
                <div className="mwm-stack" style={{ gap: '0.8rem', marginTop: '1.2rem' }}>
                  {s.byCurrency.map((c) => (
                    <div key={c.code} className="mwm-row" style={{ justifyContent: 'space-between' }}>
                      <span className="mwm-row" style={{ gap: '0.5rem' }}>
                        <Swatch
                          color={c.hardness > 0.5 ? 'var(--accent)' : c.hardness > 0 ? 'var(--c-tips)' : 'var(--c-shortGov)'}
                        />
                        <span>{c.code}</span>
                      </span>
                      <span className="mwm-tabular mwm-note">{c.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
                <p className="mwm-tiny" style={{ marginTop: '1.2rem' }}>
                  Red means a currency that has lost a lot of value against the dollar before, or one held at an
                  official rate you cannot actually trade at.
                </p>
              </Box>
            </Reveal>
          ) : null}
        </div>
      </div>

      {flags.length ? (
        <Reveal>
          <div>
            <h3 style={{ marginBottom: '1.5rem' }}>What stands out</h3>
            <div className="mwm-grid mwm-grid--2">
              {flags.map((f) => (
                <Box key={f.id} variant={f.severity === 'critical' ? 'accent' : 'quiet'}>
                  <h4>{f.title}</h4>
                  <p className="mwm-note" style={{ marginTop: '0.7rem' }}>
                    {f.body}
                  </p>
                </Box>
              ))}
            </div>
          </div>
        </Reveal>
      ) : null}

      <Reveal>
        <Box variant="quiet">
          <p className="mwm-eyebrow">Two words worth knowing</p>
          <div className="mwm-grid mwm-grid--2" style={{ marginTop: '1.2rem' }}>
            <p className="mwm-body">
              <strong>
                <Define term="monthsCovered">Months covered</Define>
              </strong>{' '}
              is how long you could pay for your normal life if every source of income stopped tomorrow. Six months
              covered means six months before you are in trouble. It is a better number than a savings total because
              it is measured in your life, not in dollars.
            </p>
            <p className="mwm-body">
              <strong>
                <Define term="emergencyMoney">Emergency money</Define>
              </strong>{' '}
              is the boring cash that makes the rest of this possible. Not because it earns anything, but because
              without it you end up selling your investments in the worst week of the year, which is the single most
              expensive thing an ordinary investor does.
            </p>
          </div>
        </Box>
      </Reveal>
    </div>
  )
}
