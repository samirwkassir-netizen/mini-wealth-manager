import { motion, useMotionValue, useSpring, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { AssetKey, Flag } from '../engine'

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

export function Card({
  children,
  tone = 'default',
  className = '',
  style,
}: {
  children: ReactNode
  tone?: 'default' | 'flat' | 'ink'
  className?: string
  style?: React.CSSProperties
}) {
  const t = tone === 'ink' ? 'mwm-card--ink' : tone === 'flat' ? 'mwm-card--flat' : ''
  return (
    <div className={`mwm-card ${t} ${className}`} style={style}>
      {children}
    </div>
  )
}

export function Reveal({ children, delay = 0, y = 14 }: { children: ReactNode; delay?: number; y?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { opacity: 0, y }}
      animate={inView || reduce ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function Counter({
  value,
  format,
  className = '',
}: {
  value: number
  format: (n: number) => string
  className?: string
}) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? value : 0)
  const spring = useSpring(mv, { stiffness: 90, damping: 22, mass: 0.7 })
  const [text, setText] = useState(() => format(reduce ? value : 0))

  useEffect(() => {
    mv.set(value)
  }, [value, mv])

  useEffect(() => spring.on('change', (v) => setText(format(v))), [spring, format])

  return (
    <span className={`mwm-tabular ${className}`} aria-label={format(value)}>
      {text}
    </span>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div>
      <label className="mwm-label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {hint ? <p className="mwm-hint">{hint}</p> : null}
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
      {currency ? <span className="mwm-input-prefix">{currency === 'USD' ? '$' : currency}</span> : null}
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

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  stack = false,
}: {
  options: { value: T; label: string; hint?: string }[]
  value: T
  onChange: (v: T) => void
  stack?: boolean
}) {
  return (
    <div className={`mwm-seg ${stack ? 'mwm-seg--stack' : ''}`} role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          <span>{o.label}</span>
          {o.hint && stack ? (
            <span
              style={{
                display: 'block',
                fontSize: '0.72rem',
                opacity: 0.7,
                fontWeight: 400,
                marginTop: '0.15rem',
              }}
            >
              {o.hint}
            </span>
          ) : null}
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

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'warn' | 'ok' }) {
  const t = tone === 'warn' ? 'mwm-pill--warn' : tone === 'ok' ? 'mwm-pill--ok' : ''
  return <span className={`mwm-pill ${t}`}>{children}</span>
}

export function Swatch({ color }: { color: string }) {
  return <span className="mwm-swatch" style={{ background: color }} />
}

export function Callout({ flag }: { flag: Flag }) {
  return (
    <div className={`mwm-callout mwm-callout--${flag.severity}`}>
      <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{flag.title}</p>
      <p className="mwm-small" style={{ marginTop: '0.2rem' }}>
        {flag.body}
      </p>
    </div>
  )
}

/** The panel that shows the working. Open by default is the point of the project. */
export function Why({ title = 'Why this number', children }: { title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: '0.75rem' }}>
      <button type="button" className="mwm-linkish" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide the working' : title}
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ overflow: 'hidden' }}
      >
        <div className="mwm-why mwm-small" style={{ marginTop: '0.55rem' }}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}

export function Source({ url, label = 'source' }: { url: string | null; label?: string }) {
  if (!url) return <span className="mwm-small">no source found</span>
  return (
    <a className="mwm-small" href={url} target="_blank" rel="noreferrer noopener">
      {label}
    </a>
  )
}

export function Meter({ pct, color = 'var(--oxblood)' }: { pct: number; color?: string }) {
  const reduce = useReducedMotion()
  return (
    <div className="mwm-meter">
      <motion.span
        style={{ background: color }}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      />
    </div>
  )
}

export function StatTile({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'ink'
}) {
  return (
    <Card tone={tone === 'ink' ? 'ink' : 'default'}>
      <p className="mwm-eyebrow">{label}</p>
      <p
        className="mwm-tabular"
        style={{
          fontFamily: "'EB Garamond', Georgia, serif",
          fontSize: 'clamp(1.7rem, 3.4vw, 2.3rem)',
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          marginTop: '0.5rem',
        }}
      >
        {value}
      </p>
      {sub ? (
        <p className="mwm-small" style={{ marginTop: '0.35rem' }}>
          {sub}
        </p>
      ) : null}
    </Card>
  )
}

export function SectionHead({
  index,
  title,
  intro,
}: {
  index: string
  title: string
  intro?: ReactNode
}) {
  return (
    <div style={{ marginBottom: '1.4rem' }}>
      <p className="mwm-eyebrow">{index}</p>
      <h2 style={{ marginTop: '0.5rem' }}>{title}</h2>
      {intro ? (
        <p className="mwm-lede" style={{ marginTop: '0.8rem' }}>
          {intro}
        </p>
      ) : null}
    </div>
  )
}
