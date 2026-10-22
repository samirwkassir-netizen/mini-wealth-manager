import { rates, type AppState, type DrawdownReaction, type Horizon, type IncomeStability } from '../engine'
import { Amount, Segmented, Why } from './bits'
import { FREEDOMS, POT_TYPES, freedomOf, newPot, syncInvestPct, withFreedom, type Freedom } from './state'

const CODES = rates.map((r) => r.code)

export function Inputs({ state, onChange }: { state: AppState; onChange: (s: AppState) => void }) {
  const set = (s: AppState) => onChange(syncInvestPct(s))
  const pots = state.accounts

  const patch = (id: string, fn: (a: AppState['accounts'][number]) => AppState['accounts'][number]) =>
    set({ ...state, accounts: pots.map((a) => (a.id === id ? fn(a) : a)) })

  return (
    <div className="w-inputs">
      <section className="w-block" aria-labelledby="w-h-money">
        <div className="w-block-head">
          <h2 id="w-h-money" className="w-h">
            <span className="w-n">1</span> What you have
          </h2>
          <Why title="Free, Local, Slow, Stuck">
            <p>Same balance, different money. For each pot, pick what you could really do with it tomorrow.</p>
            <ul className="w-pop-list">
              {FREEDOMS.map((f) => (
                <li key={f.value}>
                  <b>{f.label}.</b> {f.line}
                </li>
              ))}
            </ul>
            <p>
              In Lebanon: old dollars paid out under BDL Circular 158 are Slow, not Stuck. Its consolidated text pays up to
              $1,000 a month, $800 of which can be wired abroad, to a lifetime cap of $54,200, until 30 June 2027. Enter what
              your bank actually pays you as the monthly limit.{' '}
              <a
                href="https://www.bdl.gov.lb/CB%20Com/Laws%20And%20Regulations/Basic%20Circulars/Decision_13335_EN%C2%A74457_3.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                BDL text
              </a>
              , checked 22 October 2026.
            </p>
            <p>Rough numbers are fine. Nothing you type leaves this page.</p>
          </Why>
        </div>

        <p className="w-hint">Each pot: where it is, how much, and how free it really is.</p>
        <ul className="w-pots">
          {pots.map((a, i) => (
            <li key={a.id} className="w-pot">
              <div className="w-pot-row">
                <label className="w-select w-select--type">
                  <span className="w-sr">Where pot {i + 1} is held</span>
                  <select value={a.type} onChange={(e) => patch(a.id, (x) => ({ ...x, type: e.currentTarget.value as typeof a.type }))}>
                    {POT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Amount
                  label={`Amount in pot ${i + 1}`}
                  value={a.amount}
                  onChange={(n) => patch(a.id, (x) => ({ ...x, amount: n }))}
                />
                <label className="w-select w-select--ccy">
                  <span className="w-sr">Currency of pot {i + 1}</span>
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
                    aria-label={`Remove pot ${i + 1}`}
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
                label={`How free pot ${i + 1} is`}
                value={freedomOf(a)}
                onChange={(f) => patch(a.id, (x) => withFreedom(x, f))}
                options={FREEDOMS.map((f) => ({ value: f.value, label: f.label, title: f.line }))}
              />
              {freedomOf(a) === 'slow' ? (
                <div className="w-cap">
                  <span>Comes out at up to</span>
                  <Amount
                    label={`Monthly limit on pot ${i + 1}`}
                    value={a.monthlyCap ?? 0}
                    placeholder="?"
                    width="84px"
                    onChange={(n) => patch(a.id, (x) => ({ ...x, monthlyCap: n > 0 ? n : null }))}
                  />
                  <span>{a.currency} a month</span>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {pots.length < 6 ? (
          <button type="button" className="w-add" onClick={() => set({ ...state, accounts: [...pots, newPot()] })}>
            + Add a pot
          </button>
        ) : null}
      </section>

      <section className="w-block" aria-labelledby="w-h-month">
        <div className="w-block-head">
          <h2 id="w-h-month" className="w-h">
            <span className="w-n">2</span> Each month
          </h2>
          <Why title="Why the month matters more than the pile">
            <p>
              What comes in and goes out decides how big your safety net must be, and whether there is anything to
              invest at all. With a small pile, a steady surplus does more than any fund choice.
            </p>
          </Why>
        </div>
        <div className="w-pair">
          <div className="w-field">
            <span className="w-label">In</span>
            <div className="w-inline">
              <Amount
                label="Monthly income"
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
            <span className="w-label">Out</span>
            <div className="w-inline">
              <Amount
                label="Monthly spending"
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
          <span className="w-label">The income is</span>
          <Segmented<IncomeStability>
            size="sm"
            label="How steady the income is"
            value={state.flows.incomeStability}
            onChange={(v) => set({ ...state, flows: { ...state.flows, incomeStability: v } })}
            options={[
              { value: 'recurring', label: 'Steady' },
              { value: 'irregular', label: 'Irregular' },
              { value: 'none', label: 'None yet' },
            ]}
          />
        </div>
      </section>

      <section className="w-block" aria-labelledby="w-h-nerve">
        <div className="w-block-head">
          <h2 id="w-h-nerve" className="w-h">
            <span className="w-n">3</span> Your nerve
          </h2>
          <Why title="Two questions decide the mix">
            <p>
              How long until you need the money, and what you would really do if it fell 30 percent. An honest
              "sell" here is worth more than a brave answer you would not keep.
            </p>
          </Why>
        </div>
        <div className="w-field">
          <span className="w-label">Need it in</span>
          <Segmented<Horizon>
            size="sm"
            label="Years until you need the money"
            value={state.profile.horizonYears}
            onChange={(v) => set({ ...state, profile: { ...state.profile, horizonYears: v } })}
            options={[
              { value: 2, label: '2 yrs' },
              { value: 5, label: '5 yrs' },
              { value: 10, label: '10 yrs' },
              { value: 20, label: '20+' },
            ]}
          />
        </div>
        <div className="w-field">
          <span className="w-label">If it fell 30%</span>
          <Segmented<DrawdownReaction>
            size="sm"
            label="What you would do if it fell 30 percent"
            value={state.profile.drawdownReaction}
            onChange={(v) => set({ ...state, profile: { ...state.profile, drawdownReaction: v } })}
            options={[
              { value: 'sell', label: 'I’d sell' },
              { value: 'hold', label: 'I’d wait' },
              { value: 'buy', label: 'I’d buy' },
            ]}
          />
        </div>
      </section>
    </div>
  )
}
