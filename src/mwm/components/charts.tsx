import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import type { AssetKey } from '../engine'
import { CHART_COLOR, Swatch } from './ui'

export interface Slice {
  key: AssetKey
  label: string
  value: number
}

export function Donut({ slices, size = 260, thickness = 34 }: { slices: Slice[]; size?: number; thickness?: number }) {
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
      style={{ width: '100%', maxWidth: size, height: 'auto', display: 'block', margin: '0 auto' }}
      role="img"
      aria-label={slices.map((s) => `${s.label} ${((s.value / total) * 100).toFixed(0)} percent`).join(', ')}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
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
            transition={{ duration: 0.8, delay: 0.07 * i, ease: [0.2, 0.8, 0.2, 1] }}
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

export function SplitBar({ segments, height = 44 }: { segments: BarSegment[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const reduce = useReducedMotion()
  const total = segments.reduce((s, x) => s + x.value, 0) || 1

  return (
    <div ref={ref}>
      <div style={{ display: 'flex', height, borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)' }}>
        {segments.map((s, i) => (
          <motion.div
            key={s.key}
            title={`${s.label}: ${((s.value / total) * 100).toFixed(1)}%`}
            style={{ background: s.color, height: '100%' }}
            initial={reduce ? false : { width: 0 }}
            animate={inView || reduce ? { width: `${(s.value / total) * 100}%` } : undefined}
            transition={{ duration: 0.75, delay: 0.06 * i, ease: [0.2, 0.8, 0.2, 1] }}
          />
        ))}
      </div>
      <div className="mwm-row" style={{ marginTop: '0.9rem', gap: '1.3rem' }}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span key={s.key} className="mwm-row mwm-note" style={{ gap: '0.45rem' }}>
              <Swatch color={s.color} />
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

/**
 * Markers carry a number on the plot and their name in a legend underneath.
 * Labels drawn next to the dots collided as soon as two portfolios sat close
 * together, which they always do.
 */
export function FrontierChart({
  curve,
  markers,
  height = 320,
}: {
  curve: { ret: number; vol: number }[]
  markers: FrontierMarker[]
  height?: number
}) {
  const reduce = useReducedMotion()
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })

  const W = 640
  const H = height
  const pad = { l: 58, r: 24, t: 30, b: 52 }

  const all = [...curve, ...markers]
  const volMin = Math.max(0, Math.min(...all.map((p) => p.vol)) - 1.5)
  const volMax = Math.max(...all.map((p) => p.vol)) + 1.5
  const retMin = Math.min(...all.map((p) => p.ret)) - 0.4
  const retMax = Math.max(...all.map((p) => p.ret)) + 0.4

  const x = (v: number) => pad.l + ((v - volMin) / (volMax - volMin)) * (W - pad.l - pad.r)
  const y = (v: number) => H - pad.b - ((v - retMin) / (retMax - retMin)) * (H - pad.t - pad.b)

  const path = curve.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.vol).toFixed(1)},${y(p.ret).toFixed(1)}`).join(' ')
  const ticks = 4

  // Two portfolios that sit close together used to draw one dot on top of the
  // other. Nudge each one clear of the ones already placed.
  const placed: { cx: number; cy: number }[] = []
  const spots = markers.map((m) => {
    let cx = x(m.vol)
    let cy = y(m.ret)
    for (let guard = 0; guard < 12; guard++) {
      const hit = placed.find((q) => Math.hypot(q.cx - cx, q.cy - cy) < 30)
      if (!hit) break
      const dx = cx - hit.cx || 1
      const dy = cy - hit.cy || -1
      const len = Math.hypot(dx, dy)
      cx += (dx / len) * 16
      cy += (dy / len) * 16
    }
    placed.push({ cx, cy })
    return { cx, cy, anchorX: x(m.vol), anchorY: y(m.ret) }
  })

  return (
    <div>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Expected return against how much the portfolio moves"
      >
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = retMin + ((retMax - retMin) * i) / ticks
          return (
            <g key={`y${i}`}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--edge)" strokeWidth={1} />
              <text x={pad.l - 10} y={y(v) + 4} textAnchor="end" fontSize={12} fill="var(--muted)">
                {v.toFixed(1)}%
              </text>
            </g>
          )
        })}
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = volMin + ((volMax - volMin) * i) / ticks
          return (
            <text key={`x${i}`} x={x(v)} y={H - pad.b + 20} textAnchor="middle" fontSize={12} fill="var(--muted)">
              {v.toFixed(0)}%
            </text>
          )
        })}

        <text x={pad.l} y={16} fontSize={12} fill="var(--muted)">
          what it might earn each year
        </text>
        <text x={W - pad.r} y={H - 10} fontSize={12} fill="var(--muted)" textAnchor="end">
          how much it moves up and down
        </text>

        <motion.path
          d={path}
          fill="none"
          stroke="var(--fg)"
          strokeWidth={2}
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={inView || reduce ? { pathLength: 1 } : undefined}
          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
        />

        {markers.map((m, i) => {
          const sp = spots[i]
          const moved = Math.hypot(sp.cx - sp.anchorX, sp.cy - sp.anchorY) > 2
          return (
            <motion.g
              key={m.label}
              initial={reduce ? false : { opacity: 0, scale: 0.4 }}
              animate={inView || reduce ? { opacity: 1, scale: 1 } : undefined}
              transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
              style={{ transformOrigin: `${sp.cx}px ${sp.cy}px` }}
            >
              {moved ? (
                <line
                  x1={sp.anchorX}
                  y1={sp.anchorY}
                  x2={sp.cx}
                  y2={sp.cy}
                  stroke="var(--muted)"
                  strokeWidth={1}
                  opacity={0.5}
                />
              ) : null}
              <circle
                cx={sp.cx}
                cy={sp.cy}
                r={m.emphasis ? 13 : 11}
                fill={m.hollow ? 'var(--bg)' : m.emphasis ? 'var(--accent)' : 'var(--muted)'}
                stroke={m.emphasis ? 'var(--accent)' : 'var(--muted)'}
                strokeWidth={2}
              />
              <text
                x={sp.cx}
                y={sp.cy + 4.5}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill={m.hollow ? 'var(--muted)' : 'var(--bg)'}
              >
                {i + 1}
              </text>
            </motion.g>
          )
        })}
      </svg>

      <div className="mwm-row" style={{ gap: '1.4rem', marginTop: '1rem' }}>
        {markers.map((m, i) => (
          <span key={m.label} className="mwm-row mwm-note" style={{ gap: '0.5rem' }}>
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 22,
                height: 22,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: m.hollow ? 'transparent' : m.emphasis ? 'var(--accent)' : 'var(--muted)',
                color: m.hollow ? 'var(--muted)' : 'var(--bg)',
                border: `2px solid ${m.emphasis ? 'var(--accent)' : 'var(--muted)'}`,
              }}
            >
              {i + 1}
            </span>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function StressBars({
  rows,
}: {
  rows: { key: AssetKey; label: string; shock: number; contribution: number; verified: boolean }[]
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.contribution)))

  return (
    <div ref={ref} className="mwm-stack" style={{ gap: '0.9rem' }}>
      {rows.map((r, i) => {
        const w = (Math.abs(r.contribution) / max) * 50
        const neg = r.contribution < 0
        return (
          <div key={r.key}>
            <div
              className="mwm-row"
              style={{ justifyContent: 'space-between', gap: '1rem', marginBottom: '0.4rem' }}
            >
              <span className="mwm-note" style={{ color: 'var(--fg)' }}>
                {r.label}
                {!r.verified ? <span className="mwm-tiny"> · no figure, held flat</span> : null}
              </span>
              <span className="mwm-tabular" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                {r.contribution >= 0 ? '+' : ''}
                {r.contribution.toFixed(1)}%
              </span>
            </div>
            <div style={{ position: 'relative', height: 22 }}>
              <div
                style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--edge)' }}
              />
              <motion.div
                style={{
                  position: 'absolute',
                  top: 3,
                  bottom: 3,
                  background: neg ? CHART_COLOR[r.key] : 'var(--pos)',
                  borderRadius: 4,
                  ...(neg ? { right: '50%' } : { left: '50%' }),
                }}
                initial={reduce ? false : { width: 0 }}
                animate={inView || reduce ? { width: `${w}%` } : undefined}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * The reachable pool, month by month, under whatever stress is dialled in.
 * A bar per month. The month the pool cannot cover is where the bars stop.
 */
export function TimelineChart({
  timeline,
  breakMonth,
  monthlySpendUsd,
}: {
  timeline: { month: number; poolUsd: number }[]
  breakMonth: number | null
  monthlySpendUsd: number
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })

  const shown = timeline.slice(0, 37)
  const max = Math.max(1, ...shown.map((p) => p.poolUsd), monthlySpendUsd)
  const compact = (v: number) =>
    v >= 10000 ? `$${(v / 1000).toFixed(0)}k` : v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`

  return (
    <div ref={ref}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 150 }}>
        {shown.map((p, i) => {
          const broken = breakMonth !== null && p.month > breakMonth
          return (
            <motion.div
              key={p.month}
              title={`Month ${p.month}: ${compact(p.poolUsd)} in reach`}
              style={{
                flex: 1,
                minWidth: 0,
                borderRadius: 3,
                background: broken ? 'var(--surface-2)' : p.month === breakMonth ? 'var(--accent)' : 'var(--c-globalBonds)',
                border: p.month === breakMonth ? '1px solid var(--accent)' : '1px solid transparent',
              }}
              initial={reduce ? false : { height: 0 }}
              animate={
                inView || reduce
                  ? { height: `${Math.max(broken ? 2 : 3, (p.poolUsd / max) * 100)}%` }
                  : undefined
              }
              transition={{ duration: 0.5, delay: i * 0.015, ease: [0.2, 0.8, 0.2, 1] }}
            />
          )
        })}
      </div>
      <div className="mwm-row" style={{ justifyContent: 'space-between', marginTop: '0.5rem' }}>
        <span className="mwm-tiny">now</span>
        {breakMonth !== null ? (
          <span className="mwm-tiny mwm-accent">the red bar is month {breakMonth}, the last you cover in full</span>
        ) : (
          <span className="mwm-tiny">{shown.length - 1} months out, still standing</span>
        )}
        <span className="mwm-tiny">month {shown[shown.length - 1]?.month ?? 0}</span>
      </div>
    </div>
  )
}

