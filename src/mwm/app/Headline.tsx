import type { Analysis, AppState } from '../engine'
import { Why, months as fmtMonths, usd } from './bits'
import { freedomOf, type Freedom } from './state'
import { toUsd } from '../engine'

const LABEL: Record<Freedom, string> = { free: 'Free', local: 'Local', slow: 'Slow', stuck: 'Stuck' }

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

  return (
    <header className="w-headline">
      <p className="w-sr" aria-live="polite">
        {total > 0 ? `${pctText} within reach: ${usd(reach)} of ${usd(total)}.` : ''}
      </p>
      <div className="w-headline-nums">
        <div>
          <p className="w-k">On paper</p>
          <p className="w-big">{usd(total)}</p>
        </div>
        <span className="w-headline-arrow" aria-hidden="true">
          →
        </span>
        <div>
          <p className="w-k">
            Within reach{' '}
            <Why title="Within reach">
              <p>
                Money you could use tomorrow: the Free and Local pots. Slow and Stuck money still belongs to you, but a
                plan that leans on it fails the first month you need it.
              </p>
              <p>
                Of this, <b>{usd(parts.free)}</b> can also leave the country. Only that part can fund an investment
                account abroad.
              </p>
            </Why>
          </p>
          <p className="w-big w-accent">{usd(reach)}</p>
        </div>
      </div>

      <p className="w-headline-line">
        {total <= 0 ? (
          'Add what you have on the left. Round numbers are fine.'
        ) : reach >= total - 0.5 ? (
          <>All of it is money you can use. The plan below runs on the full amount.</>
        ) : pct >= 95 ? (
          <>Almost all of it is money you can use. The plan below is built on {usd(reach)}.</>
        ) : (
          <>
            {pctText} of what you own is money you can use. The plan below is built on {usd(reach)}, not {usd(total)}.
          </>
        )}
        {a.flow.spendUsd > 0 && total > 0 && a.flow.runwayTotalMonths - a.flow.runwayAccessibleMonths >= 0.5 ? (
          <span className="w-headline-months">
            {' '}
            {fmtMonths(a.flow.runwayTotalMonths)} months of spending on paper, {fmtMonths(a.flow.runwayAccessibleMonths)} in reality.
          </span>
        ) : null}
      </p>

      <div className="w-split" role="img" aria-label={order.map((k) => `${LABEL[k]} ${usd(parts[k])}`).join(', ')}>
        {total > 0
          ? order.map((k) =>
              parts[k] > 0 ? (
                <span key={k} className={`w-split-seg w-split-seg--${k}`} style={{ flexGrow: parts[k] }} />
              ) : null,
            )
          : <span className="w-split-seg w-split-seg--empty" style={{ flexGrow: 1 }} />}
      </div>
      <ul className="w-split-legend">
        {order.map((k) => (
          <li key={k} className={parts[k] > 0 ? '' : 'is-zero'}>
            <span className={`w-dot w-dot--${k}`} aria-hidden="true" />
            {LABEL[k]} <b>{usd(parts[k])}</b>
          </li>
        ))}
      </ul>
      {a.liquidity.dripMonthlyUsd > 0 ? (
        <p className="w-drip">
          Your Slow money pays out about {usd(a.liquidity.dripMonthlyUsd)} a month
          {a.liquidity.dripDoneMonth ? <>, all of it within {a.liquidity.dripDoneMonth} months</> : null}. That arrives on
          top of what is within reach today.
        </p>
      ) : null}
    </header>
  )
}

export function Stage({ a, state }: { a: Analysis; state: AppState }) {
  const h = a.human
  const f = a.flow
  const t = a.tiering
  const steps = [
    { id: 'buildIncome', label: 'Income' },
    { id: 'buildBuffer', label: 'Safety net' },
    { id: 'invest', label: 'Invest' },
  ] as const
  const at = steps.findIndex((x) => x.id === h.stage)

  let line: string
  if (a.standing.totalUsd <= 0 && f.incomeUsd <= 0) line = 'Fill in the left side and your stage shows here.'
  else if (a.standing.totalUsd > 0 && f.spendUsd <= 0) line = 'Add what you spend each month to size your safety net.'
  else if (f.incomeUsd > 0 && f.surplusUsd < 0) line = `You spend ${usd(-f.surplusUsd)} a month more than you earn. Close that first.`
  else if (state.flows.incomeStability === 'none') line = 'No income yet. A portfolio grows money you earn, so that comes first.'
  else if (state.flows.incomeStability === 'irregular')
    line =
      t.growthUsd > 0
        ? `Income comes and goes, so the safety net is bigger. Park the other ${usd(t.growthUsd)} until the income is steady.`
        : 'Income comes and goes. Steady it, or a bad month forces a sale.'
  else if (h.stage === 'buildBuffer')
    line = `${f.runwayAccessibleMonths.toFixed(1)} of ${t.bufferTargetMonths} months covered. Finish the safety net, then invest.`
  else line = `Safety net in place. ${usd(t.growthUsd)} can go to work.`

  return (
    <div className="w-stage">
      <ol className="w-stage-steps" aria-label="Your stage">
        {steps.map((s, i) => (
          <li key={s.id} className={i < at ? 'is-done' : i === at ? 'is-now' : ''} aria-current={i === at ? 'step' : undefined}>
            <span className="w-stage-n">{i + 1}</span>
            {s.label}
          </li>
        ))}
      </ol>
      <p className="w-stage-line">{line}</p>
    </div>
  )
}
