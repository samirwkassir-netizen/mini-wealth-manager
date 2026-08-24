import { AnimatePresence, motion } from 'motion/react'
import {
  ACCESS_OPTIONS,
  ACCOUNT_TYPES,
  computeStanding,
  fmtUsd,
  rates,
  type Access,
  type Account,
  type AccountType,
  type AppState,
  type Flows,
  type Goal,
  type Profile,
} from '../engine'
import { Callout, Card, Field, Meter, MoneyInput, Segmented, Select, SectionHead, Swatch, Why } from './ui'
import { RunwayStrip, SplitBar } from './charts'

const CURRENCIES = rates.map((r) => ({ value: r.code, label: `${r.code} · ${r.name}` }))
const uid = () => Math.random().toString(36).slice(2, 9)

export function newAccount(): Account {
  return { id: uid(), label: '', type: 'localBank', currency: 'USD', amount: 0, access: 'today', transferable: true }
}

export function newGoal(): Goal {
  return { id: uid(), name: '', amount: 0, currency: 'USD', months: 12 }
}

/* ------------------------------------------------------------------ */

export function Step1({
  accounts,
  onChange,
}: {
  accounts: Account[]
  onChange: (a: Account[]) => void
}) {
  const standing = computeStanding(accounts)

  const update = (id: string, patch: Partial<Account>) =>
    onChange(accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  return (
    <div className="mwm-shell" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <SectionHead
        index="Module 01"
        title="Where you stand"
        intro="Not a total. A total tells you almost nothing. What matters is which currency it is in, which institution is holding it, and how much of it you could actually get your hands on tomorrow morning."
      />

      <div className="mwm-grid mwm-grid--sidebar">
        <div className="mwm-stack" style={{ gap: '0.9rem' }}>
          <AnimatePresence initial={false}>
            {accounts.map((a, i) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.32 }}
              >
                <Card>
                  <div className="mwm-row" style={{ justifyContent: 'space-between', marginBottom: '0.9rem' }}>
                    <p className="mwm-eyebrow">Account {String(i + 1).padStart(2, '0')}</p>
                    {accounts.length > 1 ? (
                      <button className="mwm-linkish" onClick={() => onChange(accounts.filter((x) => x.id !== a.id))}>
                        remove
                      </button>
                    ) : null}
                  </div>

                  <div className="mwm-grid mwm-grid--2">
                    <Field label="What is it">
                      {(id) => (
                        <Select
                          id={id}
                          value={a.type}
                          onChange={(v) => update(a.id, { type: v as AccountType })}
                          options={ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                        />
                      )}
                    </Field>
                    <Field label="Name it, if you like">
                      {(id) => (
                        <input
                          id={id}
                          className="mwm-input"
                          placeholder={ACCOUNT_TYPES.find((t) => t.value === a.type)?.hint}
                          value={a.label}
                          onChange={(e) => update(a.id, { label: e.target.value })}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="mwm-grid mwm-grid--2" style={{ marginTop: '0.9rem' }}>
                    <Field label="How much">
                      {(id) => (
                        <MoneyInput
                          id={id}
                          currency={a.currency}
                          value={a.amount}
                          onChange={(n) => update(a.id, { amount: n })}
                        />
                      )}
                    </Field>
                    <Field label="In which currency">
                      {(id) => (
                        <Select id={id} value={a.currency} onChange={(v) => update(a.id, { currency: v })} options={CURRENCIES} />
                      )}
                    </Field>
                  </div>

                  <div style={{ marginTop: '1.1rem' }}>
                    <Field
                      label="How much of it could you withdraw tomorrow"
                      hint="Answer honestly. This single question changes more of the output than the amount does."
                    >
                      {() => (
                        <Segmented
                          stack
                          value={a.access}
                          onChange={(v) => update(a.id, { access: v as Access })}
                          options={ACCESS_OPTIONS}
                        />
                      )}
                    </Field>
                  </div>

                  <div style={{ marginTop: '1.1rem' }}>
                    <Field label="Could you send it to another country">
                      {() => (
                        <Segmented
                          value={a.transferable ? 'yes' : 'no'}
                          onChange={(v) => update(a.id, { transferable: v === 'yes' })}
                          options={[
                            { value: 'yes', label: 'Yes' },
                            { value: 'no', label: 'No, or not without a fight' },
                          ]}
                        />
                      )}
                    </Field>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          <button className="mwm-btn mwm-btn--ghost" onClick={() => onChange([...accounts, newAccount()])}>
            Add another account
          </button>
        </div>

        <div className="mwm-stack" style={{ gap: '0.9rem', position: 'sticky', top: '1.5rem', alignSelf: 'start' }}>
          <Card>
            <p className="mwm-eyebrow">What you own</p>
            <p
              className="mwm-tabular"
              style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '2.4rem', letterSpacing: '-0.03em', marginTop: '0.4rem' }}
            >
              {fmtUsd(standing.totalUsd)}
            </p>
            <p className="mwm-eyebrow" style={{ marginTop: '1rem' }}>
              What you can reach tomorrow
            </p>
            <p
              className="mwm-tabular"
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: '2.4rem',
                letterSpacing: '-0.03em',
                marginTop: '0.4rem',
                color: 'var(--oxblood)',
              }}
            >
              {fmtUsd(standing.accessibleTodayUsd)}
            </p>
            {standing.totalUsd > 0 ? (
              <div style={{ marginTop: '1.2rem' }}>
                <SplitBar
                  segments={[
                    { key: 'today', label: 'today', value: standing.accessibleTodayUsd, color: 'var(--oxblood)' },
                    { key: 'days', label: 'slowly', value: standing.accessibleDaysUsd, color: 'rgb(122 31 42 / 0.35)' },
                    { key: 'restricted', label: 'not really', value: standing.restrictedUsd, color: 'rgb(15 15 15 / 0.12)' },
                  ]}
                />
              </div>
            ) : null}
          </Card>

          {standing.totalUsd > 0 ? (
            <Card>
              <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
                <p className="mwm-eyebrow">Fragility</p>
                <span className="mwm-tabular" style={{ fontWeight: 600 }}>
                  {standing.fragility.score} / 100
                </span>
              </div>
              <div style={{ marginTop: '0.6rem' }}>
                <Meter pct={standing.fragility.score} />
              </div>
              <p className="mwm-small" style={{ marginTop: '0.7rem' }}>
                How much of your money depends on somebody else keeping a promise. This drives your buffer size and
                how much gold the portfolio holds. It is built entirely from your own answers, not from any
                assumption about your country.
              </p>
              <Why title="Show the four parts">
                <div className="mwm-stack" style={{ gap: '0.75rem' }}>
                  {standing.fragility.parts.map((p) => (
                    <div key={p.key}>
                      <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600 }}>{p.label}</span>
                        <span className="mwm-tabular">
                          {p.points} / {p.max}
                        </span>
                      </div>
                      <p style={{ marginTop: '0.2rem' }}>{p.detail}</p>
                    </div>
                  ))}
                </div>
              </Why>
            </Card>
          ) : null}

          {standing.byCurrency.length > 1 ? (
            <Card>
              <p className="mwm-eyebrow">Currency mix</p>
              <div className="mwm-stack" style={{ gap: '0.45rem', marginTop: '0.7rem' }}>
                {standing.byCurrency.map((c) => (
                  <div key={c.code} className="mwm-row" style={{ justifyContent: 'space-between' }}>
                    <span className="mwm-row" style={{ gap: '0.4rem' }}>
                      <Swatch color={c.hardness > 0.5 ? 'var(--oxblood)' : c.hardness > 0 ? 'var(--c-tips)' : 'var(--c-shortGov)'} />
                      <span style={{ fontSize: '0.85rem' }}>{c.code}</span>
                    </span>
                    <span className="mwm-tabular mwm-small">{c.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {standing.flags.map((f) => (
            <Card key={f.id} tone="flat">
              <Callout flag={f} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function Step2({
  flows,
  onChange,
  state,
}: {
  flows: Flows
  onChange: (f: Flows) => void
  state: AppState
}) {
  const standing = computeStanding(state.accounts)
  const spendUsd = flows.spendMonthly / (rates.find((r) => r.code === flows.spendCurrency)?.perUsd ?? 1)
  const reach = spendUsd > 0 ? standing.accessibleTodayUsd / spendUsd : 0
  const total = spendUsd > 0 ? standing.totalUsd / spendUsd : 0

  const set = (patch: Partial<Flows>) => onChange({ ...flows, ...patch })

  return (
    <div className="mwm-shell" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <SectionHead
        index="Module 02"
        title="Where it goes"
        intro="Budget categories are a way of feeling organised. Runway is a way of knowing how long you would last. This module only asks for the numbers that change the answer."
      />

      <div className="mwm-grid mwm-grid--sidebar">
        <div className="mwm-stack" style={{ gap: '0.9rem' }}>
          <Card>
            <p className="mwm-eyebrow">Money coming in</p>
            <div className="mwm-grid mwm-grid--2" style={{ marginTop: '0.9rem' }}>
              <Field label="Average per month">
                {(id) => (
                  <MoneyInput
                    id={id}
                    currency={flows.incomeCurrency}
                    value={flows.incomeMonthly}
                    onChange={(n) => set({ incomeMonthly: n })}
                  />
                )}
              </Field>
              <Field label="Paid in">
                {(id) => (
                  <Select id={id} value={flows.incomeCurrency} onChange={(v) => set({ incomeCurrency: v })} options={CURRENCIES} />
                )}
              </Field>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <Field label="How reliable is it" hint="This matters more than the amount. It decides whether markets are the right place for your money at all yet.">
                {() => (
                  <Segmented
                    stack
                    value={flows.incomeStability}
                    onChange={(v) => set({ incomeStability: v })}
                    options={[
                      { value: 'recurring', label: 'The same every month', hint: 'A salary, a retainer, something you can count on' },
                      { value: 'irregular', label: 'It comes and goes', hint: 'Freelance, commission, seasonal work' },
                      { value: 'none', label: 'Nothing regular yet', hint: 'Studying, between things, or just starting' },
                    ]}
                  />
                )}
              </Field>
            </div>
          </Card>

          <Card>
            <p className="mwm-eyebrow">Money going out</p>
            <div className="mwm-grid mwm-grid--2" style={{ marginTop: '0.9rem' }}>
              <Field label="Average per month">
                {(id) => (
                  <MoneyInput
                    id={id}
                    currency={flows.spendCurrency}
                    value={flows.spendMonthly}
                    onChange={(n) => set({ spendMonthly: n })}
                  />
                )}
              </Field>
              <Field label="Spent in">
                {(id) => (
                  <Select id={id} value={flows.spendCurrency} onChange={(v) => set({ spendCurrency: v })} options={CURRENCIES} />
                )}
              </Field>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <Field
                label={`Share of income you want to put to work: ${flows.investPct}%`}
                hint="Of what comes in, not of what is left over. Most people who wait for what is left over invest nothing."
              >
                {(id) => (
                  <input
                    id={id}
                    type="range"
                    min={0}
                    max={80}
                    step={5}
                    value={flows.investPct}
                    onChange={(e) => set({ investPct: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: 'var(--oxblood)' }}
                  />
                )}
              </Field>
            </div>
          </Card>

          <Card>
            <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
              <p className="mwm-eyebrow">Things you are saving for</p>
              <button className="mwm-linkish" onClick={() => onChange({ ...flows, goals: [...flows.goals, newGoal()] })}>
                add one
              </button>
            </div>
            <p className="mwm-small" style={{ marginTop: '0.5rem' }}>
              A trip, a camera, a course, a deposit. Anything you need the money for inside three years is not
              portfolio money and the tool will keep it out of shares.
            </p>

            <div className="mwm-stack" style={{ gap: '0.7rem', marginTop: '1rem' }}>
              <AnimatePresence initial={false}>
                {flows.goals.map((g) => (
                  <motion.div
                    key={g.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28 }}
                    style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) auto', gap: '0.5rem', alignItems: 'end' }}
                  >
                    <input
                      className="mwm-input"
                      placeholder="Travel"
                      value={g.name}
                      onChange={(e) =>
                        onChange({ ...flows, goals: flows.goals.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)) })
                      }
                    />
                    <MoneyInput
                      currency={g.currency}
                      value={g.amount}
                      onChange={(n) => onChange({ ...flows, goals: flows.goals.map((x) => (x.id === g.id ? { ...x, amount: n } : x)) })}
                    />
                    <div className="mwm-input-group">
                      <input
                        className="mwm-input"
                        style={{ paddingLeft: '0.75rem' }}
                        inputMode="numeric"
                        value={g.months}
                        onChange={(e) =>
                          onChange({
                            ...flows,
                            goals: flows.goals.map((x) => (x.id === g.id ? { ...x, months: Number(e.target.value.replace(/\D/g, '')) || 0 } : x)),
                          })
                        }
                      />
                    </div>
                    <button
                      className="mwm-linkish"
                      style={{ paddingBottom: '0.75rem' }}
                      onClick={() => onChange({ ...flows, goals: flows.goals.filter((x) => x.id !== g.id) })}
                    >
                      remove
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {flows.goals.length ? (
                <p className="mwm-small">Columns are: what it is, how much, and how many months from now.</p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="mwm-stack" style={{ gap: '0.9rem', position: 'sticky', top: '1.5rem', alignSelf: 'start' }}>
          <Card>
            <p className="mwm-eyebrow">Your runway</p>
            <p
              className="mwm-tabular"
              style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '2.4rem', letterSpacing: '-0.03em', marginTop: '0.4rem' }}
            >
              {reach.toFixed(1)} months
            </p>
            <p className="mwm-small" style={{ marginTop: '0.3rem' }}>
              How long the money you can actually reach would last if everything stopped tomorrow.
            </p>
            {total > reach + 0.2 ? (
              <p className="mwm-small" style={{ marginTop: '0.6rem', color: 'var(--oxblood)' }}>
                Counting everything you own it would be {total.toFixed(1)} months. The difference is the part of your
                net worth that will not answer the phone in a crisis.
              </p>
            ) : null}
            {spendUsd > 0 ? (
              <div style={{ marginTop: '1.1rem' }}>
                <RunwayStrip months={reach} target={6} totalMonths={total} />
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function Step3({
  profile,
  onChange,
  level,
  levelWhy,
}: {
  profile: Profile
  onChange: (p: Profile) => void
  level: string
  levelWhy: { label: string; points: number; max: number; detail: string }[]
}) {
  const set = (patch: Partial<Profile>) => onChange({ ...profile, ...patch })

  return (
    <div className="mwm-shell" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <SectionHead
        index="Module 03, part one"
        title="How much risk fits"
        intro="Four questions. Two are about your circumstances and two are about you. The answers are scored openly and you can see every point as it lands."
      />

      <div className="mwm-grid mwm-grid--sidebar">
        <div className="mwm-stack" style={{ gap: '0.9rem' }}>
          <Card>
            <Field label="When might you need this money" hint="Not when you would like to spend it. When you might have to.">
              {() => (
                <Segmented
                  stack
                  value={String(profile.horizonYears)}
                  onChange={(v) => set({ horizonYears: Number(v) as Profile['horizonYears'] })}
                  options={[
                    { value: '2', label: 'Within a couple of years', hint: 'Shares are close to a coin toss over that stretch' },
                    { value: '5', label: 'Around five years', hint: 'Long enough for some risk, not for all of it' },
                    { value: '10', label: 'Ten years or so', hint: 'Long enough for most of it' },
                    { value: '20', label: 'Twenty years or more', hint: 'Time is the thing that turns volatility into return' },
                  ]}
                />
              )}
            </Field>
          </Card>

          <Card>
            <Field label="It falls 30 percent in six months. What do you actually do" hint="Not what you should do. What you would do.">
              {() => (
                <Segmented
                  stack
                  value={profile.drawdownReaction}
                  onChange={(v) => set({ drawdownReaction: v as Profile['drawdownReaction'] })}
                  options={[
                    { value: 'sell', label: 'I would sell', hint: 'Honest, and the tool will take you seriously' },
                    { value: 'hold', label: 'I would sit on my hands', hint: 'Most people say this' },
                    { value: 'buy', label: 'I would buy more', hint: 'Only true if you have cash sitting there' },
                  ]}
                />
              )}
            </Field>
          </Card>

          <Card>
            <div className="mwm-grid mwm-grid--2">
              <Field label="Are you a US person or US resident" hint="This changes which version of the same fund you should buy, and it matters more than most people realise.">
                {() => (
                  <Segmented
                    value={profile.usPerson ? 'yes' : 'no'}
                    onChange={(v) => set({ usPerson: v === 'yes' })}
                    options={[
                      { value: 'no', label: 'No' },
                      { value: 'yes', label: 'Yes' },
                    ]}
                  />
                )}
              </Field>
              <Field label="Emerging markets" hint="A broad world fund already holds some. This decides whether you hold more than the index does.">
                {() => (
                  <Segmented
                    value={profile.emTilt}
                    onChange={(v) => set({ emTilt: v as Profile['emTilt'] })}
                    options={[
                      { value: 'none', label: 'Index' },
                      { value: 'moderate', label: 'A tilt' },
                      { value: 'strong', label: 'More' },
                    ]}
                  />
                )}
              </Field>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <Field label="Listed property" hint="Behaves like shares with extra steps. Reasonable to leave out entirely.">
                {() => (
                  <Segmented
                    value={profile.includeProperty ? 'yes' : 'no'}
                    onChange={(v) => set({ includeProperty: v === 'yes' })}
                    options={[
                      { value: 'yes', label: 'Include it' },
                      { value: 'no', label: 'Leave it out' },
                    ]}
                  />
                )}
              </Field>
            </div>
          </Card>
        </div>

        <div style={{ position: 'sticky', top: '1.5rem', alignSelf: 'start' }}>
          <Card tone="ink">
            <p className="mwm-eyebrow">Where that lands you</p>
            <p style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: '2.6rem', letterSpacing: '-0.03em', marginTop: '0.4rem' }}>
              {level}
            </p>
            <div className="mwm-stack" style={{ gap: '0.7rem', marginTop: '1.2rem' }}>
              {levelWhy.map((p) => (
                <div key={p.label}>
                  <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem' }}>{p.label}</span>
                    <span className="mwm-tabular" style={{ fontSize: '0.82rem' }}>
                      {p.points} / {p.max}
                    </span>
                  </div>
                  <p className="mwm-small" style={{ marginTop: '0.15rem' }}>
                    {p.detail}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
