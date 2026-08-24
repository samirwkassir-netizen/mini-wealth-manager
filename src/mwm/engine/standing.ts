import type { Account, AccountType, Access, Flag, Standing } from './types'
import { hardness, toUsd, fmtUsd } from './fx'

export const ACCOUNT_TYPES: { value: AccountType; label: string; hint: string }[] = [
  { value: 'localBank', label: 'A bank in the country I live in', hint: 'Your normal, everyday bank' },
  { value: 'internationalBank', label: 'A bank in another country', hint: 'An account you hold abroad' },
  { value: 'neobank', label: 'Wise, Revolut or something like it', hint: 'An app-based account, usually multi-currency' },
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
      label: 'Money you cannot reach',
      points: Math.round(pRestricted),
      max: 25,
      detail: `${restrictedPct.toFixed(0)}% of what you hold is money you told us you cannot get at, and a further ${(share(accessibleDaysUsd) * 100).toFixed(0)}% comes with limits or delays.`,
    },
    {
      key: 'transfer',
      label: 'Money that cannot leave',
      points: Math.round(pTransfer),
      max: 25,
      detail: `${nonTransferablePct.toFixed(0)}% of what you hold cannot be sent to another country. That is the difference between owning money and having permission to use it.`,
    },
    {
      key: 'concentration',
      label: 'Everything in one place',
      points: Math.round(pConcentration),
      max: 25,
      detail: `Your largest single account holds ${largestAccountPct.toFixed(0)}% of your money. Below 40% this scores nothing.`,
    },
    {
      key: 'currency',
      label: 'Currency that can reprice',
      points: Math.round(pCurrency),
      max: 25,
      detail: `Weighted by how much you hold in each, ${softCurrencyPct.toFixed(0)}% of your money sits in currencies that have moved sharply against the dollar or are held at an official rate.`,
    },
  ]

  const flags: Flag[] = []

  if (restrictedUsd > 0) {
    flags.push({
      id: 'restricted',
      severity: 'critical',
      title: 'Your plan runs on the smaller number',
      body: `You hold ${fmtUsd(totalUsd)} in total and ${fmtUsd(accessibleTodayUsd)} you could actually reach tomorrow. Every recommendation below is built on ${fmtUsd(accessibleTodayUsd)}. The rest is not ignored, it is just not something you can plan around until it moves.`,
    })
  }

  if (nonTransferableUsd > 0 && nonTransferablePct > 20) {
    flags.push({
      id: 'transfer',
      severity: 'warn',
      title: 'Some of this cannot cross a border',
      body: `${fmtUsd(nonTransferableUsd)} sits somewhere it cannot leave. If your plan needs a foreign brokerage account, that money is not the money that funds it.`,
    })
  }

  if (largestAccountPct > 70 && rows.length > 0) {
    flags.push({
      id: 'concentration',
      severity: 'warn',
      title: 'One account holds almost everything',
      body: `${largestAccountPct.toFixed(0)}% of your money is in a single place. Splitting it across two institutions costs you nothing and removes a single point of failure. This is the cheapest improvement available to you.`,
    })
  }

  const softest = byCurrency.find((c) => c.hardness >= 0.8 && c.pct > 25)
  if (softest) {
    flags.push({
      id: 'currency',
      severity: 'warn',
      title: `${softest.pct.toFixed(0)}% of your money is in ${softest.code}`,
      body: `Most portfolio tools treat your bank balance as the safe asset and measure everything else against it. If your balance is in a currency that has repriced before, that assumption is doing a lot of quiet work.`,
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
