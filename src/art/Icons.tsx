/**
 * Small hand-drawn pictures for the tools: ink outlines with an oxblood
 * accent, all on a 48 by 48 grid so they line up. Decorative by default.
 */
import type { ReactNode } from 'react'

const INK = '#0F0F0F'
const OX = '#7A1F2A'
const BLUSH = '#E9D3D1'

function Pic({ children, className, size = 48 }: { children: ReactNode; className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={['pic', className].filter(Boolean).join(' ')}
      aria-hidden="true"
      fill="none"
      stroke={INK}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

type P = { className?: string; size?: number }

/** Rainy-day money. */
export const Umbrella = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <path d="M7 23 C9 13 16 8 24 8 C32 8 39 13 41 23 C38 20.5 35 20.5 32.5 23 C30 20.5 26.5 20.5 24 23 C21.5 20.5 18 20.5 15.5 23 C13 20.5 10 20.5 7 23 Z" fill={OX} />
    <path d="M24 23 V37 a4 4 0 0 1 -8 0" />
    <path d="M12 6 l-1.5 3 M36 6 l1.5 3 M24 3 v2.5" stroke={OX} />
  </Pic>
)

/** Growing it: investing. */
export const Sprout = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <path d="M24 40 V22" />
    <path d="M24 26 C24 18 18 13 10 13 C10 21 16 26 24 26 Z" fill={OX} />
    <path d="M24 22 C24 15 29 10 37 10 C37 17 32 22 24 22 Z" fill="#FAFAF7" />
    <path d="M14 40 H34" />
  </Pic>
)

/** Bad times: a storm cloud. */
export const Storm = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <path d="M14 29 a7 7 0 0 1 1 -14 a10 10 0 0 1 19 3 a6 6 0 0 1 0 11 Z" fill="#FAFAF7" />
    <path d="M25 29 L21 36 H26 L23 43" stroke={OX} strokeWidth="2.6" />
  </Pic>
)

/** Invest in you: a graduation cap. */
export const Cap = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <path d="M4 19 L24 10 L44 19 L24 28 Z" fill={OX} />
    <path d="M13 23 V32 C13 35 18 37 24 37 C30 37 35 35 35 32 V23" fill="#FAFAF7" />
    <path d="M40 21 V31" />
    <circle cx="40" cy="33" r="1.8" fill={INK} />
  </Pic>
)

/** A backpack, for high school students. */
export const Backpack = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <path d="M18 12 V9 a3 3 0 0 1 3 -3 h6 a3 3 0 0 1 3 3 V12" />
    <rect x="11" y="12" width="26" height="30" rx="7" fill={OX} />
    <rect x="16" y="27" width="16" height="10" rx="2.5" fill="#FAFAF7" />
    <path d="M16 31 H32" />
  </Pic>
)

/** A briefcase, for university students thinking about work. */
export const Briefcase = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <path d="M18 15 V11 a2 2 0 0 1 2 -2 h8 a2 2 0 0 1 2 2 V15" />
    <rect x="7" y="15" width="34" height="24" rx="4" fill={OX} />
    <path d="M7 25 H41" stroke="#FAFAF7" />
    <rect x="21" y="22.5" width="6" height="5" rx="1" fill="#FAFAF7" />
  </Pic>
)

/** A globe, for countries. */
export const Globe = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="24" r="16" fill={BLUSH} />
    <path d="M8 24 H40 M24 8 C18 13 18 35 24 40 C30 35 30 13 24 8" />
    <path d="M12 15 C18 17 30 17 36 15 M12 33 C18 31 30 31 36 33" stroke={OX} />
  </Pic>
)

