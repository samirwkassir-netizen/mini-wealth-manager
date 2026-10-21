import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import './app/app.css'
import { analyse, defaultUplift, fxMeta, toUsd, ASSUMPTION_META, type AppState, type RiskLevel } from './engine'
import { Why } from './app/bits'
import { Inputs } from './app/Inputs'
import { Headline, Stage } from './app/Headline'
import { BadYears, Invest, SafetyNet, YouFirst } from './app/views'
import { Moves } from './app/Moves'
import { BLANK, PRESETS, decodeState, encodeState } from './app/state'
import { drawShareCard } from './app/shareCard'

type Tab = 'safety' | 'invest' | 'bad' | 'you'
type Pane = 'numbers' | 'plan' | 'moves'

const TABS: { id: Tab; label: string }[] = [
  { id: 'safety', label: 'Safety net' },
  { id: 'invest', label: 'Invest' },
  { id: 'bad', label: 'Bad years' },
  { id: 'you', label: 'You first' },
]

export default function MiniWealthManager() {
  const [state, setState] = useState<AppState>(PRESETS[0].state)
  const [level, setLevel] = useState<RiskLevel | null>(null)
  const [preset, setPreset] = useState<string | null>(PRESETS[0].id)
  const [tab, setTab] = useState<Tab>('safety')
  const [pane, setPane] = useState<Pane>('plan')
  const [uplift, setUplift] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // A shared link carries its numbers in the hash. Read once, on arrival.
  useEffect(() => {
    const fromHash = decodeState(window.location.hash)
    if (fromHash) {
      setState(fromHash.state)
      setLevel(fromHash.ui.level)
      setPreset(null)
      // The numbers are loaded; take them out of the address bar so they are not shared by accident.
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // #demo flips between the two examples on a loop, for screen recordings.
  useEffect(() => {
    if (window.location.hash !== '#demo') return
    let i = 0
    const t = setInterval(() => {
      i = (i + 1) % PRESETS.length
      setState(PRESETS[i].state)
      setPreset(PRESETS[i].id)
    }, 3200)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  // Typing stays instant; the analysis catches up a frame later if it has to.
  const live = useDeferredValue(state)
  const up = uplift ?? defaultUplift(toUsd(live.flows.incomeMonthly || 0, live.flows.incomeCurrency))
  const a = useMemo(() => analyse(live, up, level), [live, up, level])

  const edit = (s: AppState) => {
    setState(s)
    setPreset(null)
  }

  const loadPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)
    if (!p) return
    setState(p.state)
    setPreset(id)
    setLevel(null)
    setUplift(null)
  }

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#s=${encodeState(state, { level })}`
    try {
      await navigator.clipboard.writeText(url)
      setToast('Link copied. It carries these numbers, so share it only if you mean to.')
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  const saveImage = async () => {
    const blob = await drawShareCard(a, state)
    if (!blob) return
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'my-balance-is-not-my-money.png'
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 4000)
    setToast('Image saved.')
  }

  return (
    <div className="w-app">
      <div className="w-bar">
        <div className="w-bar-title">
          <a href="/" className="w-home" aria-label="Back to samirkassir.me">
            SK
          </a>
          <div>
            <h1 className="w-title">Mini Wealth Manager</h1>
            <p className="w-sub">Your balance is not your money. See how much of it you can use, and what to do next.</p>
          </div>
        </div>

        <div className="w-bar-tools">
          <div className="w-presets" role="group" aria-label="Examples">
            <span className="w-label">Example</span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-preset"
                aria-pressed={preset === p.id}
                title={p.line}
                onClick={() => loadPreset(p.id)}
              >
                {p.name}
              </button>
            ))}
            <button
              type="button"
              className="w-preset w-preset--mine"
              aria-pressed={preset === null}
              onClick={() => {
                if (preset !== null) {
                  edit(BLANK)
                  setLevel(null)
                  setUplift(null)
                  setPane('numbers')
                }
              }}
            >
              My numbers
            </button>
          </div>
          <div className="w-actions">
            <button type="button" className="w-act" onClick={copyLink}>
              Copy link
            </button>
            <button type="button" className="w-act" onClick={saveImage}>
              Save image
            </button>
            <Why label="Sources" title="What this runs on">
              <p>
                Return and risk figures: {ASSUMPTION_META.primarySource} Exchange rates frozen on {fxMeta.checkedOn}. Crash
                figures from MSCI and Bloomberg index data; unverified lines are held at zero and marked.
              </p>
              <p>
                No account, no server, no network calls. Everything is computed in your browser. A teaching tool, and not
                investment advice.
              </p>
              <p>
                <a href="https://github.com/samirwkassir-netizen/mini-wealth-manager" target="_blank" rel="noopener noreferrer">
                  Read the source
                </a>
              </p>
            </Why>
          </div>
        </div>
      </div>

      <nav className="w-panes" aria-label="Sections">
        {(
          [
            ['numbers', 'Your numbers'],
            ['plan', 'Plan'],
            ['moves', 'Next moves'],
          ] as [Pane, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={pane === id} onClick={() => setPane(id)}>
            {label}
          </button>
        ))}
      </nav>

      <div className="w-grid" data-pane={pane}>
        <aside className="w-left" aria-label="Your numbers">
          <Inputs state={state} onChange={edit} />
          <p className="w-privacy">Nothing you type leaves this page.</p>
        </aside>

        <main className="w-right">
          <Headline a={a} state={live} />
          <Stage a={a} state={live} />

          <div className="w-body">
            <div className="w-tabs-wrap">
              <div className="w-tabs" role="tablist" aria-label="Plan">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    id={`w-tab-${t.id}`}
                    aria-selected={tab === t.id}
                    aria-controls="w-tabpanel"
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="w-tabpanel" id="w-tabpanel" role="tabpanel" aria-labelledby={`w-tab-${tab}`}>
                {tab === 'safety' ? <SafetyNet a={a} state={live} /> : null}
                {tab === 'invest' ? (
                  <Invest
                    a={a}
                    state={live}
                    level={level}
                    setLevel={setLevel}
                    onUsPerson={(v) => edit({ ...state, profile: { ...state.profile, usPerson: v } })}
                    onBroker={(v) => edit({ ...state, profile: { ...state.profile, brokerAccess: v } })}
                  />
                ) : null}
                {tab === 'bad' ? <BadYears a={a} state={live} /> : null}
                {tab === 'you' ? <YouFirst a={a} uplift={up} setUplift={setUplift} /> : null}
              </div>
            </div>
            <Moves a={a} />
          </div>
        </main>
      </div>

      <p className="w-foot">A teaching tool, not investment advice. Figures are estimates with dated sources.</p>
      {toast ? (
        <div className="w-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
