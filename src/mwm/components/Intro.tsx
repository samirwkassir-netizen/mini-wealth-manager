import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Card } from './ui'

const BEATS = [
  {
    caption: 'Two people. The same seven thousand dollars.',
    left: 100,
    right: 100,
    leftReach: 100,
    rightReach: 100,
  },
  {
    caption: 'One holds it in a bank that will not let it go. The other holds it somewhere it can move.',
    left: 100,
    right: 100,
    leftReach: 14,
    rightReach: 100,
  },
  {
    caption: 'Same net worth. Different amount of money. Every tool built for this assumes the first case cannot happen.',
    left: 100,
    right: 100,
    leftReach: 14,
    rightReach: 100,
  },
]

const MODULES = [
  {
    n: '01',
    title: 'Where you stand',
    body: 'Not a total. What you earn in, what you spend in, which system holds it, and how much of it you could actually withdraw tomorrow morning.',
  },
  {
    n: '02',
    title: 'Where it goes',
    body: 'Income, spending and the things you are saving for, measured in months of runway rather than in budget categories nobody keeps to.',
  },
  {
    n: '03',
    title: 'What to do with it',
    body: 'A portfolio built from the answers above, plus the case for spending some of it on yourself first, which is usually the higher return.',
  },
]

export function Intro({ onStart, onExample }: { onStart: () => void; onExample: () => void }) {
  const [beat, setBeat] = useState(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) {
      setBeat(BEATS.length - 1)
      return
    }
    const t = setInterval(() => setBeat((b) => (b + 1) % BEATS.length), 3200)
    return () => clearInterval(t)
  }, [reduce])

  const b = BEATS[beat]

  return (
    <div className="mwm-shell" style={{ paddingTop: '2.5rem', paddingBottom: '3rem' }}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <p className="mwm-eyebrow">Mini Wealth Manager</p>
        <h1 style={{ marginTop: '0.9rem', maxWidth: '18ch' }}>
          Private banking for people private banks will not see.
        </h1>
        <p className="mwm-lede" style={{ marginTop: '1.1rem' }}>
          You are twenty something. You have money sitting around from an internship, a gift, a part-time job. You
          do not know what to do with it and nobody has ever taught you. Every serious tool for this starts at half
          a million dollars, and some start at ten million. This one starts at whatever you have.
        </p>
      </motion.div>

      <div className="mwm-grid mwm-grid--sidebar" style={{ marginTop: '2.4rem', alignItems: 'center' }}>
        <Card tone="flat" style={{ padding: '1.8rem 1.6rem' }}>
          <div className="mwm-intro-stage">
            <div style={{ width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.4rem' }}>
                {(
                  [
                    { name: 'Held in a bank at home', reach: b.leftReach, key: 'l' },
                    { name: 'Held somewhere it can move', reach: b.rightReach, key: 'r' },
                  ] as const
                ).map((col) => (
                  <div key={col.key}>
                    <div
                      style={{
                        position: 'relative',
                        height: 150,
                        borderRadius: 8,
                        border: '1px solid var(--line)',
                        background: 'rgb(15 15 15 / 0.03)',
                        overflow: 'hidden',
                      }}
                    >
                      <motion.div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'rgb(122 31 42 / 0.16)',
                        }}
                        initial={false}
                        animate={{ height: '100%' }}
                        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
                      />
                      <motion.div
                        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--oxblood)' }}
                        initial={false}
                        animate={{ height: `${col.reach}%` }}
                        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
                      />
                      <span
                        className="mwm-tabular"
                        style={{
                          position: 'absolute',
                          left: 10,
                          top: 8,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: 'var(--ink)',
                        }}
                      >
                        $7,000
                      </span>
                    </div>
                    <p className="mwm-small" style={{ marginTop: '0.55rem' }}>
                      {col.name}
                    </p>
                    <p className="mwm-tabular" style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.15rem' }}>
                      ${Math.round((col.reach / 100) * 7000).toLocaleString('en-US')} you can reach
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ minHeight: '3.2rem', marginTop: '1.3rem' }}>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={beat}
                    className="mwm-lede"
                    style={{ fontSize: '0.95rem' }}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                  >
                    {b.caption}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Card>

        <div className="mwm-stack" style={{ gap: '1rem' }}>
          <Card tone="ink">
            <p className="mwm-eyebrow">The idea</p>
            <p style={{ marginTop: '0.6rem', fontSize: '1.02rem', lineHeight: 1.55 }}>
              Your cash is not the risk-free asset. Every mainstream portfolio tool assumes it is. That assumption is
              false for anyone in Lebanon, Egypt, Nigeria, Argentina or Turkey, where deposits can be trapped,
              currencies collapse, and the money you can see is not the money you can withdraw.
            </p>
          </Card>
          <div className="mwm-row" style={{ gap: '0.7rem' }}>
            <button className="mwm-btn" onClick={onStart}>
              Start with your numbers
            </button>
            <button className="mwm-btn mwm-btn--ghost" onClick={onExample}>
              Show me an example first
            </button>
          </div>
          <p className="mwm-small">
            Nothing you type leaves your browser. There is no account, no server and no network call. Close the tab
            and it is gone.
          </p>
        </div>
      </div>

      <div className="mwm-grid mwm-grid--3" style={{ marginTop: '2.4rem' }}>
        {MODULES.map((m, i) => (
          <motion.div
            key={m.n}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 + i * 0.12 }}
          >
            <Card style={{ height: '100%' }}>
              <p className="mwm-eyebrow">{m.n}</p>
              <h3 style={{ marginTop: '0.55rem' }}>{m.title}</h3>
              <p className="mwm-small" style={{ marginTop: '0.55rem' }}>
                {m.body}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="mwm-small" style={{ marginTop: '1.8rem', maxWidth: '70ch' }}>
        This is a teaching tool and it is explicitly not investment advice. It shows its reasoning, lists every
        assumption it makes, and links the source of every number it uses. Where a number could not be verified it
        says so rather than filling the gap. That framing is the project, not a disclaimer added at the end.
      </p>
    </div>
  )
}
