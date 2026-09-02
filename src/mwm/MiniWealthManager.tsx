import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import './styles.css'
import { analyse, defaultUplift, type AppState } from './engine'
import { Intro } from './components/Intro'
import { Step1, Step2, Step3, newAccount } from './components/Steps'
import { PlanLoader } from './components/PlanLoader'
import { Results } from './components/Results'

type Phase = 'intro' | 'q1' | 'q2' | 'q3' | 'loading' | 'plan'

const QUESTIONS: Phase[] = ['q1', 'q2', 'q3']
const LABELS: Record<string, string> = {
  q1: 'What you have',
  q2: 'In and out',
  q3: 'Your risk',
}

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
  profile: {
    horizonYears: 10,
    drawdownReaction: 'hold',
    usPerson: false,
    emTilt: 'moderate',
    includeProperty: true,
    brokerAccess: 'could',
  },
  picks: {},
}

/** An example person. Round, invented numbers, so the shape is visible first. */
const EXAMPLE: AppState = {
  accounts: [
    { id: 'e1', label: '', type: 'localBank', currency: 'USD', amount: 5000, access: 'restricted', transferable: false },
    { id: 'e2', label: '', type: 'localBank', currency: 'USD', amount: 1200, access: 'days', transferable: false, monthlyCap: 300 },
    { id: 'e3', label: '', type: 'cashHand', currency: 'USD', amount: 1400, access: 'today', transferable: true },
    { id: 'e4', label: '', type: 'neobank', currency: 'EUR', amount: 3900, access: 'today', transferable: true },
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
  profile: {
    horizonYears: 20,
    drawdownReaction: 'hold',
    usPerson: false,
    emTilt: 'moderate',
    includeProperty: true,
    brokerAccess: 'could',
  },
  picks: {},
}

export default function MiniWealthManager() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [state, setState] = useState<AppState>(EMPTY)
  const [upliftTouched, setUpliftTouched] = useState<number | null>(null)
  const reduce = useReducedMotion()

  const base = useMemo(() => analyse(state), [state])
  const uplift = upliftTouched ?? defaultUplift(base.flow.incomeUsd)
  const a = useMemo(() => analyse(state, uplift), [state, uplift])

  const mirror = useMemo(
    () =>
      analyse(
        { ...state, accounts: state.accounts.map((x) => ({ ...x, access: 'today' as const, transferable: true })) },
        uplift,
      ),
    [state, uplift],
  )

  const go = (p: Phase) => {
    setPhase(p)
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  const qIndex = QUESTIONS.indexOf(phase)
  const isQuestion = qIndex >= 0
  const hasMoney = state.accounts.some((x) => x.amount > 0)

  if (phase === 'intro') {
    return (
      <div className="mwm">
        <Intro
          onStart={() => {
            setState(EMPTY)
            go('q1')
          }}
          onExample={() => {
            setState(EXAMPLE)
            go('loading')
          }}
        />
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="mwm">
        <PlanLoader a={a} onDone={() => setPhase('plan')} />
      </div>
    )
  }

  if (phase === 'plan') {
    return (
      <div className="mwm">
        <Results
          a={a}
          mirror={mirror}
          state={state}
          uplift={uplift}
          setUplift={setUpliftTouched}
          onPick={(key, id) => setState({ ...state, picks: { ...state.picks, [key]: id } })}
          onRestart={() => {
            setState(EMPTY)
            setUpliftTouched(null)
            go('intro')
          }}
        />
      </div>
    )
  }

  return (
    <div className="mwm">
      {/* progress */}
      <div className="mwm-shell mwm-noprint" style={{ paddingTop: '1.6rem' }}>
        <div className="mwm-row" style={{ justifyContent: 'space-between' }}>
          <div className="mwm-row" style={{ gap: '0.5rem' }}>
            {QUESTIONS.map((q, i) => (
              <button
                key={q}
                className="mwm-tab"
                aria-current={phase === q}
                onClick={() => go(q)}
                style={{ opacity: i <= qIndex ? 1 : 0.45 }}
              >
                {i + 1}. {LABELS[q]}
              </button>
            ))}
          </div>
          <button className="mwm-link" onClick={() => go('intro')}>
            start over
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {phase === 'q1' ? (
            <Step1 accounts={state.accounts} onChange={(accounts) => setState({ ...state, accounts })} />
          ) : null}
          {phase === 'q2' ? (
            <Step2 flows={state.flows} state={state} onChange={(flows) => setState({ ...state, flows })} />
          ) : null}
          {phase === 'q3' ? (
            <Step3
              profile={state.profile}
              onChange={(profile) => setState({ ...state, profile })}
              level={a.risk.level}
              levelWhy={a.risk.parts}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* always on screen, never something to scroll for */}
      {isQuestion ? (
        <div className="mwm-actionbar mwm-noprint">
          <div className="mwm-shell">
            <div className="mwm-actionbar-inner">
              <button
                className="mwm-btn mwm-btn--ghost"
                onClick={() => go(qIndex === 0 ? 'intro' : QUESTIONS[qIndex - 1])}
              >
                ← Back
              </button>
              <span className="mwm-note" style={{ display: 'none' }} />
              {qIndex < 2 ? (
                <button className="mwm-btn mwm-btn--lg" onClick={() => go(QUESTIONS[qIndex + 1])} disabled={!hasMoney}>
                  Next question →
                </button>
              ) : (
                <button className="mwm-btn mwm-btn--lg" onClick={() => go('loading')} disabled={!hasMoney}>
                  Build my plan →
                </button>
              )}
            </div>
            {!hasMoney ? (
              <p className="mwm-tiny" style={{ marginTop: '0.6rem', textAlign: 'right' }}>
                Put an amount in at least one pot to carry on.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
