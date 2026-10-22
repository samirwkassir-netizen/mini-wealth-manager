import { Component, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/* ---------- a short explanation, one tap away, never in the way ---------- */

export function Why({ children, label = 'Why?', title }: { children: ReactNode; label?: string; title?: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const id = useId()

  useLayoutEffect(() => {
    if (!open || !btn.current) return
    const place = () => {
      const r = btn.current!.getBoundingClientRect()
      const w = Math.min(340, window.innerWidth - 24)
      const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2))
      const up = r.bottom + 220 > window.innerHeight && r.top > 240
      setPos({ top: up ? r.top - 8 : r.bottom + 8, left, up })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (pop.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btn.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="w-why"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open && pos ? (
        <div
          ref={pop}
          id={id}
          role="dialog"
          aria-label={title ?? 'Explanation'}
          className="w-pop"
          style={{
            top: pos.top,
            left: pos.left,
            transform: pos.up ? 'translateY(-100%)' : undefined,
          }}
        >
          {title ? <p className="w-pop-title">{title}</p> : null}
          <div className="w-pop-body">{children}</div>
        </div>
      ) : null}
    </>
  )
}

/* ---------- segmented choice ---------- */

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  size = 'md',
  className,
}: {
  value: T
  options: { value: T; label: string; title?: string }[]
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={['w-seg', `w-seg--${size}`, className].filter(Boolean).join(' ')} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          className={`w-seg-opt w-seg-opt--${String(o.value)}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- a number field that lets you type freely ---------- */

export function Amount({
  value,
  onChange,
  label,
  prefix,
  placeholder = '0',
  width,
}: {
  value: number
  onChange: (n: number) => void
  label: string
  prefix?: string
  placeholder?: string
  width?: string
}) {
  const fmt = (n: number) => (n ? n.toLocaleString('en-US') : '')
  const [text, setText] = useState(fmt(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setText(fmt(value))
  }, [value])

  return (
    <label className="w-amount" style={width ? { width } : undefined}>
      <span className="w-sr">{label}</span>
      {prefix ? <span className="w-amount-pre" aria-hidden="true">{prefix}</span> : null}
      <input
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onFocus={(e) => {
          focused.current = true
          e.currentTarget.select()
        }}
        onBlur={() => {
          focused.current = false
          setText(fmt(value))
        }}
        onChange={(e) => {
          const raw = e.currentTarget.value.replace(/[^\d.]/g, '')
          setText(e.currentTarget.value)
          const n = Number(raw)
          onChange(Number.isFinite(n) ? Math.min(n, 1e15) : 0)
        }}
      />
    </label>
  )
}

export const usd = (n: number) => {
  const v = Math.round(Math.abs(n))
  return `${n < 0 ? '−' : ''}$${v.toLocaleString('en-US')}`
}

export const usdShort = (n: number) => {
  const v = Math.abs(n)
  const s = v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e4 ? `${Math.round(v / 1000)}k` : Math.round(v).toLocaleString('en-US')
  return `${n < 0 ? '−' : ''}$${s}`
}

export const months = (m: number) => (m >= 10 ? Math.round(m).toString() : m.toFixed(1).replace(/\.0$/, ''))

/* ---------- if the numbers ever break the screen, say so instead of going blank ---------- */

export class Guard extends Component<{ children: ReactNode; onReset: () => void }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="w-empty" style={{ padding: '32px' }}>
        <p className="w-view-big">Something in these numbers broke the tool.</p>
        <p className="w-muted">
          <button
            type="button"
            className="w-act"
            onClick={() => {
              this.setState({ failed: false })
              this.props.onReset()
            }}
          >
            Start again from the example
          </button>
        </p>
      </div>
    )
  }
}
