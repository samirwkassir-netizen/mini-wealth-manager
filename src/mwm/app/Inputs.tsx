import { rates, toUsd, type AppState, type IncomeStability } from '../engine'
import { Amount, Segmented, Why } from './bits'
import { FREEDOMS, POT_TYPES, freedomOf, newPot, syncInvestPct, withFreedom, type Freedom } from './state'
import { Jar } from '../../art/Jar'
import { Calendar, Coins } from '../../art/Icons'

const CODES = rates.map((r) => r.code)

export function Inputs({ state, onChange }: { state: AppState; onChange: (s: AppState) => void }) {
  const set = (s: AppState) => onChange(syncInvestPct(s))
  const pots = state.accounts
  const biggest = Math.max(...pots.map((p) => (p.amount > 0 ? toUsd(p.amount, p.currency) : 0)), 1)

  const patch = (id: string, fn: (a: AppState['accounts'][number]) => AppState['accounts'][number]) =>
    set({ ...state, accounts: pots.map((a) => (a.id === id ? fn(a) : a)) })

  return (
    <div className="w-inputs">
      <section className="w-block" aria-labelledby="w-h-money">
        <div className="w-block-head">
          <h2 id="w-h-money" className="w-h">
            <Coins size={30} /> Your money
          </h2>
          <Why title="Free, Local, Slow, Stuck">
            <p>The same balance can be very different money. For each jar, pick what you could really do with it tomorrow.</p>
            <ul className="w-pop-list">
              {FREEDOMS.map((f) => (
                <li key={f.value}>
                  <b>{f.label}.</b> {f.line}
                </li>
              ))}
            </ul>
            <p>
              In Lebanon, old dollars paid out under Circular 158 (the central bank’s monthly withdrawal scheme) are Slow, not
              Stuck. It pays up to $1,000 a month, $800 of which can be sent abroad, up to $54,200 in total, until 30 June 2027.
              Put in what your bank actually pays you as the monthly limit.{' '}
              <a
                href="https://www.bdl.gov.lb/CB%20Com/Laws%20And%20Regulations/Basic%20Circulars/Decision_13335_EN%C2%A74457_3.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                The official text
              </a>
              , checked 22 October 2026.
            </p>
          </Why>
        </div>

        <p className="w-hint">One jar for each place you keep money. Then say how easy it is to get out.</p>
        <ul className="w-pots">
          {pots.map((a, i) => {
            const f = freedomOf(a)
            const amountUsd = a.amount > 0 ? toUsd(a.amount, a.currency) : 0
            return (
              <li key={a.id} className={`w-pot is-${f}`}>
                <div className="w-pot-jar">
                  <Jar kind={f} level={amountUsd / biggest} />
                </div>
                <div className="w-pot-main">
                  <div className="w-pot-row">
                    <label className="w-select w-select--type">
                      <span className="w-sr">Where jar {i + 1} is kept</span>
                      <select value={a.type} onChange={(e) => patch(a.id, (x) => ({ ...x, type: e.currentTarget.value as typeof a.type }))}>
                        {POT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Amount label={`Amount in jar ${i + 1}`} value={a.amount} onChange={(n) => patch(a.id, (x) => ({ ...x, amount: n }))} />
                    <label className="w-select w-select--ccy">
                      <span className="w-sr">Currency of jar {i + 1}</span>
                      <select value={a.currency} onChange={(e) => patch(a.id, (x) => ({ ...x, currency: e.currentTarget.value }))}>
                        {CODES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    {pots.length > 1 ? (
                      <button
                        type="button"
                        className="w-x"
                        aria-label={`Remove jar ${i + 1}`}
                        onClick={() => set({ ...state, accounts: pots.filter((x) => x.id !== a.id) })}
                      >
                        ×
                      </button>
                    ) : (
                      <span className="w-x w-x--ghost" aria-hidden="true" />
                    )}
                  </div>
                  <Segmented<Freedom>
                    size="sm"
                    className="w-seg--freedom"
                    label={`How easy jar ${i + 1} is to get out`}
                    value={f}
                    onChange={(v) => patch(a.id, (x) => withFreedom(x, v))}
                    options={FREEDOMS.map((x) => ({ value: x.value, label: x.label, title: x.line }))}
                  />
                  {f === 'slow' ? (
                    <div className="w-cap">
                      <span>Comes out at up to</span>
                      <Amount
                        label={`Monthly limit on jar ${i + 1}`}
                        value={a.monthlyCap ?? 0}
                        placeholder="?"
                        width="84px"
                        onChange={(n) => patch(a.id, (x) => ({ ...x, monthlyCap: n > 0 ? n : null }))}
                      />
                      <span>{a.currency} a month</span>
                    </div>
                  ) : (
                    <p className="w-pot-hint">{FREEDOMS.find((x) => x.value === f)?.line}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        {pots.length < 6 ? (
          <button type="button" className="w-add" onClick={() => set({ ...state, accounts: [...pots, newPot()] })}>
            + Add a jar
          </button>
        ) : null}
      </section>

      <section className="w-block" aria-labelledby="w-h-month">
        <div className="w-block-head">
          <h2 id="w-h-month" className="w-h">
            <Calendar size={30} /> Each month
          </h2>
          <Why title="Why the month matters more than the pile">
            <p>
              What comes in and what goes out decide how much rainy-day money you need, and whether anything is left to
              invest. With small savings, saving a bit every month does more than picking the perfect fund.
            </p>
          </Why>
        </div>
        <div className="w-pair">
          <div className="w-field">
            <span className="w-label">Money in</span>
            <div className="w-inline">
              <Amount
                label="Money in each month"
                value={state.flows.incomeMonthly}
                onChange={(n) => set({ ...state, flows: { ...state.flows, incomeMonthly: n } })}
              />
              <label className="w-select w-select--ccy">
                <span className="w-sr">Income currency</span>
                <select
                  value={state.flows.incomeCurrency}
                  onChange={(e) => set({ ...state, flows: { ...state.flows, incomeCurrency: e.currentTarget.value } })}
                >
                  {CODES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="w-field">
            <span className="w-label">Money out</span>
            <div className="w-inline">
              <Amount
                label="Money out each month"
                value={state.flows.spendMonthly}
                onChange={(n) => set({ ...state, flows: { ...state.flows, spendMonthly: n } })}
              />
              <label className="w-select w-select--ccy">
                <span className="w-sr">Spending currency</span>
                <select
                  value={state.flows.spendCurrency}
                  onChange={(e) => set({ ...state, flows: { ...state.flows, spendCurrency: e.currentTarget.value } })}
                >
                  {CODES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
        <div className="w-field">
          <span className="w-label">Your income is</span>
          <Segmented<IncomeStability>
            size="sm"
            label="How steady your income is"
            value={state.flows.incomeStability}
            onChange={(v) => set({ ...state, flows: { ...state.flows, incomeStability: v } })}
            options={[
              { value: 'recurring', label: 'Steady' },
              { value: 'irregular', label: 'Up and down' },
              { value: 'none', label: 'None yet' },
            ]}
          />
        </div>
      </section>

    </div>
  )
}
