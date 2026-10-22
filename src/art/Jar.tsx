import { useId } from 'react'

/**
 * A glass jar of money. One per kind of money in the Mini Wealth Manager:
 * free (lid off), local (a pin on the label: only works here), slow (a tap
 * that drips) and stuck (a padlock). `level` is how full it is, 0 to 1.
 *
 * Renders as plain SVG, so it works server-side on the homepage and
 * hydrated inside the tool. The liquid rises with a CSS transition; the
 * surface ripples unless the reader prefers reduced motion (see art.css).
 */
export type JarKind = 'free' | 'local' | 'slow' | 'stuck'

export const JAR_COLOR: Record<JarKind, string> = {
  free: '#7A1F2A',
  local: '#A9545E',
  slow: '#D29AA1',
  stuck: '#A39E96',
}

const BODY =
  'M36 34 C36 42 18 44 18 60 V136 Q18 150 32 150 H88 Q102 150 102 136 V60 C102 44 84 42 84 34 Z'

// Liquid travels from the bottom (148) to just under the shoulder (52).
const TOP = 52
const BOTTOM = 148

export function Jar({
  kind,
  level,
  className,
  title,
}: {
  kind: JarKind
  level: number
  className?: string
  /** Accessible name. Leave empty when the jar is decorative. */
  title?: string
}) {
  const id = useId().replace(/:/g, '')
  const l = Math.max(0, Math.min(1, Number.isFinite(level) ? level : 0))
  // A jar with anything in it shows at least a thin layer, so small pots stay visible.
  const shown = l > 0 ? Math.max(l, 0.06) : 0
  const drop = (1 - shown) * (BOTTOM - TOP + 6)
  const color = JAR_COLOR[kind]

  return (
    <svg
      viewBox="0 0 120 162"
      className={['jar', `jar--${kind}`, className].filter(Boolean).join(' ')}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ ['--jar-drop' as string]: `${drop}px` }}
    >
      <defs>
        <clipPath id={`jc-${id}`}>
          <path d={BODY} />
        </clipPath>
        {kind === 'slow' ? (
          <pattern id={`jp-${id}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill={color} />
            <rect width="3" height="8" fill="#fff" opacity="0.28" />
          </pattern>
        ) : null}
      </defs>

      {/* shadow on the table */}
      <ellipse cx="60" cy="154" rx="44" ry="5" fill="#0F0F0F" opacity="0.08" />

      {/* glass */}
      <path d={BODY} fill="#FFFFFF" opacity="0.7" />

      {/* liquid */}
      <g clipPath={`url(#jc-${id})`}>
        <g className="jar-liquid">
          <path
            className="jar-wave"
            d={`M0 ${TOP} q15 -6 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V170 H0 Z`}
            fill={kind === 'slow' ? `url(#jp-${id})` : color}
          />
          <path
            className="jar-wave jar-wave--back"
            d={`M0 ${TOP + 3} q15 5 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V170 H0 Z`}
            fill={color}
            opacity="0.35"
          />
          {/* coins resting at the bottom */}
          <g fill="none" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.6">
            <ellipse cx="44" cy="138" rx="9" ry="3.6" />
            <ellipse cx="62" cy="141" rx="9" ry="3.6" />
            <ellipse cx="80" cy="137" rx="9" ry="3.6" />
            <ellipse cx="53" cy="132" rx="9" ry="3.6" />
            <ellipse cx="72" cy="131" rx="9" ry="3.6" />
          </g>
        </g>
      </g>

      {/* glass outline and shine */}
      <path d={BODY} fill="none" stroke="#0F0F0F" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M29 68 V124" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
      <path d="M29 132 V136" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.85" />

      {/* neck */}
      <rect x="34" y="26" width="52" height="10" rx="2" fill="#FAFAF7" stroke="#0F0F0F" strokeWidth="2.4" />

      {/* lid */}
      {kind === 'free' ? (
        <g className="jar-lid jar-lid--off">
          <rect x="30" y="4" width="60" height="15" rx="4" fill="#0F0F0F" />
          <path d="M38 8 V15 M46 8 V15 M54 8 V15 M62 8 V15 M70 8 V15 M78 8 V15" stroke="#FAFAF7" strokeOpacity="0.35" strokeWidth="1.4" />
        </g>
      ) : (
        <g className="jar-lid">
          <rect x="30" y="13" width="60" height="15" rx="4" fill="#0F0F0F" />
          <path d="M38 17 V24 M46 17 V24 M54 17 V24 M62 17 V24 M70 17 V24 M78 17 V24" stroke="#FAFAF7" strokeOpacity="0.35" strokeWidth="1.4" />
        </g>
      )}

      {kind === 'local' ? (
        <g className="jar-label">
          <rect x="38" y="76" width="44" height="34" rx="4" fill="#FAFAF7" stroke="#0F0F0F" strokeWidth="2" />
          {/* a map pin: this money only works here */}
          <path
            d="M60 82 c-6 0 -10 4.4 -10 9.6 c0 7 10 13.4 10 13.4 s10 -6.4 10 -13.4 c0 -5.2 -4 -9.6 -10 -9.6 z"
            fill="#7A1F2A"
          />
          <circle cx="60" cy="91.6" r="3.4" fill="#FAFAF7" />
        </g>
      ) : null}

      {kind === 'slow' ? (
        <g className="jar-tap">
          <path d="M101 124 H112 Q116 124 116 128 V132" fill="none" stroke="#0F0F0F" strokeWidth="4" strokeLinecap="round" />
          <rect x="107" y="118" width="6" height="5" rx="1" fill="#0F0F0F" />
          <path className="jar-drip" d="M116 137 c-2 3 -3 4.6 -3 6 a3 3 0 0 0 6 0 c0 -1.4 -1 -3 -3 -6 z" fill={JAR_COLOR.free} />
        </g>
      ) : null}

      {kind === 'stuck' ? (
        <g className="jar-lock">
          <path d="M51 36 V30 a9 9 0 0 1 18 0 V36" fill="none" stroke="#0F0F0F" strokeWidth="4" />
          <rect x="45" y="34" width="30" height="24" rx="4" fill="#0F0F0F" />
          <circle cx="60" cy="44" r="3" fill="#FAFAF7" />
          <rect x="58.6" y="45" width="2.8" height="7" rx="1.2" fill="#FAFAF7" />
        </g>
      ) : null}
    </svg>
  )
}
