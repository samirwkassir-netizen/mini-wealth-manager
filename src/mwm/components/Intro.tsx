import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Box, Reveal } from './ui'

const BEATS = [
  { caption: 'Two people. The same seven thousand dollars.', left: 100 },
  { caption: 'One keeps it in a bank that will not let it go.', left: 14 },
  { caption: 'Same net worth. Different amount of money.', left: 14 },
]

const STEPS = [
  {
    n: '01',
    title: 'Where you stand',
    body: 'What you have, what currency it is in, who is holding it, and how much of it you could take out tomorrow morning.',
  },
  {
    n: '02',
    title: 'Where it goes',
    body: 'What comes in, what goes out, and what you are saving for. Measured in months of your life, not in budget categories.',
  },
  {
    n: '03',
    title: 'What to do with it',
    body: 'A plan built from your answers, starting with why spending some of it on yourself probably beats investing it.',
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
    const t = setInterval(() => setBeat((b) => (b + 1) % BEATS.length), 3000)
    return () => clearInterval(t)
  }, [reduce])

  const b = BEATS[beat]

  return (
    <div className="mwm-shell">
      {/* hero */}
      <section style={{ paddingTop: 'clamp(3rem, 7vw, 5rem)', paddingBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <p className="mwm-eyebrow">Mini Wealth Manager</p>
          <h1 style={{ marginTop: '1.4rem', maxWidth: '15ch' }}>
            You have money. Nobody taught you what to do with it.
          </h1>
        </motion.div>

        <div className="mwm-grid mwm-grid--wide" style={{ marginTop: 'clamp(2rem, 4vw, 3rem)', alignItems: 'start' }}>
          <motion.p
            className="mwm-body"
            style={{ fontSize: 'clamp(1.15rem, 2vw, 1.4rem)', lineHeight: 1.55 }}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
          >
            You are in your twenties. There is money sitting around from an internship, a gift, a part-time job. Real
            tools for this start at half a million dollars and go up to ten million, so nobody has ever built one for
            you. This one starts at whatever you actually have. It takes about four minutes.
          </motion.p>

          <motion.div
            className="mwm-stack"
            style={{ gap: '1.2rem' }}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
          >
            <button className="mwm-btn mwm-btn--lg" onClick={onStart} style={{ width: '100%' }}>
              Start with your numbers →
            </button>
            <button className="mwm-btn mwm-btn--ghost mwm-btn--lg" onClick={onExample} style={{ width: '100%' }}>
              Show me an example first
            </button>
            <p className="mwm-tiny">
              No account. No sign up. Nothing you type ever leaves your browser, because there is no server to send it
              to.
            </p>
          </motion.div>
        </div>
      </section>

      {/* the idea */}
      <section className="mwm-section" style={{ paddingTop: 0 }}>
        <div className="mwm-grid mwm-grid--wide" style={{ alignItems: 'center' }}>
          <Reveal>
            <Box variant="quiet" style={{ padding: 'clamp(1.6rem, 3vw, 2.6rem)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(1.2rem, 3vw, 2.5rem)' }}>
                {[
                  { name: 'Kept in a bank at home', reach: b.left, key: 'l' },
                  { name: 'Kept somewhere it can move', reach: 100, key: 'r' },
                ].map((col) => (
                  <div key={col.key}>
                    <div
                      style={{
                        position: 'relative',
                        height: 'clamp(140px, 22vw, 200px)',
                        borderRadius: 10,
                        border: '1px solid var(--edge)',
                        background: 'var(--surface-2)',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-soft)' }} />
                      <motion.div
                        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--accent)' }}
                        initial={false}
                        animate={{ height: `${col.reach}%` }}
                        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
                      />
                      <span
                        className="mwm-tabular"
                        style={{
                          position: 'absolute',
                          left: 12,
                          top: 10,
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: 'var(--ink)',
                        }}
                      >
                        $7,000
                      </span>
                    </div>
                    <p className="mwm-note" style={{ marginTop: '0.8rem' }}>
                      {col.name}
                    </p>
                    <p className="mwm-num" style={{ fontSize: '1.7rem', marginTop: '0.3rem' }}>
                      ${Math.round((col.reach / 100) * 7000).toLocaleString('en-US')}
                    </p>
                    <p className="mwm-tiny">you can actually reach</p>
                  </div>
                ))}
              </div>

              <div style={{ minHeight: '3.4rem', marginTop: '1.8rem' }}>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={beat}
                    className="mwm-note"
                    style={{ fontSize: '1.05rem', color: 'var(--fg)' }}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                  >
                    {b.caption}
                  </motion.p>
                </AnimatePresence>
              </div>
            </Box>
          </Reveal>

          <Reveal delay={0.1}>
            <div>
              <p className="mwm-eyebrow">The idea</p>
              <p className="mwm-quote" style={{ marginTop: '1.2rem' }}>
                Your cash is not the safe part.
              </p>
              <p className="mwm-body" style={{ marginTop: '1.4rem' }}>
                Every serious portfolio tool treats the money in your bank as the safe corner of the picture, the thing
                everything else is measured against. If you live in Lebanon, Egypt, Nigeria, Argentina or Turkey, that
                one assumption is doing an enormous amount of quiet work. Accounts get frozen. Currencies fall. The
                balance on the screen is not the money you can take out.
              </p>
              <p className="mwm-body" style={{ marginTop: '1rem' }}>
                So this asks a different question. Not how much you have. How much of it is actually yours to move.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* three steps */}
      <section className="mwm-section" style={{ paddingTop: 0 }}>
        <h2 style={{ marginBottom: '2rem' }}>Three questions, then a plan.</h2>
        <div className="mwm-grid mwm-grid--3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <Box style={{ height: '100%' }}>
                <p className="mwm-hub-num">{s.n}</p>
                <h3 style={{ marginTop: '0.7rem', fontSize: '1.7rem' }}>{s.title}</h3>
                <p className="mwm-note" style={{ marginTop: '0.9rem' }}>
                  {s.body}
                </p>
              </Box>
            </Reveal>
          ))}
        </div>

        <div className="mwm-row" style={{ marginTop: '2.5rem' }}>
          <button className="mwm-btn mwm-btn--lg" onClick={onStart}>
            Start →
          </button>
        </div>

        <p className="mwm-note" style={{ marginTop: '2.5rem', maxWidth: '68ch' }}>
          This is a teaching tool and it is not investment advice. It shows its reasoning, lists every assumption it
          makes, and links the source of every number it uses. Where a number could not be checked, it says so instead
          of filling the gap. That is the point of the thing, not a disclaimer added at the end.
        </p>
      </section>
    </div>
  )
}
