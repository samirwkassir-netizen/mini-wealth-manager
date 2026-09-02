import { AnimatePresence, motion } from 'motion/react'
import {
  ACCESS_OPTIONS,
  ACCOUNT_TYPES,
  bufferMonths,
  computeLiquidity,
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
import { Bar, Box, Choices, Define, Field, MoneyInput, Reveal, SectionHead, Select, Slider, Tile } from './ui'
import { MonthsStrip } from './charts'

const CURRENCIES = rates.map((r) => ({ value: r.code, label: `${r.code} · ${r.name}` }))
const uid = () => Math.random().toString(36).slice(2, 9)
const money = (n: number) => fmtUsd(n)

export function newAccount(): Account {
  return { id: uid(), label: '', type: 'localBank', currency: 'USD', amount: 0, access: 'today', transferable: true }
}

export function newGoal(): Goal {
  return { id: uid(), name: '', amount: 0, currency: 'USD', months: 12 }
}

/* ------------------------------------------------------------------ */

export function Step1({ accounts, onChange }: { accounts: Account[]; onChange: (a: Account[]) => void }) {
  const standing = computeStanding(accounts)
  const liquidity = computeLiquidity(accounts)
  const update = (id: string, patch: Partial<Account>) =>
    onChange(accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  return (
    <div className="mwm-shell mwm-section" style={{ paddingTop: '2.5rem' }}>
      <SectionHead
        eyebrow="Question 1 of 3"
        title="What do you have, and where is it?"
        lede="Round numbers are completely fine. The important part is not the amount, it is where each pile sits and whether you could actually take it out."
      />

      <div className="mwm-grid mwm-grid--wide" style={{ alignItems: 'start' }}>
        <div className="mwm-stack" style={{ gap: '1.2rem' }}>
          <AnimatePresence initial={false}>
            {accounts.map((a, i) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Box>
                  <div className="mwm-row" style={{ justifyContent: 'space-between', marginBottom: '1.6rem' }}>
                    <p className="mwm-eyebrow">Pot {i + 1}</p>
                    {accounts.length > 1 ? (
                      <button className="mwm-link" onClick={() => onChange(accounts.filter((x) => x.id !== a.id))}>
                        remove
                      </button>
                    ) : null}
                  </div>

                  <div className="mwm-stack" style={{ gap: '1.8rem' }}>
                    <Field label="Where is this money?">
                      {(id) => (
                        <Select
                          id={id}
                          value={a.type}
                          onChange={(v) => update(a.id, { type: v as AccountType })}
                          options={ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                        />
                      )}
                    </Field>

                    <div className="mwm-grid mwm-grid--2">
                      <Field label="How much is in it?">
                        {(id) => (
                          <MoneyInput
                            id={id}
                            currency={a.currency}
                            value={a.amount}
                            onChange={(n) => update(a.id, { amount: n })}
                          />
                        )}
                      </Field>
                      <Field label="In what currency?">
                        {(id) => (
                          <Select
                            id={id}
                            value={a.currency}
                            onChange={(v) => update(a.id, { currency: v })}
                            options={CURRENCIES}
                          />
                        )}
                      </Field>
                    </div>

                    <Field
                      label="If you needed all of it tomorrow, could you get it?"
                      hint="Please answer honestly. This one question changes the plan more than the amount does."
                    >
                      {() => (
                        <Choices
                          value={a.access}
                          onChange={(v) => update(a.id, { access: v as Access })}
                          options={ACCESS_OPTIONS.map((o) => ({ value: o.value, label: o.label, sub: o.hint }))}
                        />
                      )}
                    </Field>

                    {a.access === 'days' ? (
                      <Field
                        label="Roughly how much of it can you pull out per month?"
                        hint="Optional. If the limit is weekly, work it out as a month. Left blank, the tool treats the timing as unknown rather than guessing a rate."
                      >
                        {(id) => (
                          <MoneyInput
                            id={id}
                            currency={a.currency}
                            value={a.monthlyCap ?? 0}
                            onChange={(n) => update(a.id, { monthlyCap: n > 0 ? n : null })}
                          />
                        )}
                      </Field>
                    ) : null}

                    <Field
                      label="Could you send this money to another country?"
                      hint="For example, to open an investment account abroad."
                    >
                      {() => (
                        <Choices
                          row
                          value={a.transferable ? 'yes' : 'no'}
                          onChange={(v) => update(a.id, { transferable: v === 'yes' })}
                          options={[
                            { value: 'yes', label: 'Yes' },
                            { value: 'no', label: 'No, or not easily' },
                          ]}
                        />
                      )}
                    </Field>
                  </div>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>

          <button
            className="mwm-btn mwm-btn--ghost mwm-btn--lg"
            onClick={() => onChange([...accounts, newAccount()])}
          >
            + Add another pot of money
          </button>
        </div>

        <div className="mwm-stack" style={{ gap: '1.2rem', position: 'sticky', top: '1.5rem' }}>
          <Tile label="What you have" value={money(standing.totalUsd)} />
          <Tile
            hero
            label="What you could actually use"
            value={money(standing.deployableUsd)}
            sub={
              standing.totalUsd > standing.deployableUsd + 1
                ? `${money(standing.totalUsd - standing.deployableUsd)} of it is stuck, slow, or cannot leave the country.`
                : 'All of it. Good position to be in.'
            }
          />
          {liquidity.drippingUsd > 0 && liquidity.dripDoneMonth ? (
            <Box variant="edge">
              <p className="mwm-note">
                Another <strong>{money(liquidity.drippingUsd)}</strong> arrives over the next{' '}
                <strong>{liquidity.dripDoneMonth} {liquidity.dripDoneMonth === 1 ? 'month' : 'months'}</strong>, on the
                limits you declared. The plan counts it on that timetable, not before.
              </p>
            </Box>
          ) : null}
          {standing.totalUsd > 0 ? (
            <Box variant="edge">
              <p className="mwm-eyebrow">How exposed is it</p>
              <div className="mwm-row" style={{ alignItems: 'baseline', gap: '0.8rem', marginTop: '0.6rem' }}>
                <span className="mwm-num" style={{ fontSize: '2.4rem' }}>
                  {standing.fragility.score}
                </span>
                <span className="mwm-note">out of 100</span>
              </div>
              <div style={{ marginTop: '0.9rem' }}>
                <Bar pct={standing.fragility.score} />
              </div>
              <p className="mwm-tiny" style={{ marginTop: '0.9rem' }}>
                Higher means more of your money depends on somebody else keeping a promise. It sets how much emergency
                cash you need and how much gold ends up in your mix.
              </p>
            </Box>
          ) : null}
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
  const bufferTarget = bufferMonths(standing.fragility.score, flows.incomeStability)
  const set = (patch: Partial<Flows>) => onChange({ ...flows, ...patch })

  return (
    <div className="mwm-shell mwm-section" style={{ paddingTop: '2.5rem' }}>
      <SectionHead
        eyebrow="Question 2 of 3"
        title="What comes in, and what goes out?"
        lede="Averages are fine. This is here to work out one thing: how many months you could survive if everything stopped tomorrow."
      />

      <div className="mwm-grid mwm-grid--wide" style={{ alignItems: 'start' }}>
        <div className="mwm-stack" style={{ gap: '1.2rem' }}>
          <Box>
            <p className="mwm-eyebrow">Money coming in</p>
            <div className="mwm-stack" style={{ gap: '1.8rem', marginTop: '1.5rem' }}>
              <div className="mwm-grid mwm-grid--2">
                <Field label="Roughly how much a month?">
                  {(id) => (
                    <MoneyInput
                      id={id}
                      currency={flows.incomeCurrency}
                      value={flows.incomeMonthly}
                      onChange={(n) => set({ incomeMonthly: n })}
                    />
                  )}
                </Field>
                <Field label="Paid in what currency?">
                  {(id) => (
                    <Select
                      id={id}
                      value={flows.incomeCurrency}
                      onChange={(v) => set({ incomeCurrency: v })}
                      options={CURRENCIES}
                    />
                  )}
                </Field>
              </div>

              <Field
                label="How reliable is it?"
                hint="This matters more than the amount. It decides whether markets are the right place for your money at all yet."
              >
                {() => (
                  <Choices
                    value={flows.incomeStability}
                    onChange={(v) => set({ incomeStability: v })}
                    options={[
                      { value: 'recurring', label: 'The same every month', sub: 'A salary, or a client who always pays' },
                      { value: 'irregular', label: 'It comes and goes', sub: 'Freelance, commission, seasonal work' },
                      { value: 'none', label: 'Nothing regular yet', sub: 'Studying, between jobs, or just starting out' },
                    ]}
                  />
                )}
              </Field>
            </div>
          </Box>

          <Box>
            <p className="mwm-eyebrow">Money going out</p>
            <div className="mwm-stack" style={{ gap: '1.8rem', marginTop: '1.5rem' }}>
              <div className="mwm-grid mwm-grid--2">
                <Field label="Roughly how much a month?">
                  {(id) => (
                    <MoneyInput
                      id={id}
                      currency={flows.spendCurrency}
                      value={flows.spendMonthly}
                      onChange={(n) => set({ spendMonthly: n })}
                    />
                  )}
                </Field>
                <Field label="Spent in what currency?">
                  {(id) => (
                    <Select
                      id={id}
                      value={flows.spendCurrency}
                      onChange={(v) => set({ spendCurrency: v })}
                      options={CURRENCIES}
                    />
                  )}
                </Field>
              </div>

              <Field
                label={`How much of what comes in do you want to put aside? ${flows.investPct}%`}
                hint="Of what arrives, not of what is left at the end. People who wait for what is left usually save nothing."
              >
                {(id) => <Slider id={id} value={flows.investPct} onChange={(v) => set({ investPct: v })} min={0} max={80} step={5} />}
              </Field>
            </div>
          </Box>

          <Box>
            <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
              <p className="mwm-eyebrow">Things you are saving for</p>
              <button className="mwm-link" onClick={() => onChange({ ...flows, goals: [...flows.goals, newGoal()] })}>
                + add one
              </button>
            </div>
            <p className="mwm-note" style={{ marginTop: '0.9rem' }}>
              A trip, a laptop, a course, a deposit. Anything you need within three years will be kept out of shares,
              because three years is not long enough to ride out a bad one.
            </p>

            <div className="mwm-stack" style={{ gap: '1.2rem', marginTop: '1.5rem' }}>
              <AnimatePresence initial={false}>
                {flows.goals.map((g) => (
                  <motion.div
                    key={g.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.26 }}
                  >
                    <div className="mwm-grid mwm-grid--3">
                      <Field label="What is it?">
                        {(id) => (
                          <input
                            id={id}
                            className="mwm-input"
                            placeholder="A trip home"
                            value={g.name}
                            onChange={(e) =>
                              onChange({
                                ...flows,
                                goals: flows.goals.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)),
                              })
                            }
                          />
                        )}
                      </Field>
                      <Field label="How much?">
                        {(id) => (
                          <MoneyInput
                            id={id}
                            currency={g.currency}
                            value={g.amount}
                            onChange={(n) =>
                              onChange({
                                ...flows,
                                goals: flows.goals.map((x) => (x.id === g.id ? { ...x, amount: n } : x)),
                              })
                            }
                          />
                        )}
                      </Field>
                      <Field label="In how many months?">
                        {(id) => (
                          <input
                            id={id}
                            className="mwm-input"
                            inputMode="numeric"
                            value={g.months}
                            onChange={(e) =>
                              onChange({
                                ...flows,
                                goals: flows.goals.map((x) =>
                                  x.id === g.id ? { ...x, months: Number(e.target.value.replace(/\D/g, '')) || 0 } : x,
                                ),
                              })
                            }
                          />
                        )}
                      </Field>
                    </div>
                    <button
                      className="mwm-link"
                      style={{ marginTop: '0.6rem' }}
                      onClick={() => onChange({ ...flows, goals: flows.goals.filter((x) => x.id !== g.id) })}
                    >
                      remove this one
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Box>
        </div>

        <div className="mwm-stack" style={{ gap: '1.2rem', position: 'sticky', top: '1.5rem' }}>
          <Tile
            hero
            label="Months you are covered for"
            value={reach.toFixed(1)}
            sub="How long the money you can reach would pay for your life if everything stopped tomorrow."
          />
          {total > reach + 0.2 ? (
            <Box variant="edge">
              <p className="mwm-note">
                Counting everything you own it would be <strong>{total.toFixed(1)} months</strong>. The difference is
                the part of your money that will not answer the phone in an emergency.
              </p>
            </Box>
          ) : null}
          {spendUsd > 0 ? (
            <Box variant="edge">
              <p className="mwm-eyebrow" style={{ marginBottom: '1rem' }}>
                <Define term="monthsCovered">Months covered</Define>
              </p>
              <MonthsStrip months={reach} target={bufferTarget} totalMonths={total} />
            </Box>
          ) : null}
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
    <div className="mwm-shell mwm-section" style={{ paddingTop: '2.5rem' }}>
      <SectionHead
        eyebrow="Question 3 of 3"
        title="How much risk suits you?"
        lede="Two questions about your situation and two about you. Everything is scored in the open, and you can watch the points land on the right."
      />

      <div className="mwm-grid mwm-grid--wide" style={{ alignItems: 'start' }}>
        <div className="mwm-stack" style={{ gap: '1.2rem' }}>
          <Box>
            <Field
              label="When might you need this money back?"
              hint="Not when you would like to spend it. When you might have no choice."
            >
              {() => (
                <Choices
                  value={String(profile.horizonYears)}
                  onChange={(v) => set({ horizonYears: Number(v) as Profile['horizonYears'] })}
                  options={[
                    { value: '2', label: 'Within a year or two', sub: 'Over that stretch shares are close to a coin toss' },
                    { value: '5', label: 'About five years', sub: 'Long enough for some risk, not for all of it' },
                    { value: '10', label: 'Around ten years', sub: 'Long enough for most of it' },
                    { value: '20', label: 'Twenty years or more', sub: 'Time is what turns a bumpy ride into a return' },
                  ]}
                />
              )}
            </Field>
          </Box>

          <Box>
            <Field
              label="It drops 30 percent in six months. What do you actually do?"
              hint="Not what you should do. What you would really do at two in the morning."
            >
              {() => (
                <Choices
                  value={profile.drawdownReaction}
                  onChange={(v) => set({ drawdownReaction: v as Profile['drawdownReaction'] })}
                  options={[
                    { value: 'sell', label: 'I would sell', sub: 'An honest answer, and worth more than a brave one' },
                    { value: 'hold', label: 'I would sit on my hands', sub: 'Most people say this. About half of them do it' },
                    { value: 'buy', label: 'I would buy more', sub: 'Only true if you have spare cash sitting there' },
                  ]}
                />
              )}
            </Field>
          </Box>

          <Box>
            <div className="mwm-stack" style={{ gap: '1.8rem' }}>
              <Field
                label="Are you American, or living in America?"
                hint="This changes which version of the same fund you should buy, and it matters far more than most people realise."
              >
                {() => (
                  <Choices
                    row
                    value={profile.usPerson ? 'yes' : 'no'}
                    onChange={(v) => set({ usPerson: v === 'yes' })}
                    options={[
                      { value: 'no', label: 'No' },
                      { value: 'yes', label: 'Yes' },
                    ]}
                  />
                )}
              </Field>

              <Field
                label="Could you open an investment account with a foreign broker?"
                hint="Some countries make this hard, and some banks make funding it harder. Answer honestly. The target mix does not change; what the tool tells you to do about it does."
              >
                {() => (
                  <Choices
                    row
                    value={profile.brokerAccess}
                    onChange={(v) => set({ brokerAccess: v as Profile['brokerAccess'] })}
                    options={[
                      { value: 'have', label: 'I already have one' },
                      { value: 'could', label: 'Not yet, but I could' },
                      { value: 'no', label: 'Realistically, no' },
                    ]}
                  />
                )}
              </Field>

              <Field
                label="Fast-growing countries like Saudi, India and Brazil"
                hint="A normal world fund already holds some. This decides whether you hold more than the world does."
              >
                {() => (
                  <Choices
                    row
                    value={profile.emTilt}
                    onChange={(v) => set({ emTilt: v as Profile['emTilt'] })}
                    options={[
                      { value: 'none', label: 'Just the world' },
                      { value: 'moderate', label: 'A bit extra' },
                      { value: 'strong', label: 'A lot extra' },
                    ]}
                  />
                )}
              </Field>

              <Field
                label="Property companies"
                hint="Shares in companies that own and rent out buildings. Behaves like shares, not like owning a flat."
              >
                {() => (
                  <Choices
                    row
                    value={profile.includeProperty ? 'yes' : 'no'}
                    onChange={(v) => set({ includeProperty: v === 'yes' })}
                    options={[
                      { value: 'yes', label: 'Include them' },
                      { value: 'no', label: 'Leave them out' },
                    ]}
                  />
                )}
              </Field>
            </div>
          </Box>
        </div>

        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <Box variant="accent">
            <p className="mwm-eyebrow">Where that puts you</p>
            <p className="mwm-num" style={{ fontSize: 'clamp(2.6rem, 5vw, 3.6rem)', margin: '0.6rem 0 1.6rem' }}>
              {level}
            </p>
            <div className="mwm-stack" style={{ gap: '1.4rem' }}>
              {levelWhy.map((p) => (
                <div key={p.label}>
                  <div className="mwm-row" style={{ justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span className="mwm-note" style={{ color: 'var(--fg)' }}>
                      {p.label}
                    </span>
                    <span className="mwm-tabular" style={{ fontWeight: 600 }}>
                      {p.points} / {p.max}
                    </span>
                  </div>
                  <Bar pct={(p.points / p.max) * 100} />
                  <p className="mwm-tiny" style={{ marginTop: '0.5rem' }}>
                    {p.detail}
                  </p>
                </div>
              ))}
            </div>
          </Box>
        </div>
      </div>
    </div>
  )
}

export { Reveal }
