import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import type { AssetKey } from '../engine'
import { CHART_COLOR } from './ui'

export interface Slice {
  key: AssetKey
  label: string
  value: number
}

/** Allocation donut. Ordered light to dark by risk, so the ring reads before the legend. */
export function Donut({ slices, size = 220, thickness = 26 }: { slices: Slice[]; size?: number; thickness?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const reduce = useReducedMotion()

  const total = slices.reduce((s, x) => s + x.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let acc = 0

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: '100%', maxWidth: size, height: 'auto', display: 'block' }}
      role="img"
      aria-label={slices.map((s) => `${s.label} ${((s.value / total) * 100).toFixed(0)} percent`).join(', ')}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(15 15 15 / 0.05)" strokeWidth={thickness} />
      {slices.map((s, i) => {
        const frac = s.value / total
        const len = c * frac
        const offset = -c * acc
        acc += frac
        return (
          <motion.circle
            key={s.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={CHART_COLOR[s.key]}
            strokeWidth={thickness}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            initial={reduce ? false : { opacity: 0, strokeDasharray: `0 ${c}` }}
            animate={inView || reduce ? { opacity: 1, strokeDasharray: `${len} ${c - len}` } : undefined}
            transition={{ duration: 0.75, delay: 0.06 * i, ease: [0.2, 0.8, 0.2, 1] }}
          />
        )
      })}
    </svg>
  )
}

export interface BarSegment {
  key: string
  label: string
  value: number
  color: string
}

/** One horizontal bar split into labelled parts. Used for access, currency and tiers. */
export function SplitBar({ segments, height = 34 }: { segments: BarSegment[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const reduce = useReducedMotion()
  const total = segments.reduce((s, x) => s + x.value, 0) || 1

  return (
    <div ref={ref}>
      <div className="mwm-bar-track" style={{ height }}>
        {segments.map((s, i) => (
          <motion.div
            key={s.key}
            title={`${s.label}: ${((s.value / total) * 100).toFixed(1)}%`}
            style={{ background: s.color, height: '100%' }}
            initial={reduce ? false : { width: 0 }}
            animate={inView || reduce ? { width: `${(s.value / total) * 100}%` } : undefined}
            transition={{ duration: 0.7, delay: 0.05 * i, ease: [0.2, 0.8, 0.2, 1] }}
          />
        ))}
      </div>
      <div className="mwm-row" style={{ marginTop: '0.65rem', gap: '0.9rem' }}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span key={s.key} className="mwm-row mwm-small" style={{ gap: '0.35rem' }}>
              <span className="mwm-swatch" style={{ background: s.color }} />
              {s.label} {((s.value / total) * 100).toFixed(0)}%
            </span>
          ))}
      </div>
    </div>
  )
}

export interface FrontierMarker {
  label: string
  ret: number
  vol: number
  emphasis?: boolean
  hollow?: boolean
}

