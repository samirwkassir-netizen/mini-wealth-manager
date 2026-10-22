import type { Account, AccountType, Access, Flag, Standing } from './types'
import { hardness, toUsd, fmtUsd } from './fx'

export const ACCOUNT_TYPES: { value: AccountType; label: string; hint: string }[] = [
  { value: 'localBank', label: 'A bank in the country I live in', hint: 'Your normal, everyday bank' },
  { value: 'internationalBank', label: 'A bank in another country', hint: 'An account you hold abroad' },
  { value: 'neobank', label: 'Wise, Revolut or something like it', hint: 'An account in an app, often in several currencies' },
  { value: 'brokerage', label: 'An investment account', hint: 'Where you already hold shares or funds' },
  { value: 'cashHand', label: 'Cash at home', hint: 'Physical notes, in a drawer or a safe' },
  { value: 'goldPhysical', label: 'Gold you can hold', hint: 'Coins or bars' },
  { value: 'crypto', label: 'Crypto', hint: 'On an exchange or in a wallet' },
]

export const ACCESS_OPTIONS: { value: Access; label: string; hint: string }[] = [
  { value: 'today', label: 'All of it, tomorrow morning', hint: 'You could walk in, or tap the app, and take the whole amount out' },
  { value: 'days', label: 'Only some of it, or only slowly', hint: 'There is a weekly limit, a waiting period, a fee, or a queue' },
  { value: 'restricted', label: 'Almost none of it', hint: 'You can see the balance on the screen but you cannot get at the money' },
]

