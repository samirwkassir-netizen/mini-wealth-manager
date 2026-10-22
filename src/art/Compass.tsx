/**
 * A drawn compass. The needle points at `heading` degrees (0 is north) and
 * turns there smoothly; with `wander` it drifts gently as if looking for
 * north, which is how it sits on the homepage and the COMPASS start screen.
 */
export function Compass({
  heading = 32,
  wander = false,
  className,
  tone = 'light',
}: {
  heading?: number
  wander?: boolean
  className?: string
  /** 'dark' draws it for an ink background. */
  tone?: 'light' | 'dark'
}) {
  const ink = tone === 'dark' ? '#FAFAF7' : '#0F0F0F'
  const face = tone === 'dark' ? '#1C1A19' : '#FAFAF7'
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5)

  return (
    <svg viewBox="0 -10 220 236" className={['compass-art', className].filter(Boolean).join(' ')} aria-hidden="true">
      {/* the case */}
      <circle cx="110" cy="114" r="100" fill="#0F0F0F" opacity="0.08" />
      <circle cx="110" cy="110" r="100" fill="#7A1F2A" />
      <circle cx="110" cy="110" r="88" fill={face} stroke={ink} strokeWidth="2.5" />
      <circle cx="110" cy="110" r="72" fill="none" stroke={ink} strokeOpacity="0.18" strokeWidth="1.2" />

      {ticks.map((d) => {
        const long = d % 45 === 0
        const mid = d % 15 === 0
        const r1 = 86
        const r2 = long ? 74 : mid ? 79 : 82
        const a = ((d - 90) * Math.PI) / 180
        return (
          <line
            key={d}
            x1={110 + r1 * Math.cos(a)}
            y1={110 + r1 * Math.sin(a)}
            x2={110 + r2 * Math.cos(a)}
            y2={110 + r2 * Math.sin(a)}
            stroke={ink}
            strokeOpacity={long ? 0.9 : 0.4}
            strokeWidth={long ? 2 : 1}
          />
        )
      })}

      <g fontFamily="'EB Garamond', Georgia, serif" fontSize="22" fontWeight="500" textAnchor="middle" fill={ink}>
        <text x="110" y="58">N</text>
        <text x="166" y="118">E</text>
        <text x="110" y="177">S</text>
        <text x="54" y="118">W</text>
      </g>

      {/* the star under the needle */}
      <path
        d="M110 66 L118 102 L154 110 L118 118 L110 154 L102 118 L66 110 L102 102 Z"
        fill={ink}
        opacity="0.07"
      />

      <g className="compass-needle" style={{ transform: `rotate(${heading}deg)` }}>
        <g className={wander ? 'compass-wander' : undefined}>
          <path d="M110 40 L121 110 L99 110 Z" fill="#7A1F2A" />
          <path d="M110 180 L121 110 L99 110 Z" fill={ink} />
          <path d="M110 40 L110 110 L99 110 Z" fill="#0F0F0F" opacity="0.18" />
        </g>
      </g>
      <circle cx="110" cy="110" r="8" fill={face} stroke={ink} strokeWidth="2.5" />
      <circle cx="110" cy="110" r="2.5" fill="#7A1F2A" />

      {/* the ring you hold it by */}
      <circle cx="110" cy="1" r="8" fill="none" stroke="#7A1F2A" strokeWidth="4" />
    </svg>
  )
}
