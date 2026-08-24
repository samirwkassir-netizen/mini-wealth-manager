export type AccountType =
  | 'localBank'
  | 'internationalBank'
  | 'neobank'
  | 'brokerage'
  | 'cashHand'
  | 'goldPhysical'
  | 'crypto'

export type Access = 'today' | 'days' | 'restricted'

export interface Account {
  id: string
  label: string
  type: AccountType
  currency: string
  amount: number
  access: Access
  /** Can this money be sent to another country without asking permission? */
  transferable: boolean
}

export type IncomeStability = 'none' | 'irregular' | 'recurring'

export interface Goal {
  id: string
  name: string
  amount: number
  currency: string
  /** Months from now until you need it */
  months: number
}

export interface Flows {
  incomeMonthly: number
  incomeCurrency: string
  incomeStability: IncomeStability
  spendMonthly: number
  spendCurrency: string
  /** Percent of income you intend to put to work */
  investPct: number
  goals: Goal[]
}

export type Horizon = 2 | 5 | 10 | 20
export type DrawdownReaction = 'sell' | 'hold' | 'buy'
export type Tilt = 'none' | 'moderate' | 'strong'

export interface Profile {
  horizonYears: Horizon
  drawdownReaction: DrawdownReaction
  /** US persons and US residents get the US-listed lines. Everyone else gets the Irish ones. */
  usPerson: boolean
  emTilt: Tilt
  includeProperty: boolean
}

export interface AppState {
  accounts: Account[]
  flows: Flows
  profile: Profile
  /** Instrument id chosen per asset class, overriding the default */
  picks: Record<string, string>
}

export type AssetKey =
  | 'cash'
  | 'shortGov'
  | 'globalBonds'
  | 'tips'
  | 'globalEquity'
  | 'emEquity'
  | 'property'
  | 'gold'

export type Weights = Record<AssetKey, number>

export interface Flag {
  id: string
  severity: 'critical' | 'warn' | 'note'
  title: string
  body: string
}

export interface Standing {
  totalUsd: number
  accessibleTodayUsd: number
  accessibleDaysUsd: number
  restrictedUsd: number
  /** Money you could actually get to and move abroad */
  deployableUsd: number
  nonTransferableUsd: number
  byCurrency: { code: string; usd: number; pct: number; hardness: number }[]
  byAccess: { access: Access; usd: number; pct: number }[]
  byType: { type: AccountType; usd: number; pct: number }[]
  largestAccountPct: number
  softCurrencyPct: number
  restrictedPct: number
  nonTransferablePct: number
  fragility: {
    score: number
    parts: { key: string; label: string; points: number; max: number; detail: string }[]
  }
  flags: Flag[]
}

export interface GoalResult extends Goal {
  usd: number
  monthlyNeeded: number
  bucket: 'safety' | 'short' | 'long'
}

export interface FlowResult {
  incomeUsd: number
  spendUsd: number
  surplusUsd: number
  savingsRatePct: number
  intendedInvestUsd: number
  goals: GoalResult[]
  goalsMonthlyTotal: number
  freeMonthlyUsd: number
  runwayAccessibleMonths: number
  runwayTotalMonths: number
  runwayGapMonths: number
  currencyMismatch: boolean
  flags: Flag[]
}

export type Stage = 'buildIncome' | 'buildBuffer' | 'invest'

export interface HumanCapital {
  stage: Stage
  reasons: string[]
  investableUsd: number
  /** What the model says the invested pile earns per year and per month */
  marketIncomeYearUsd: number
  marketIncomeMonthUsd: number
  /** Capital you would need for a given monthly income at the model's expected return */
  capitalFor: (monthlyUsd: number) => number
  /** Illustrative uplift used in the headline comparison */
  upliftMonthlyUsd: number
  upliftEquivalentCapitalUsd: number
  multiple: number
}

export type RiskLevel = 'Cautious' | 'Balanced' | 'Growth'

export interface RiskResult {
  level: RiskLevel
  score: number
  max: number
  parts: { label: string; points: number; max: number; detail: string }[]
  override: string | null
}

export interface Tiering {
  bufferTargetMonths: number
  safetyUsd: number
  shortGoalsUsd: number
  growthUsd: number
  investableUsd: number
  shortfallUsd: number
}

export interface PortfolioStat {
  expectedReturn: number
  volatility: number
  sharpe: number
  ter: number
  terUsdPerYear: number
}

export interface Allocation {
  weights: Weights
  stat: PortfolioStat
  rows: {
    key: AssetKey
    label: string
    plain: string
    weight: number
    usd: number
    instrumentId: string
  }[]
}