/** Coins, for money and aid. */
export const Coins = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <ellipse cx="20" cy="33" rx="10" ry="4" fill="#FAFAF7" />
    <path d="M10 33 V37 C10 39 14.5 41 20 41 C25.5 41 30 39 30 37 V33" fill="#FAFAF7" />
    <ellipse cx="29" cy="17" rx="10" ry="4" fill={OX} />
    <path d="M19 17 V25 C19 27 23.5 29 29 29 C34.5 29 39 27 39 25 V17" fill={OX} />
    <path d="M19 21 C19 23 23.5 25 29 25 C34.5 25 39 23 39 21" stroke="#FAFAF7" strokeOpacity="0.6" />
  </Pic>
)

/** A calendar page, for deadlines. */
export const Calendar = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <rect x="9" y="11" width="30" height="29" rx="4" fill="#FAFAF7" />
    <path d="M9 19 H39" />
    <rect x="9" y="11" width="30" height="8" rx="3" fill={OX} stroke="none" />
    <path d="M16 7 V14 M32 7 V14" />
    <circle cx="18" cy="27" r="1.6" fill={INK} stroke="none" />
    <circle cx="24" cy="27" r="1.6" fill={INK} stroke="none" />
    <circle cx="30" cy="27" r="3.6" fill={OX} stroke="none" />
    <circle cx="18" cy="33" r="1.6" fill={INK} stroke="none" />
    <circle cx="24" cy="33" r="1.6" fill={INK} stroke="none" />
  </Pic>
)

/** Two people, for mentors and professors. */
export const People = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <circle cx="18" cy="17" r="5" fill="#FAFAF7" />
    <path d="M8 38 C8 30 12 26 18 26 C24 26 28 30 28 38 Z" fill="#FAFAF7" />
    <circle cx="31" cy="15" r="5" fill={OX} />
    <path d="M24 26 C25.5 25 28 24 31 24 C37 24 41 28 41 36 H29" fill={OX} />
  </Pic>
)

/** A certificate with a ribbon. */
export const Certificate = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <rect x="6" y="10" width="30" height="22" rx="2" fill="#FAFAF7" />
    <path d="M11 17 H28 M11 22 H24" />
    <circle cx="34" cy="31" r="6" fill={OX} />
    <path d="M30.5 36 L29 44 L34 41.5 L39 44 L37.5 36" fill={OX} />
  </Pic>
)

/** A heart and a coin on a scale, for priorities. */
export const Scale = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <path d="M24 8 V40 M16 40 H32 M9 14 H39" />
    <path d="M9 14 L4 26 H14 Z" fill="#FAFAF7" />
    <path d="M39 14 L34 26 H44 Z" fill="#FAFAF7" />
    <path d="M9 31 c-3 -2.2 -5 -4 -5 -6 a2.6 2.6 0 0 1 5 -1 a2.6 2.6 0 0 1 5 1 c0 2 -2 3.8 -5 6 z" fill={OX} stroke="none" transform="translate(0 -6)" />
    <circle cx="39" cy="21" r="3.2" fill={OX} stroke="none" />
  </Pic>
)

/** A rocket, for building something of your own. */
export const Rocket = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <path d="M24 5 C31 11 33 20 31 31 H17 C15 20 17 11 24 5 Z" fill="#FAFAF7" />
    <circle cx="24" cy="18" r="3.4" fill={OX} />
    <path d="M17 24 L11 31 L17 31 M31 24 L37 31 L31 31" fill={OX} />
    <path d="M20 35 L19 42 M24 35 V44 M28 35 L29 42" stroke={OX} />
  </Pic>
)

/** A small house, for "money that only works here". */
export const Pin = (p: P) => (
  <Pic {...p}>
    <circle cx="24" cy="25" r="17" fill={BLUSH} stroke="none" />
    <path d="M24 6 c-8 0 -13 5.8 -13 12.6 c0 9.4 13 20.4 13 20.4 s13 -11 13 -20.4 c0 -6.8 -5 -12.6 -13 -12.6 z" fill={OX} />
    <circle cx="24" cy="18.6" r="4.4" fill="#FAFAF7" />
    <path d="M14 42 H34" />
  </Pic>
)

/** Arrow used on cards. */
export const Arrow = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12 H19 M13 6 L19 12 L13 18" />
  </svg>
)
