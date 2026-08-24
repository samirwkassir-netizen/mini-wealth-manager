import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { fmtUsd, type Analysis, type AppState } from '../engine'
import { Reveal } from './ui'
import { SecStanding } from './SecStanding'
import { SecFirst } from './SecFirst'
import { SecYourself } from './SecYourself'
import { SecPortfolio } from './SecPortfolio'
import { SecBadYears } from './SecBadYears'
import { SecPractical } from './SecPractical'

export type SectionId = 'standing' | 'first' | 'yourself' | 'portfolio' | 'bad' | 'practical'

export const SECTIONS: { id: SectionId; n: string; title: string; blurb: string; tab: string }[] = [
  {
    id: 'standing',
    n: '01',
    title: 'Where you stand',
    blurb: 'What you own, what you can actually reach, and the difference between the two.',
    tab: 'Where you stand',
  },
  {
    id: 'first',
    n: '02',
    title: 'What to do first',
    blurb: 'Your moves, in order. The first one is not the same for everybody.',
    tab: 'What to do first',
  },
  {
    id: 'yourself',
    n: '03',
    title: 'Before the market',
    blurb: 'Why spending money on yourself usually beats investing it, and exactly what to spend it on.',
    tab: 'Before the market',
  },
  {
    id: 'portfolio',
    n: '04',
    title: 'Your portfolio',
    blurb: 'The mix, the funds, what it costs, and what it might earn.',
    tab: 'Your portfolio',
  },
  {
    id: 'bad',
    n: '05',
    title: 'Bad years',
    blurb: 'What 2008, Covid and the 1970s would have done to this. Three of them really happened.',
    tab: 'Bad years',
  },
  {
    id: 'practical',
    n: '06',
    title: 'Where to hold it',
    blurb: 'Opening the account, the tax trap outside America, and every number this tool used.',
    tab: 'Where to hold it',
  },
]

export function Results({
  a,
  mirror,
  state,
  uplift,
  setUplift,
  onPick,
  onRestart,
}: {
  a: Analysis
  mirror: Analysis
  state: AppState
  uplift: number
  setUplift: (n: number) => void
  onPick: (key: string, id: string) => void
  onRestart: () => void
}) {
  const [open, setOpen] = useState<SectionId | null>(null)
  const reduce = useReducedMotion()

  const go = (id: SectionId | null) => {
    setOpen(id)
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <div className="mwm-dark" style={{ minHeight: '100svh' }}>
      {open ? (
        <div className="mwm-tabs mwm-noprint">
          <div className="mwm-shell">
            <div className="mwm-tabs-inner">
              <button className="mwm-tab" onClick={() => go(null)}>
                ← All sections
              </button>
              {SECTIONS.map((s) => (
                <button key={s.id} className="mwm-tab" aria-current={open === s.id} onClick={() => go(s.id)}>
                  {s.tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {open === null ? (
          <motion.div
            key="hub"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Hub a={a} onOpen={go} onRestart={onRestart} />
          </motion.div>
        ) : (
          <motion.div
            key={open}
            initial={reduce ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -14 }}
            transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="mwm-shell mwm-section">
              {open === 'standing' ? <SecStanding a={a} mirror={mirror} /> : null}
              {open === 'first' ? <SecFirst a={a} /> : null}
              {open === 'yourself' ? <SecYourself a={a} uplift={uplift} setUplift={setUplift} /> : null}
              {open === 'portfolio' ? <SecPortfolio a={a} state={state} onPick={onPick} /> : null}
              {open === 'bad' ? <SecBadYears a={a} /> : null}
              {open === 'practical' ? <SecPractical /> : null}

              <NextUp open={open} onOpen={go} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Hub({ a, onOpen, onRestart }: { a: Analysis; onOpen: (id: SectionId) => void; onRestart: () => void }) {
  const gap = a.standing.totalUsd - a.standing.deployableUsd

  return (
    <div className="mwm-shell mwm-section">
      <div className="mwm-head">
        <div>
          <p className="mwm-eyebrow" style={{ marginBottom: '1rem' }}>
            Your plan
          </p>
          <h1>
            {a.risk.level}, built on{' '}
            <span className="mwm-accent">{fmtUsd(a.standing.deployableUsd)}</span>.
          </h1>
        </div>
        <div className="mwm-stack" style={{ gap: '1.2rem', paddingTop: '0.6rem' }}>
          <p className="mwm-lede">
            {gap > 1
              ? `You own ${fmtUsd(a.standing.totalUsd)}. The plan is built on the ${fmtUsd(a.standing.deployableUsd)} you can actually reach and move, because a balance you cannot draw on will not pay a bill.`
              : 'All of your money is reachable and can move. That is a stronger starting position than most people reading this have.'}
          </p>
          <div className="mwm-row">
            <button className="mwm-btn" onClick={() => onOpen('standing')}>
              Start at the beginning
            </button>
          </div>
        </div>
      </div>

      <div className="mwm-hub">
        {SECTIONS.map((s, i) => (
          <Reveal key={s.id} delay={i * 0.07}>
            <button className="mwm-hub-card" onClick={() => onOpen(s.id)}>
              <span className="mwm-hub-num">{s.n}</span>
              <h3>{s.title}</h3>
              <p className="mwm-note">{s.blurb}</p>
              <span className="mwm-hub-go">Open →</span>
            </button>
          </Reveal>
        ))}
      </div>

      <div className="mwm-row mwm-noprint" style={{ marginTop: '3rem', gap: '0.8rem' }}>
        <button className="mwm-btn mwm-btn--ghost" onClick={onRestart}>
          Start again
        </button>
        <button className="mwm-btn mwm-btn--ghost" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>

      <p className="mwm-tiny" style={{ marginTop: '2rem', maxWidth: '70ch' }}>
        A teaching tool, not investment advice. Every number it uses is listed with a source in section 06. Nothing
        you typed left your browser.
      </p>
    </div>
  )
}

function NextUp({ open, onOpen }: { open: SectionId; onOpen: (id: SectionId | null) => void }) {
  const i = SECTIONS.findIndex((s) => s.id === open)
  const next = SECTIONS[i + 1]
  return (
    <div className="mwm-noprint" style={{ marginTop: '4rem' }}>
      <hr className="mwm-rule" />
      <div className="mwm-row" style={{ justifyContent: 'space-between', marginTop: '1.8rem' }}>
        <button className="mwm-btn mwm-btn--ghost" onClick={() => onOpen(null)}>
          ← All sections
        </button>
        {next ? (
          <button className="mwm-btn mwm-btn--lg" onClick={() => onOpen(next.id)}>
            Next: {next.title} →
          </button>
        ) : (
          <button className="mwm-btn mwm-btn--lg" onClick={() => onOpen(null)}>
            Back to your plan →
          </button>
        )}
      </div>
    </div>
  )
}
