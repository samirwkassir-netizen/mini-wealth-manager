import accessData from '../data/access.json'
import {
  ASSETS,
  ASSET_KEYS,
  ASSUMPTION_META,
  CORRELATIONS,
  CORRELATION_ORDER,
  INSTRUMENTS,
  INSTRUMENT_META,
  SCENARIO_META,
  assetMeta,
  fxMeta,
  rates,
} from '../engine'
import { Card, Pill, Reveal, SectionHead, Source } from './ui'

export function AccessPanel() {
  const groups = [accessData.broker, accessData.domicile, accessData.region]
  return (
    <section style={{ paddingTop: '3rem' }}>
      <SectionHead
        index="Practicalities"
        title="Where you would actually hold this"
        intro="The part that decides whether any of the above happens. None of it is tax advice and none of it recommends a broker. It is published fact with a link on each line, gathered because it is hard to find in one place and because it changes what a small investor outside the US and Europe should buy."
      />

      <div className="mwm-stack" style={{ gap: '1rem' }}>
        {groups.map((g, gi) => (
          <Reveal key={g.title} delay={gi * 0.05}>
            <Card>
              <p className="mwm-eyebrow">{g.title}</p>
              {'lede' in g && g.lede ? (
                <p className="mwm-lede" style={{ marginTop: '0.6rem', fontSize: '0.96rem' }}>
                  {g.lede}
                </p>
              ) : null}
              <div className="mwm-stack" style={{ gap: '1rem', marginTop: '1rem' }}>
                {g.points.map((p, i) => (
                  <div key={i} className="mwm-callout">
                    <p style={{ fontSize: '0.92rem' }}>{p.claim}</p>
                    {p.caveat ? (
                      <p className="mwm-small" style={{ marginTop: '0.3rem' }}>
                        {p.caveat}
                      </p>
                    ) : null}
                    <p style={{ marginTop: '0.35rem' }}>
                      {p.source ? <Source url={p.source} /> : <Pill tone="warn">a conclusion, not a quote</Pill>}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
      <p className="mwm-small" style={{ marginTop: '1rem' }}>
        Checked on {accessData.meta.checkedOn}. {accessData.meta.note}
      </p>
    </section>
  )
}

export function Ledger() {
  return (
    <section style={{ paddingTop: '3rem' }}>
      <SectionHead
        index="The ledger"
        title="Every number this tool used"
        intro="Not one of these was produced by this project. Each is read off a published source with a date and a link. This section exists so that anybody can check the work rather than trust it, and so that when the figures age it is obvious rather than hidden."
      />

      <Reveal>
        <Card>
          <p className="mwm-eyebrow">Expected returns, volatility and correlations</p>
          <p className="mwm-small" style={{ marginTop: '0.6rem' }}>
            {ASSUMPTION_META.primarySource} Data as of {ASSUMPTION_META.dataAsOf}. Horizon {ASSUMPTION_META.horizon}.
            Returns are {ASSUMPTION_META.returnBasis}. <Source url={ASSUMPTION_META.primarySourceUrl} />
          </p>

          <div className="mwm-scroll-x" style={{ marginTop: '1rem' }}>
            <table className="mwm-table">
              <thead>
                <tr>
                  <th>Used here as</th>
                  <th>Their label</th>
                  <th className="num">Return</th>
                  <th className="num">Volatility</th>
                </tr>
              </thead>
              <tbody>
                {ASSETS.map((a) => (
                  <tr key={a.key}>
                    <td style={{ fontWeight: 600 }}>{a.label}</td>
                    <td className="mwm-small">{a.sourceLabel}</td>
                    <td className="num">{a.expectedReturn.toFixed(2)}%</td>
                    <td className="num">{a.volatility.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mwm-why mwm-small" style={{ marginTop: '1.1rem' }}>
            <strong>They do not agree with each other. </strong>
            {ASSUMPTION_META.disagreement}
          </div>

          <div className="mwm-scroll-x" style={{ marginTop: '1.2rem' }}>
            <p className="mwm-eyebrow" style={{ marginBottom: '0.6rem' }}>
              Correlations
            </p>
            <table className="mwm-table">
              <thead>
                <tr>
                  <th />
                  {CORRELATION_ORDER.map((k) => (
                    <th key={k} className="num">
                      {assetMeta(k).label.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CORRELATION_ORDER.map((k, i) => (
                  <tr key={k}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{assetMeta(k).label}</td>
                    {CORRELATIONS[i].map((v, j) => (
                      <td
                        key={j}
                        className="num"
                        style={{
                          background: v > 0.5 ? `rgb(122 31 42 / ${(v * 0.16).toFixed(2)})` : undefined,
                          color: i === j ? 'var(--smoke)' : undefined,
                        }}
                      >
                        {v.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mwm-small" style={{ marginTop: '1rem' }}>
            Cross-checked against {ASSUMPTION_META.crossChecks.length} other published sets:{' '}
            {ASSUMPTION_META.crossChecks.map((c, i) => (
              <span key={c.name}>
                {i > 0 ? ', ' : ''}
                <a href={c.url} target="_blank" rel="noreferrer noopener">
                  {c.name.split(',')[0]}
                </a>
              </span>
            ))}
            .
          </p>
        </Card>
      </Reveal>

      <Reveal delay={0.05}>
        <Card style={{ marginTop: '1.2rem' }}>
          <p className="mwm-eyebrow">Exchange rates</p>
          <p className="mwm-small" style={{ marginTop: '0.6rem' }}>
            {fxMeta.note}
          </p>
          <div className="mwm-scroll-x" style={{ marginTop: '1rem' }}>
            <table className="mwm-table">
              <thead>
                <tr>
                  <th>Currency</th>
                  <th className="num">Per dollar</th>
                  <th>Regime</th>
                  <th className="num">As of</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {rates
                  .filter((r) => r.code !== 'USD')
                  .map((r) => (
                    <tr key={r.code}>
                      <td>
                        <strong>{r.code}</strong> <span className="mwm-small">{r.name}</span>
                        <p className="mwm-small" style={{ maxWidth: '40ch', marginTop: '0.2rem' }}>
                          {r.note}
                        </p>
                      </td>
                      <td className="num">
                        {r.perUsd.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                        {r.parallelPerUsd ? (
                          <span className="mwm-small" style={{ display: 'block' }}>
                            street {r.parallelPerUsd.toLocaleString('en-US')}
                          </span>
                        ) : null}
                      </td>
                      <td className="mwm-small">{r.regime}</td>
                      <td className="num mwm-small">{r.asOf}</td>
                      <td>
                        <Source url={r.sourceUrl} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.05}>
        <Card style={{ marginTop: '1.2rem' }}>
          <p className="mwm-eyebrow">The instrument universe</p>
          <p className="mwm-small" style={{ marginTop: '0.6rem' }}>
            {INSTRUMENT_META.note} Checked on {INSTRUMENT_META.checkedOn}. {INSTRUMENT_META.wrapperNote}
          </p>
          <div className="mwm-scroll-x" style={{ marginTop: '1rem' }}>
            <table className="mwm-table">
              <thead>
                <tr>
                  <th>Fund</th>
                  <th>Asset class</th>
                  <th>ISIN</th>
                  <th>Domicile</th>
                  <th className="num">Cost</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {INSTRUMENTS.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.id}</strong>
                      <p className="mwm-small" style={{ maxWidth: '32ch' }}>
                        {i.name}
                      </p>
                      <p className="mwm-small">{i.tickers}</p>
                    </td>
                    <td className="mwm-small">
                      {ASSET_KEYS.includes(i.assetClass as never) ? assetMeta(i.assetClass as never).label : 'not allocated'}
                    </td>
                    <td className="mwm-small">{i.isin ?? 'none'}</td>
                    <td className="mwm-small">
                      {i.domicile}
                      {i.usSitus ? (
                        <span style={{ display: 'block', color: 'var(--oxblood)' }}>US situs</span>
                      ) : null}
                    </td>
                    <td className="num">{i.ter.toFixed(2)}%</td>
                    <td>
                      <Source url={i.source} />
                      {i.sourceQuality === 'secondary' ? (
                        <span className="mwm-small" style={{ display: 'block', color: 'var(--oxblood)' }}>
                          secondary source only
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.05}>
        <Card tone="flat" style={{ marginTop: '1.2rem' }}>
          <p className="mwm-eyebrow">On the stress tests</p>
          <p className="mwm-small" style={{ marginTop: '0.6rem' }}>
            {SCENARIO_META.note}
          </p>
        </Card>
      </Reveal>

      <Card tone="flat" style={{ marginTop: '1.2rem' }}>
        <p className="mwm-small">
          <strong>What this is not. </strong>
          This is not investment advice, it is not a recommendation of any fund or broker, and it is not tax advice.
          It is a teaching tool built by a finance student. It makes no network calls, stores nothing, and knows
          nothing about you beyond what is on this screen. Every model here can be wrong, and the ones that are
          hardest to check are usually the ones that are wrong. Before you act on anything, check the sources
          yourself and speak to someone who is regulated to advise you.
        </p>
      </Card>
    </section>
  )
}
