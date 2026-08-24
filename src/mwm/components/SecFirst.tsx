import { fmtUsd, type Analysis } from '../engine'
import { Box, Pill, Reveal, SectionHead } from './ui'

const TAG_LABEL: Record<string, string> = {
  'before markets': 'Before you invest anything',
  first: 'First',
  then: 'Then',
  ongoing: 'Every month, forever',
}

export function SecFirst({ a }: { a: Analysis }) {
  const groups = ['before markets', 'first', 'then', 'ongoing'].filter((t) => a.actions.some((m) => m.tag === t))

  return (
    <div className="mwm-stack" style={{ gap: '3.5rem' }}>
      <SectionHead
        eyebrow="Section 02"
        title="What to do first"
        lede="In order. Two people with the same amount of money get a different first move here, and that is the whole argument of this project."
      />

      <div className="mwm-stack" style={{ gap: '3rem' }}>
        {groups.map((tag) => {
          const items = a.actions.filter((m) => m.tag === tag)
          return (
            <div key={tag}>
              <div className="mwm-row" style={{ gap: '1rem', marginBottom: '1.4rem' }}>
                <h3 style={{ fontSize: 'clamp(1.3rem, 2.2vw, 1.7rem)' }}>{TAG_LABEL[tag]}</h3>
                <span style={{ flex: 1, height: 1, background: 'var(--edge)' }} />
                <span className="mwm-tiny">
                  {items.length} {items.length === 1 ? 'thing' : 'things'}
                </span>
              </div>

              <div className="mwm-grid mwm-grid--2">
                {items.map((m, i) => (
                  <Reveal key={m.id} delay={i * 0.06}>
                    <Box variant={tag === 'before markets' ? 'accent' : undefined} style={{ height: '100%' }}>
                      <div className="mwm-row" style={{ gap: '1rem', alignItems: 'flex-start' }}>
                        <span
                          className="mwm-num"
                          style={{
                            fontSize: '2.4rem',
                            color: 'var(--accent)',
                            lineHeight: 1,
                            minWidth: '2.2rem',
                          }}
                        >
                          {String(m.order).padStart(2, '0')}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4>{m.title}</h4>
                          <p className="mwm-note" style={{ marginTop: '0.7rem' }}>
                            {m.body}
                          </p>
                        </div>
                      </div>
                    </Box>
                  </Reveal>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Reveal>
        <Box variant="quiet">
          <div className="mwm-grid mwm-grid--narrow" style={{ alignItems: 'center' }}>
            <div>
              <p className="mwm-eyebrow">The short version</p>
              <p className="mwm-quote" style={{ marginTop: '1rem' }}>
                {a.tiering.shortfallUsd > 0
                  ? 'Emergency money first. Everything else waits.'
                  : a.human.stage === 'buildIncome'
                    ? 'Build the income first. The market can wait a year.'
                    : 'Buffer is full. Now the money can go to work.'}
              </p>
            </div>
            <div className="mwm-stack" style={{ gap: '1.2rem' }}>
              <Row k="Money you can use" v={fmtUsd(a.tiering.investableUsd)} />
              <Row k="Emergency money to hold" v={`${fmtUsd(a.tiering.safetyUsd)} · ${a.tiering.bufferTargetMonths} months`} />
              <Row k="For things inside 3 years" v={fmtUsd(a.tiering.shortGoalsUsd)} />
              <Row k="Left to invest for the long run" v={fmtUsd(a.tiering.growthUsd)} accent />
              {a.tiering.shortfallUsd > 0 ? (
                <div className="mwm-row">
                  <Pill tone="warn">{fmtUsd(a.tiering.shortfallUsd)} short of your emergency target</Pill>
                </div>
              ) : null}
            </div>
          </div>
        </Box>
      </Reveal>
    </div>
  )
}

function Row({ k, v, accent = false }: { k: string; v: string; accent?: boolean }) {
  return (
    <div>
      <div className="mwm-row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
        <span className="mwm-note" style={{ color: 'var(--fg)' }}>
          {k}
        </span>
        <span
          className={`mwm-num ${accent ? 'mwm-accent' : ''}`}
          style={{ fontSize: '1.6rem', whiteSpace: 'nowrap' }}
        >
          {v}
        </span>
      </div>
      <hr className="mwm-rule" style={{ marginTop: '0.8rem' }} />
    </div>
  )
}
