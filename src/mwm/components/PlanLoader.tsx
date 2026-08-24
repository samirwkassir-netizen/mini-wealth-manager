import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { Analysis } from '../engine'
import { fmtUsd } from '../engine'

/**
 * The moment between answering the questions and seeing the plan.
 * It is doing real work, but the work takes two milliseconds, so the
 * pacing here is deliberate: each line is a thing the tool actually
 * computed, held long enough to read.
 */
export function PlanLoader({ a, onDone }: { a: Analysis; onDone: () => void }) {
  const reduce = useReducedMotion()

  const steps = [
    {
      label: 'Reading your accounts',
      detail: `${a.standing.byCurrency.length} ${a.standing.byCurrency.length === 1 ? 'currency' : 'currencies'}, ${fmtUsd(a.standing.totalUsd)} in total`,
    },
    { label: 'Working out what you can actually reach', detail: `${fmtUsd(a.standing.deployableUsd)} you can use` },
    { label: 'Checking how long that money lasts', detail: `${a.flow.runwayAccessibleMonths.toFixed(1)} months of your spending` },
    { label: 'Sizing your emergency money', detail: `${a.tiering.bufferTargetMonths} months, set by your own answers` },
    { label: 'Building the mix', detail: `${a.risk.level}, ${a.allocation.rows.length} holdings` },
    { label: 'Running it through four crashes', detail: '2008, Covid, the 1970s, and one that has not happened' },
  ]

  const [done, setDone] = useState(reduce ? steps.length : 0)
  const [finished, setFinished] = useState(reduce)

  useEffect(() => {
    if (reduce) {
      const t = setTimeout(onDone, 400)
      return () => clearTimeout(t)
    }
    const timers: number[] = []
    steps.forEach((_, i) => {
      timers.push(window.setTimeout(() => setDone(i + 1), 380 + i * 430))
    })
    timers.push(window.setTimeout(() => setFinished(true), 380 + steps.length * 430 + 200))
    timers.push(window.setTimeout(onDone, 380 + steps.length * 430 + 1750))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce])

  const pct = (done / steps.length) * 100

  return (
    <div className="mwm-dark mwm-loader">
      <div className="mwm-shell mwm-shell--narrow" style={{ width: '100%' }}>
        <AnimatePresence mode="wait">
          {!finished ? (
            <motion.div key="working" exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
              <p className="mwm-eyebrow">Building your plan</p>

              <div className="mwm-stack" style={{ gap: '1.15rem', marginTop: '2.5rem' }}>
                {steps.map((s, i) => {
                  const state = i < done ? 'done' : i === done ? 'now' : 'waiting'
                  return (
                    <motion.div
                      key={s.label}
                      className="mwm-loader-line"
                      animate={{ opacity: state === 'waiting' ? 0.22 : 1 }}
                      transition={{ duration: 0.35 }}
                    >
                      <motion.span
                        style={{
                          display: 'inline-block',
                          width: '1.5rem',
                          flexShrink: 0,
                          color: 'var(--accent)',
                          fontSize: '1rem',
                        }}
                        animate={state === 'now' ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                        transition={state === 'now' ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}
                      >
                        {state === 'done' ? '✓' : state === 'now' ? '›' : '·'}
                      </motion.span>
                      <span style={{ flex: 1 }}>
                        {s.label}
                        <AnimatePresence>
                          {state === 'done' ? (
                            <motion.span
                              className="mwm-note"
                              style={{ display: 'block', fontFamily: 'Inter, sans-serif', marginTop: '0.15rem' }}
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              {s.detail}
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </span>
                    </motion.div>
                  )
                })}
              </div>

              <div className="mwm-loader-bar" style={{ marginTop: '3rem' }}>
                <motion.span animate={{ width: `${pct}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ textAlign: 'center' }}
            >
              <p className="mwm-eyebrow">Ready</p>
              <h1 style={{ marginTop: '1.2rem' }}>Your plan.</h1>
              <p className="mwm-lede" style={{ margin: '1.5rem auto 0', maxWidth: '32ch' }}>
                Six sections. Start wherever you like, they all stand on their own.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
