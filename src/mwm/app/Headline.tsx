import type { ReactNode } from 'react'
import type { Analysis, AppState } from '../engine'
import { Why, months as fmtMonths, usd } from './bits'
import { freedomOf, type Freedom } from './state'
import { toUsd } from '../engine'
import { Jar } from '../../art/Jar'
import { Coins, Sprout, Umbrella } from '../../art/Icons'

export const LABEL: Record<Freedom, string> = { free: 'Free', local: 'Local', slow: 'Slow', stuck: 'Stuck' }
export const HINT: Record<Freedom, string> = {
  free: 'use it anywhere',
  local: 'only works here',
  slow: 'a bit each month',
  stuck: 'can’t get it out',
}

export function splitByFreedom(state: AppState) {
  const out: Record<Freedom, number> = { free: 0, local: 0, slow: 0, stuck: 0 }
  for (const a of state.accounts) {
    if (!(a.amount > 0)) continue
    out[freedomOf(a)] += toUsd(a.amount, a.currency)
  }
  return out
}

export function Headline({ a, state }: { a: Analysis; state: AppState }) {
  const s = a.standing
  const parts = splitByFreedom(state)
  const total = s.totalUsd
  const reach = parts.free + parts.local
  const share = total > 0 ? reach / total : 0
  const pct = Math.round(share * 100)
  const pctText = share > 0 && share < 0.005 ? 'Less than 1%' : `${pct}%`
  const order: Freedom[] = ['free', 'local', 'slow', 'stuck']
  const biggest = Math.max(...order.map((k) => parts[k]), 1)
  const showMonths = a.flow.spendUsd > 0 && total > 0

  let big: ReactNode
  if (total <= 0) big = <>Add what you have, and see how much you can really use.</>
  else if (reach <= 0) big = <>Right now, you can’t use <span className="w-accent">any</span> of it.</>
  else if (reach >= total - 0.5) big = <>You can use <span className="w-accent">all of it</span>.</>
  else if (pct >= 95) big = <>You can use <span className="w-accent">almost all of it</span>.</>
  else
    big = (
      <>
        You can really use <span className="w-accent">{usd(reach)}</span> of it.
      </>
    )

  return (
    <header className="w-headline">
      <p className="w-sr" aria-live="polite">
        {total > 0 ? `You can really use ${usd(reach)} of ${usd(total)}, ${pctText}.` : ''}
      </p>

      <div className="w-hl-text">
        <p className="w-hl-kicker">
          {total > 0 ? <>Your {usd(total)}, honestly</> : <>Your savings, honestly</>}
          <Why label="What counts?" title="Money you can really use">
            <p>
              Money you could spend tomorrow: what sits in your <b>Free</b> and <b>Local</b> jars. Slow and Stuck money is
              still yours, but a plan that counts on it breaks the first month you need it.
            </p>
            <p>
              Of this, <b>{usd(parts.free)}</b> can also leave the country. Only that part can go into an investing account
              abroad.
            </p>
          </Why>
        </p>
        <p className="w-hl-big">{big}</p>

        {total > 0 ? (
          <>
            <div className="w-meter" role="img" aria-label={`${pctText} of what you own is money you can use`}>
              <span style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct)}%` }} />
            </div>
            <p className="w-hl-line">
              <b>{pctText}</b> of what you own.
              {showMonths && a.flow.runwayTotalMonths - a.flow.runwayAccessibleMonths >= 0.5 ? (
                <>
                  {' '}
                  That covers <b>{fmtMonths(a.flow.runwayAccessibleMonths)}</b>{' '}
                  {a.flow.runwayAccessibleMonths === 1 ? 'month' : 'months'} of your spending, not {fmtMonths(a.flow.runwayTotalMonths)}.
                </>
              ) : showMonths ? (
                <>
                  {' '}
                  That covers <b>{fmtMonths(a.flow.runwayAccessibleMonths)}</b>{' '}
                  {a.flow.runwayAccessibleMonths === 1 ? 'month' : 'months'} of your spending.
                </>
              ) : null}
            </p>
          </>
        ) : (
          <p className="w-hl-line">Round numbers are fine. Nothing you type leaves this page.</p>
        )}

        {a.liquidity.dripMonthlyUsd > 0 ? (
          <p className="w-drip">
            Your Slow jar drips out about <b>{usd(a.liquidity.dripMonthlyUsd)}</b> a month
            {a.liquidity.dripDoneMonth ? <>, empty in {a.liquidity.dripDoneMonth} months</> : null}.
          </p>
        ) : null}
      </div>

      <div className="w-shelf-wrap">
        <ul className="w-shelf" aria-label={order.map((k) => `${LABEL[k]} ${usd(parts[k])}`).join(', ')}>
          {order.map((k) => (
            <li key={k} className={parts[k] > 0 ? `is-${k}` : `is-${k} is-zero`}>
              <Jar kind={k} level={parts[k] / biggest} />
              <b>{usd(parts[k])}</b>
              <span>{LABEL[k]}</span>
              <small>{HINT[k]}</small>
            </li>
          ))}
        </ul>
        <div className="w-shelf-groups" aria-hidden="true">
          <span className="is-yes">You can use</span>
          <span className="is-no">Not now</span>
        </div>
      </div>
    </header>
  )
}

export function Stage({ a, state }: { a: Analysis; state: AppState }) {
  const h = a.human
  const f = a.flow
  const t = a.tiering
  const steps = [
    { id: 'buildIncome', label: 'Earn', Icon: Coins },
    { id: 'buildBuffer', label: 'Rainy-day money', Icon: Umbrella },
    { id: 'invest', label: 'Grow it', Icon: Sprout },
  ] as const
  const at = steps.findIndex((x) => x.id === h.stage)

  let line: string
  if (a.standing.totalUsd <= 0 && f.incomeUsd <= 0) line = 'Fill in your money on the left, and your next step shows here.'
  else if (a.standing.totalUsd > 0 && f.spendUsd <= 0) line = 'Add what you spend each month, so we can size your rainy-day money.'
  else if (f.incomeUsd > 0 && f.surplusUsd < 0) line = `You spend ${usd(-f.surplusUsd)} a month more than you earn. Fix that first.`
  else if (state.flows.incomeStability === 'none') line = 'No income yet. Investing grows money you earn, so earning comes first.'
  else if (state.flows.incomeStability === 'irregular')
    line =
      t.growthUsd > 0
        ? `Your income goes up and down, so keep more for a rainy day. Hold the other ${usd(t.growthUsd)} safe until it steadies.`
        : 'Your income goes up and down. Steady it first, or one bad month forces you to sell.'
  else if (h.stage === 'buildBuffer')
    line = `${f.runwayAccessibleMonths.toFixed(1)} of ${t.bufferTargetMonths} months saved. Finish your rainy-day money, then invest.`
  else line = `Your rainy-day money is ready. ${usd(t.growthUsd)} can start growing.`

  return (
    <div className="w-stage">
      <ol className="w-stage-steps" aria-label="Your step">
        {steps.map((s, i) => (
          <li key={s.id} className={i < at ? 'is-done' : i === at ? 'is-now' : ''} aria-current={i === at ? 'step' : undefined}>
            <s.Icon size={26} />
            <span>
              <small>Step {i + 1}</small>
              {s.label}
            </span>
          </li>
        ))}
      </ol>
      <p className="w-stage-line">{line}</p>
    </div>
  )
}