export function MonthsStrip({ months, target, totalMonths }: { months: number; target: number; totalMonths: number }) {
  const reduce = useReducedMotion()
  const span = Math.max(target + 2, Math.ceil(totalMonths) + 1, 6)
  const cells = Array.from({ length: Math.min(span, 24) }, (_, i) => i)

  return (
    <div>
      <div style={{ display: 'flex', gap: 4 }}>
        {cells.map((i) => {
          const reachable = i < Math.floor(months)
          const owned = i < Math.floor(totalMonths)
          return (
            <motion.div
              key={i}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 5,
                background: reachable ? 'var(--accent)' : owned ? 'var(--accent-soft)' : 'var(--surface-2)',
                border: i === target - 1 ? '2px dashed var(--fg)' : '2px solid transparent',
              }}
              initial={reduce ? false : { opacity: 0, scaleY: 0.3 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.35, delay: i * 0.025 }}
            />
          )
        })}
      </div>
      <div className="mwm-row" style={{ marginTop: '0.9rem', gap: '1.3rem' }}>
        <span className="mwm-row mwm-note" style={{ gap: '0.45rem' }}>
          <Swatch color="var(--accent)" /> months you can reach
        </span>
        <span className="mwm-row mwm-note" style={{ gap: '0.45rem' }}>
          <Swatch color="var(--accent-soft)" /> months you own but cannot reach
        </span>
        <span className="mwm-note">dashed box is your target of {target}</span>
      </div>
    </div>
  )
}
