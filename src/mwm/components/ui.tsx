import { AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { AssetKey } from '../engine'

export const CHART_COLOR: Record<AssetKey, string> = {
  cash: 'var(--c-cash)',
  shortGov: 'var(--c-shortGov)',
  globalBonds: 'var(--c-globalBonds)',
  tips: 'var(--c-tips)',
  gold: 'var(--c-gold)',
  property: 'var(--c-property)',
  globalEquity: 'var(--c-globalEquity)',
  emEquity: 'var(--c-emEquity)',
}

/* ------------------------------------------------------------------ */
/* plain English                                                       */
/* ------------------------------------------------------------------ */

/**
 * Every term a reader might not know, written the way you would say it out
 * loud to a friend. If a word is not in here, it should not be on the screen.
 */
export const GLOSSARY: Record<string, string> = {
  shares:
    'A share is a small piece of a company. If you own one share of Apple, you own a tiny part of Apple, and you get a tiny part of whatever it earns. Prices go up and down every day.',
  bonds:
    'A bond is a loan you make to a government or a company. They pay you interest and give your money back on an agreed date. Safer than shares. Earns less.',
  fund: 'A fund is one thing you buy that holds hundreds or thousands of companies at once. Instead of picking winners, you own a slice of everything. One purchase, instant spreading.',
  etf: 'An ETF is a fund you buy and sell on a stock exchange the same way you would buy a single share. That is the only real difference from an ordinary fund.',
  volatility:
    'How much something jumps around. A 16 percent figure means that in a normal year the value can easily end up 16 percent above or below where it started. It is a measure of the ride, not of whether you lose money in the end.',
  expectedReturn:
    'A best guess at what something earns per year, averaged over ten or twenty years. Some years will be much better and some much worse. Nobody gets this exactly right.',
  emergencyMoney:
    'Boring money you can reach in one day, kept for the month your laptop dies and your car breaks in the same week. It is not meant to grow. It is meant to stop you selling your investments at the worst possible moment.',
  monthsCovered:
    'How many months you could pay for your normal life if all your income stopped tomorrow, using only the money you can actually reach.',
  inflation:
    'Prices going up over time. If prices rise 3 percent a year, the same 100 dollars buys 3 percent less next year. Money sitting still quietly loses value.',
  diversify:
    'Not putting everything in one place. Different countries, different types of investment, different institutions. Some things go down while others go up, so the whole pile moves less.',
  ter: 'The yearly fee a fund charges you, taken automatically. 0.20 percent means 2 dollars a year for every 1,000 dollars you hold. Small numbers, but they run every year for decades.',
  ucits:
    'A fund registered in Ireland and regulated in Europe. For anyone outside America this is usually the better version of the same fund, for tax reasons explained in the Where to hold it section.',
  domicile: 'Which country a fund is legally registered in. It changes how much tax gets taken from you before you ever see the money.',
  withholding:
    'Tax taken out automatically before money reaches you. On American funds this is 30 percent of the dividends for most people outside the US, and 15 percent if you buy the Irish version instead.',
  buffer:
    'The same thing as emergency money. Cash you can reach in a day, sized in months of your spending rather than as a percentage.',
  rebalance:
    'Once or twice a year, selling a bit of whatever grew too big and buying whatever shrank, to get back to your target mix. It quietly makes you sell high and buy low.',
  drawdown: 'How far something falls from its highest point before it recovers. The number that makes people panic and sell.',
  correlation:
    'Whether two things move together. If shares and gold have low correlation, gold often holds up when shares fall, which is the entire reason to own both.',
}

export function Define({ term, children }: { term: keyof typeof GLOSSARY | string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const text = GLOSSARY[term]
  if (!text) return <>{children}</>
  return (
    <span
      className="mwm-define"
      tabIndex={0}
      role="button"
      aria-label={`What ${String(children)} means`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
    >
      {children}
      <AnimatePresence>
        {open ? (
          <motion.span
            className="mwm-define-pop"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {text}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Box({
  children,
  variant,
  className = '',
  style,
}: {
  children: ReactNode
  variant?: 'quiet' | 'edge' | 'accent' | 'tight'
  className?: string
  style?: CSSProperties
}) {
  const v = variant ? `mwm-box--${variant}` : ''
  return (
    <div className={`mwm-box ${v} ${className}`} style={style}>
      {children}
    </div>
  )
}

export function Pair({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="mwm-pair">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  )
}

export function Tile({
  label,
  value,
  sub,
  hero = false,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  hero?: boolean
}) {
  return (
    <div className={`mwm-tile ${hero ? 'mwm-tile--hero' : ''}`}>
      <p className="mwm-eyebrow">{label}</p>
      <p className="mwm-num mwm-tile-value">{value}</p>
      {sub ? <p className="mwm-note">{sub}</p> : null}
    </div>
  )
}

export function Reveal({ children, delay = 0, y = 18 }: { children: ReactNode; delay?: number; y?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const reduce = useReducedMotion()
  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y }}
      animate={inView || reduce ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function Counter({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? value : 0)
  const spring = useSpring(mv, { stiffness: 80, damping: 24, mass: 0.8 })
  const [text, setText] = useState(() => format(reduce ? value : 0))

  useEffect(() => {
    mv.set(value)
  }, [value, mv])
  useEffect(() => spring.on('change', (v) => setText(format(v))), [spring, format])

  return <span aria-label={format(value)}>{text}</span>
}

export function SectionHead({
  eyebrow,
  title,
  lede,
  aside,
}: {
  eyebrow?: string
  title: string
  lede?: ReactNode
  aside?: ReactNode
}) {
  return (
    <header className="mwm-head">
      <div>
        {eyebrow ? <p className="mwm-eyebrow" style={{ marginBottom: '1rem' }}>{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      <div className="mwm-stack" style={{ gap: '1rem', paddingTop: '0.5rem' }}>
        {lede ? <p className="mwm-lede">{lede}</p> : null}
        {aside}
      </div>
    </header>
  )
}

export function Quote({ children, by }: { children: ReactNode; by?: string }) {
  return (
    <div className="mwm-stack" style={{ gap: '0.9rem' }}>
      <p className="mwm-quote">{children}</p>
      {by ? <p className="mwm-tiny">{by}</p> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* controls                                                            */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className="mwm-field">
      <label className="mwm-label" htmlFor={id}>
        {label}
      </label>
      {hint ? <p className="mwm-hint">{hint}</p> : null}
      {children(id)}
    </div>
  )
}

export function MoneyInput({
  id,
  value,
  onChange,
  currency,
  placeholder = '0',
}: {
  id?: string
  value: number
  onChange: (n: number) => void
  currency?: string
  placeholder?: string
}) {
  const [raw, setRaw] = useState(value ? String(value) : '')
  useEffect(() => {
    setRaw((prev) => (Number(prev) === value ? prev : value ? String(value) : ''))
  }, [value])

  return (
    <div className="mwm-input-group">
      {currency ? <span className="mwm-prefix">{currency === 'USD' ? '$' : currency}</span> : null}
      <input
        id={id}
        className="mwm-input"
        inputMode="decimal"
        placeholder={placeholder}
        value={raw}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d.]/g, '')
          setRaw(next)
          onChange(next === '' ? 0 : Number(next))
        }}
      />
    </div>
  )
}

export function Choices<T extends string>({
  options,
  value,
  onChange,
  row = false,
}: {
  options: { value: T; label: string; sub?: string }[]
  value: T
  onChange: (v: T) => void
  row?: boolean
}) {
  return (
    <div className={`mwm-choices ${row ? 'mwm-choices--row' : ''}`} role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="mwm-choice"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          <span>{o.label}</span>
          {o.sub ? <span className="mwm-choice-sub">{o.sub}</span> : null}
        </button>
      ))}
    </div>
  )
}

export function Select({
  id,
  value,
  onChange,
  options,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select id={id} className="mwm-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Slider({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  id?: string
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <input
      id={id}
      className="mwm-range"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}

/* ------------------------------------------------------------------ */
/* bits                                                                */
/* ------------------------------------------------------------------ */

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'warn' | 'ok' }) {
  const t = tone === 'warn' ? 'mwm-pill--warn' : tone === 'ok' ? 'mwm-pill--ok' : ''
  return <span className={`mwm-pill ${t}`}>{children}</span>
}

export function Swatch({ color }: { color: string }) {
  return <span className="mwm-swatch" style={{ background: color }} />
}

export function Source({ url, label = 'source' }: { url: string | null; label?: string }) {
  if (!url) return <span className="mwm-tiny">no source found</span>
  return (
    <a className="mwm-tiny" href={url} target="_blank" rel="noreferrer noopener">
      {label}
    </a>
  )
}

export function Disclose({ summary, children }: { summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" className="mwm-link" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide this' : summary}
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ overflow: 'hidden' }}
      >
        <div className="mwm-box mwm-box--quiet mwm-box--tight" style={{ marginTop: '0.9rem' }}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}

export function Bar({ pct, color = 'var(--accent)' }: { pct: number; color?: string }) {
  const reduce = useReducedMotion()
  return (
    <div style={{ height: 10, borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
      <motion.span
        style={{ display: 'block', height: '100%', borderRadius: 999, background: color }}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
      />
    </div>
  )
}
