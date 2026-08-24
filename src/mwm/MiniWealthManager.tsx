import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import './styles.css'
import { analyse, defaultUplift, type AppState } from './engine'
import { Intro } from './components/Intro'
import { Step1, Step2, Step3, newAccount } from './components/Steps'
import { Results } from './components/Results'

const STEPS = ['Where you stand', 'Where it goes', 'How much risk', 'The plan'] as const

const EMPTY: AppState = {
  accounts: [newAccount()],
  flows: {
    incomeMonthly: 0,
    incomeCurrency: 'USD',
    incomeStability: 'irregular',
    spendMonthly: 0,
    spendCurrency: 'USD',
    investPct: 25,
    goals: [],
  },
  profile: { horizonYears: 10, drawdownReaction: 'hold', usPerson: false, emTilt: 'moderate', includeProperty: true },
  picks: {},
}

/**
 * An example, not a real person. The numbers are round and invented so that
 * the shape of the output is visible before you type anything of your own.
 */
const EXAMPLE: AppState = {
  accounts: [
    { id: 'e1', label: 'Old account, stuck', type: 'localBank', currency: 'USD', amount: 5000, access: 'restricted', transferable: false },
    { id: 'e2', label: 'Fresh account', type: 'localBank', currency: 'USD', amount: 1200, access: 'days', transferable: false },
    { id: 'e3', label: 'At home', type: 'cashHand', currency: 'USD', amount: 1400, access: 'today', transferable: true },
    { id: 'e4', label: 'Digital account', type: 'neobank', currency: 'EUR', amount: 3900, access: 'today', transferable: true },
  ],
  flows: {
    incomeMonthly: 1600,
    incomeCurrency: 'USD',
    incomeStability: 'recurring',
    spendMonthly: 620,
    spendCurrency: 'USD',
    investPct: 35,
    goals: [{ id: 'g1', name: 'Travel', amount: 900, currency: 'USD', months: 8 }],
  },
  profile: { horizonYears: 10, drawdownReaction: 'hold', usPerson: false, emTilt: 'moderate', includeProperty: true },
  picks: {},
}

export default function MiniWealthManager() {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [state, setState] = useState<AppState>(EMPTY)
  const [upliftTouched, setUpliftTouched] = useState<number | null>(null)
  const reduce = useReducedMotion()

  const baseAnalysis = useMemo(() => analyse(state), [state])
  const uplift = upliftTouched ?? defaultUplift(baseAnalysis.flow.incomeUsd)
  const a = useMemo(() => analyse(state, uplift), [state, uplift])

  // The same person with the same money, held somewhere it can move.
  // This is the comparison the whole project exists to make.
  const mirror = useMemo(
    () =>
      analyse(
        { ...state, accounts: state.accounts.map((x) => ({ ...x, access: 'today' as const, transferable: true })) },
        uplift,
      ),
    [state, uplift],
  )

  const go = (n: number) => {
    setStep(n)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  if (!started) {
    return (
      <div className="mwm">
        <Intro
          onStart={() => {
            setState(EMPTY)
            setStarted(true)
            setStep(0)
          }}
          onExample={() => {
            setState(EXAMPLE)
            setStarted(true)
            setStep(3)
          }}
        />
      </div>
    )
  }

  return (
    <div className="mwm">
      <div className="mwm-shell mwm-noprint" style={{ paddingTop: '1.5rem' }}>
        <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
          <nav className="mwm-rail" aria-label="Steps">
            {STEPS.map((s, i) => (
              <button
                key={s}
                aria-current={step === i}
                onClick={() => go(i)}
                disabled={i === 3 && state.accounts.every((x) => x.amount <= 0)}
              >
                <span className={`mwm-rail-num ${step > i ? 'mwm-rail-num--done' : ''}`}>{i + 1}</span>
                {s}
              </button>
            ))}
          </nav>
          <button
            className="mwm-linkish"
            onClick={() => {
              setStarted(false)
              setStep(0)
            }}
          >
            back to the start
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {step === 0 ? <Step1 accounts={state.accounts} onChange={(accounts) => setState({ ...state, accounts })} /> : null}
          {step === 1 ? <Step2 flows={state.flows} state={state} onChange={(flows) => setState({ ...state, flows })} /> : null}
          {step === 2 ? (
            <Step3
              profile={state.profile}
              onChange={(profile) => setState({ ...state, profile })}
              level={a.risk.level}
              levelWhy={a.risk.parts}
            />
          ) : null}
          {step === 3 ? (
            <Results
              a={a}
              mirror={mirror}
              uplift={uplift}
              setUplift={setUpliftTouched}
              onPick={(key, id) => setState({ ...state, picks: { ...state.picks, [key]: id } })}
              onRestart={() => {
                setState(EMPTY)
                setStarted(false)
                setStep(0)
              }}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      {step < 3 ? (
        <div className="mwm-shell mwm-noprint" style={{ paddingBottom: '3rem' }}>
          <hr className="mwm-divider" style={{ marginBottom: '1.4rem' }} />
          <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
            <button className="mwm-btn mwm-btn--ghost" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0}>
              Back
            </button>
            <button className="mwm-btn" onClick={() => go(step + 1)}>
              {step === 2 ? 'Show me the plan' : 'Next'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
