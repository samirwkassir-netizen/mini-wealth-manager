import { toUsd, type Access, type Account, type AccountType, type AppState, type BrokerAccess, type DrawdownReaction, type Horizon, type IncomeStability, type RiskLevel } from '../engine'

/**
 * The four ways a pot of money can behave. The engine thinks in two
 * questions (can you reach it, can it leave the country); people think in
 * one. Each word below answers both at once.
 */
export type Freedom = 'free' | 'local' | 'slow' | 'stuck'

export const FREEDOMS: { value: Freedom; label: string; line: string }[] = [
  { value: 'free', label: 'Free', line: 'You can take all of it out tomorrow and send it abroad.' },
  { value: 'local', label: 'Local', line: 'You can spend it here, but it cannot leave the country easily.' },
  { value: 'slow', label: 'Slow', line: 'Only some of it, or only bit by bit: limits, queues, fees.' },
  { value: 'stuck', label: 'Stuck', line: 'You can see the balance. You cannot get the money.' },
]

export function freedomOf(a: Pick<Account, 'access' | 'transferable'>): Freedom {
  if (a.access === 'restricted') return 'stuck'
  if (a.access === 'days') return 'slow'
  return a.transferable ? 'free' : 'local'
}

export function withFreedom(a: Account, f: Freedom): Account {
  const map: Record<Freedom, { access: Access; transferable: boolean }> = {
    free: { access: 'today', transferable: true },
    local: { access: 'today', transferable: false },
    slow: { access: 'days', transferable: false },
    stuck: { access: 'restricted', transferable: false },
  }
  return { ...a, ...map[f], monthlyCap: f === 'slow' ? a.monthlyCap : null }
}

export const POT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'localBank', label: 'Bank at home' },
  { value: 'internationalBank', label: 'Bank abroad' },
  { value: 'neobank', label: 'Wise, Revolut…' },
  { value: 'brokerage', label: 'Investment account' },
  { value: 'cashHand', label: 'Cash' },
  { value: 'goldPhysical', label: 'Gold' },
  { value: 'crypto', label: 'Crypto' },
]

let seq = 0
export const newPot = (o: Partial<Account> = {}): Account => ({
  id: `p${Date.now().toString(36)}${(seq++).toString(36)}`,
  label: '',
  type: 'localBank',
  currency: 'USD',
  amount: 0,
  access: 'today',
  transferable: true,
  ...o,
})

/** Everything the screen needs beyond the engine's own state. */
export interface Ui {
  level: RiskLevel | null
}

const flows = (income: number, spend: number, stability: IncomeStability = 'recurring') => ({
  incomeMonthly: income,
  incomeCurrency: 'USD',
  incomeStability: stability,
  spendMonthly: spend,
  spendCurrency: 'USD',
  investPct: income > 0 ? Math.max(0, ((income - spend) / income) * 100) : 0,
  goals: [],
})

const profile = (horizonYears: Horizon = 10, drawdownReaction: DrawdownReaction = 'hold') => ({
  horizonYears,
  drawdownReaction,
  usPerson: false,
  emTilt: 'moderate' as const,
  includeProperty: true,
  brokerAccess: 'could' as const,
})

/**
 * Two people, same seven thousand dollars, same salary, same spending.
 * Invented, round, and chosen so the difference is the only variable.
 */
export const PRESETS: { id: string; name: string; line: string; state: AppState }[] = [
  {
    id: 'stuck',
    name: 'Held at home',
    line: 'Most of it in a local bank that rations withdrawals.',
    state: {
      accounts: [
        withFreedom(newPot({ id: 'a1', type: 'localBank', amount: 5000 }), 'stuck'),
        withFreedom(newPot({ id: 'a2', type: 'localBank', amount: 1020, monthlyCap: 300 }), 'slow'),
        withFreedom(newPot({ id: 'a3', type: 'neobank', amount: 980 }), 'free'),
      ],
      flows: flows(1200, 700),
      profile: profile(),
      picks: {},
    },
  },
  {
    id: 'free',
    name: 'Held where it moves',
    line: 'The same amount, in places that let it go.',
    state: {
      accounts: [
        withFreedom(newPot({ id: 'b1', type: 'neobank', amount: 3000 }), 'free'),
        withFreedom(newPot({ id: 'b2', type: 'internationalBank', amount: 4000 }), 'free'),
      ],
      flows: flows(1200, 700),
      profile: profile(),
      picks: {},
    },
  },
]

export const BLANK: AppState = {
  accounts: [newPot({ id: 'n1' })],
  flows: flows(0, 0),
  profile: profile(),
  picks: {},
}

/** Keep the investing share in step with what is actually left each month. */
export function syncInvestPct(s: AppState): AppState {
  const i = toUsd(s.flows.incomeMonthly || 0, s.flows.incomeCurrency)
  const o = toUsd(s.flows.spendMonthly || 0, s.flows.spendCurrency)
  const investPct = i > 0 ? Math.max(0, Math.min(100, ((i - o) / i) * 100)) : 0
  return investPct === s.flows.investPct ? s : { ...s, flows: { ...s.flows, investPct } }
}

/* ---------- share links: the state lives in the hash, never on a server ---------- */

type Packed = {
  a: [AccountType, string, number, Freedom, number?][]
  f: [number, string, IncomeStability, number, string]
  p: [Horizon, DrawdownReaction, 0 | 1, BrokerAccess?]
  l?: RiskLevel
}

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))

export function encodeState(s: AppState, ui: Ui): string {
  const packed: Packed = {
    a: s.accounts
      .filter((x) => x.amount > 0)
      .map((x) => (x.monthlyCap ? [x.type, x.currency, x.amount, freedomOf(x), x.monthlyCap] : [x.type, x.currency, x.amount, freedomOf(x)])),
    f: [s.flows.incomeMonthly, s.flows.incomeCurrency, s.flows.incomeStability, s.flows.spendMonthly, s.flows.spendCurrency],
    p: [s.profile.horizonYears, s.profile.drawdownReaction, s.profile.usPerson ? 1 : 0, s.profile.brokerAccess],
  }
  if (ui.level) packed.l = ui.level
  return b64(JSON.stringify(packed))
}

export function decodeState(hash: string): { state: AppState; ui: Ui } | null {
  try {
    const raw = hash.replace(/^#/, '')
    const m = raw.match(/(?:^|&)s=([^&]+)/)
    if (!m) return null
    const p = JSON.parse(unb64(m[1])) as Packed
    const accounts = p.a.map(([type, currency, amount, fr, cap], i) =>
      withFreedom(
        newPot({ id: `h${i}`, type, currency, amount: Math.max(0, Number(amount) || 0), monthlyCap: cap ? Math.max(0, Number(cap) || 0) : null }),
        fr,
      ),
    )
    const [income, incomeCurrency, incomeStability, spend, spendCurrency] = p.f
    const state: AppState = syncInvestPct({
      accounts: accounts.length ? accounts : [newPot({ id: 'h0' })],
      flows: { ...flows(Number(income) || 0, Number(spend) || 0, incomeStability), incomeCurrency, spendCurrency },
      profile: { ...profile(p.p[0], p.p[1]), usPerson: p.p[2] === 1, brokerAccess: p.p[3] ?? 'could' },
      picks: {},
    })
    return { state, ui: { level: p.l ?? null } }
  } catch {
    return null
  }
}