export function FrontierChart({
  curve,
  markers,
  height = 300,
}: {
  curve: { ret: number; vol: number }[]
  markers: FrontierMarker[]
  height?: number
}) {
  const reduce = useReducedMotion()
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })

  const W = 560
  const H = height
  const pad = { l: 46, r: 90, t: 26, b: 42 }

  const all = [...curve, ...markers]
  const volMin = Math.max(0, Math.min(...all.map((p) => p.vol)) - 1.5)
  const volMax = Math.max(...all.map((p) => p.vol)) + 1.5
  const retMin = Math.min(...all.map((p) => p.ret)) - 0.4
  const retMax = Math.max(...all.map((p) => p.ret)) + 0.4

  const x = (v: number) => pad.l + ((v - volMin) / (volMax - volMin)) * (W - pad.l - pad.r)
  const y = (v: number) => H - pad.b - ((v - retMin) / (retMax - retMin)) * (H - pad.t - pad.b)

  const path = curve.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.vol).toFixed(1)},${y(p.ret).toFixed(1)}`).join(' ')

  const xTicks = 4
  const yTicks = 4

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 720, margin: '0 auto', height: 'auto', display: 'block' }} role="img" aria-label="Efficient frontier: expected return against volatility">
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = retMin + ((retMax - retMin) * i) / yTicks
        return (
          <g key={`y${i}`}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="rgb(15 15 15 / 0.07)" strokeWidth={1} />
            <text x={pad.l - 8} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--smoke)">
              {v.toFixed(1)}%
            </text>
          </g>
        )
      })}
      {Array.from({ length: xTicks + 1 }, (_, i) => {
        const v = volMin + ((volMax - volMin) * i) / xTicks
        return (
          <text key={`x${i}`} x={x(v)} y={H - pad.b + 16} textAnchor="middle" fontSize={10} fill="var(--smoke)">
            {v.toFixed(0)}%
          </text>
        )
      })}

      <text x={W - pad.r} y={H - 6} fontSize={9.5} fill="var(--smoke)" textAnchor="end">
        volatility, how much it moves in a year
      </text>
      <text x={pad.l} y={12} fontSize={9.5} fill="var(--smoke)" textAnchor="start">
        expected return per year
      </text>

      <motion.path
        d={path}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={1.6}
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={inView || reduce ? { pathLength: 1 } : undefined}
        transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
      />

      {markers.map((m, i) => (
        <motion.g
          key={m.label}
          initial={reduce ? false : { opacity: 0, scale: 0.5 }}
          animate={inView || reduce ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 0.4, delay: 0.7 + i * 0.09 }}
          style={{ transformOrigin: `${x(m.vol)}px ${y(m.ret)}px` }}
        >
          <circle
            cx={x(m.vol)}
            cy={y(m.ret)}
            r={m.emphasis ? 6 : 4.5}
            fill={m.hollow ? 'var(--paper)' : m.emphasis ? 'var(--oxblood)' : 'var(--smoke)'}
            stroke={m.emphasis ? 'var(--oxblood)' : 'var(--smoke)'}
            strokeWidth={1.6}
          />
          <text
            x={x(m.vol) + (x(m.vol) > W * 0.72 ? -10 : 10)}
            y={y(m.ret) + 3.5}
            fontSize={10.5}
            fontWeight={m.emphasis ? 600 : 400}
            fill={m.emphasis ? 'var(--oxblood)' : 'var(--smoke)'}
            textAnchor={x(m.vol) > W * 0.72 ? 'end' : 'start'}
          >
            {m.label}
          </text>
        </motion.g>
      ))}
    </svg>
  )
}

/** Contribution bars for a stress scenario. Negative left, positive right, zero in the middle. */
export function StressBars({
  rows,
  height = 26,
}: {
  rows: { key: AssetKey; label: string; shock: number; contribution: number; verified: boolean }[]
  height?: number
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.contribution)))

  return (
    <div ref={ref} className="mwm-stack" style={{ gap: '0.5rem' }}>
      {rows.map((r, i) => {
        const w = (Math.abs(r.contribution) / max) * 50
        const neg = r.contribution < 0
        return (
          <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.6rem', alignItems: 'center' }}>
            <span className="mwm-small" style={{ color: 'var(--ink)' }}>
              {r.label}
              {!r.verified ? <span style={{ color: 'var(--smoke)' }}> · flat</span> : null}
            </span>
            <div style={{ position: 'relative', height }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgb(15 15 15 / 0.14)' }} />
              <motion.div
                style={{
                  position: 'absolute',
                  top: 4,
                  bottom: 4,
                  background: neg ? CHART_COLOR[r.key] : 'var(--pos)',
                  borderRadius: 3,
                  ...(neg ? { right: '50%' } : { left: '50%' }),
                }}
                initial={reduce ? false : { width: 0 }}
                animate={inView || reduce ? { width: `${w}%` } : undefined}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </div>
            <span className="mwm-small mwm-tabular" style={{ minWidth: '4.2rem', textAlign: 'right' }}>
              {r.contribution >= 0 ? '+' : ''}
              {r.contribution.toFixed(1)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Months of runway as a strip of ticks. Reads as time rather than as a percentage. */
export function RunwayStrip({
  months,
  target,
  totalMonths,
}: {
  months: number
  target: number
  totalMonths: number
}) {
  const reduce = useReducedMotion()
  const span = Math.max(target + 2, Math.ceil(totalMonths) + 1, 6)
  const cells = Array.from({ length: span }, (_, i) => i)

  return (
    <div>
      <div style={{ display: 'flex', gap: 3 }}>
        {cells.map((i) => {
          const reachable = i < Math.floor(months)
          const owned = i < Math.floor(totalMonths)
          return (
            <motion.div
              key={i}
              style={{
                flex: 1,
                height: 30,
                borderRadius: 3,
                background: reachable ? 'var(--oxblood)' : owned ? 'rgb(122 31 42 / 0.18)' : 'rgb(15 15 15 / 0.06)',
                border: i === target - 1 ? '1px dashed rgb(15 15 15 / 0.45)' : '1px solid transparent',
              }}
              initial={reduce ? false : { opacity: 0, scaleY: 0.3 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.35, delay: i * 0.025 }}
            />
          )
        })}
      </div>
      <div className="mwm-row" style={{ marginTop: '0.6rem', gap: '0.9rem' }}>
        <span className="mwm-row mwm-small" style={{ gap: '0.35rem' }}>
          <span className="mwm-swatch" style={{ background: 'var(--oxblood)' }} /> months you can reach
        </span>
        <span className="mwm-row mwm-small" style={{ gap: '0.35rem' }}>
          <span className="mwm-swatch" style={{ background: 'rgb(122 31 42 / 0.18)' }} /> months you own but cannot reach
        </span>
        <span className="mwm-small">dashed line is your target of {target}</span>
      </div>
    </div>
  )
}