export function accountTypeLabel(t: AccountType): string {
  return ACCOUNT_TYPES.find((x) => x.value === t)?.label ?? t
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

export function computeStanding(accounts: Account[]): Standing {
  const rows = accounts
    .filter((a) => Number.isFinite(a.amount) && a.amount > 0)
    .map((a) => ({ ...a, usd: toUsd(a.amount, a.currency) }))

  const totalUsd = rows.reduce((s, a) => s + a.usd, 0)
  const share = (usd: number) => (totalUsd > 0 ? usd / totalUsd : 0)

  const sumWhere = (fn: (a: (typeof rows)[number]) => boolean) =>
    rows.filter(fn).reduce((s, a) => s + a.usd, 0)

  const accessibleTodayUsd = sumWhere((a) => a.access === 'today')
  const accessibleDaysUsd = sumWhere((a) => a.access === 'days')
  const restrictedUsd = sumWhere((a) => a.access === 'restricted')
  const nonTransferableUsd = sumWhere((a) => !a.transferable)
  const deployableUsd = sumWhere((a) => a.access === 'today' && a.transferable)

  const currencyMap = new Map<string, number>()
  for (const a of rows) currencyMap.set(a.currency, (currencyMap.get(a.currency) ?? 0) + a.usd)
  const byCurrency = [...currencyMap.entries()]
    .map(([code, usd]) => ({ code, usd, pct: share(usd) * 100, hardness: hardness(code) }))
    .sort((a, b) => b.usd - a.usd)

  const typeMap = new Map<AccountType, number>()
  for (const a of rows) typeMap.set(a.type, (typeMap.get(a.type) ?? 0) + a.usd)
  const byType = [...typeMap.entries()]
    .map(([type, usd]) => ({ type, usd, pct: share(usd) * 100 }))
    .sort((a, b) => b.usd - a.usd)

  const byAccess: Standing['byAccess'] = (['today', 'days', 'restricted'] as Access[]).map((access) => {
    const usd = sumWhere((a) => a.access === access)
    return { access, usd, pct: share(usd) * 100 }
  })

  const largestAccountPct = rows.length ? Math.max(...rows.map((a) => share(a.usd))) * 100 : 0
  const softCurrencyPct = byCurrency.reduce((s, c) => s + c.pct * c.hardness, 0)
  const restrictedPct = share(restrictedUsd) * 100
  const nonTransferablePct = share(nonTransferableUsd) * 100

  // Four things that make money less yours than the balance suggests.
  // Each is worth up to 25 points. Every input here was declared by you,
  // not assumed by this tool about your country.
  const pRestricted = clamp01(restrictedPct / 100 + share(accessibleDaysUsd) * 0.4) * 25
  const pTransfer = clamp01(nonTransferablePct / 100) * 25
  const pConcentration = clamp01((largestAccountPct / 100 - 0.4) / 0.6) * 25
  const pCurrency = clamp01(softCurrencyPct / 100) * 25

  const score = Math.round(pRestricted + pTransfer + pConcentration + pCurrency)

  const parts = [
    {
      key: 'restricted',
      label: 'Money that is stuck or slow',
      points: Math.round(pRestricted),
      max: 25,
      detail: `${restrictedPct.toFixed(0)}% of what you have is money you told us you cannot get out, and another ${(share(accessibleDaysUsd) * 100).toFixed(0)}% comes out only slowly or with limits.`,
    },
    {
      key: 'transfer',
      label: 'Money that cannot leave the country',
      points: Math.round(pTransfer),
      max: 25,
      detail: `${nonTransferablePct.toFixed(0)}% of what you have cannot be sent to another country. Owning money is not the same as being allowed to use it.`,
    },
    {
      key: 'concentration',
      label: 'Everything in one place',
      points: Math.round(pConcentration),
      max: 25,
      detail: `Your biggest account holds ${largestAccountPct.toFixed(0)}% of your money. Below 40%, this adds no points.`,
    },
    {
      key: 'currency',
      label: 'Currency that can suddenly lose value',
      points: Math.round(pCurrency),
      max: 25,
      detail: `Based on how much you hold in each, ${softCurrencyPct.toFixed(0)}% of your money is in currencies that have moved sharply against the dollar or are priced at an official rate.`,
    },
  ]

  const flags: Flag[] = []

  if (restrictedUsd > 0) {
    flags.push({
      id: 'restricted',
      severity: 'critical',
      title: 'Your plan is built on the smaller number',
      body: `You have ${fmtUsd(totalUsd)}, and you can really use ${fmtUsd(accessibleTodayUsd)} of it. Everything this tool suggests is built on ${fmtUsd(accessibleTodayUsd)}. The rest is not forgotten, but you cannot plan around it until you can get it out.`,
    })
  }

  if (nonTransferableUsd > 0 && nonTransferablePct > 20) {
    flags.push({
      id: 'transfer',
      severity: 'warn',
      title: 'Some of this cannot leave the country',
      body: `${fmtUsd(nonTransferableUsd)} is held where it cannot leave the country. If your plan needs an investing account abroad, this money cannot pay for it.`,
    })
  }

  if (largestAccountPct > 70 && rows.length > 0) {
    flags.push({
      id: 'concentration',
      severity: 'warn',
      title: 'One account holds almost everything',
      body: `${largestAccountPct.toFixed(0)}% of your money is in one place. Splitting it between two banks or apps costs nothing and means one problem cannot hit all of it. It is the cheapest fix you have.`,
    })
  }

  const softest = byCurrency.find((c) => c.hardness >= 0.8 && c.pct > 25)
  if (softest) {
    flags.push({
      id: 'currency',
      severity: 'warn',
      title: `${softest.pct.toFixed(0)}% of your money is in ${softest.code}`,
      body: `Most money tools treat your bank balance as the safe part and compare everything else to it. If that balance is in a currency that has suddenly lost value before, it may not be as safe as it looks.`,
    })
  }

  if (rows.length === 0) {
    flags.push({
      id: 'empty',
      severity: 'note',
      title: 'Nothing entered yet',
      body: 'Add at least one account. It does not have to be exact. Round numbers are fine and nothing you type leaves your browser.',
    })
  }

  return {
    totalUsd,
    accessibleTodayUsd,
    accessibleDaysUsd,
    restrictedUsd,
    deployableUsd,
    nonTransferableUsd,
    byCurrency,
    byAccess,
    byType,
    largestAccountPct,
    softCurrencyPct,
    restrictedPct,
    nonTransferablePct,
    fragility: { score, parts },
    flags,
  }
}
