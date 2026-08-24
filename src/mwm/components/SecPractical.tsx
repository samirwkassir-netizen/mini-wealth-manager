import accessData from '../data/access.json'
import {
  ASSETS,
  ASSET_KEYS,
  ASSUMPTION_META,
  CORRELATIONS,
  CORRELATION_ORDER,
  HISTORICAL_LINES,
  INSTRUMENTS,
  INSTRUMENT_META,
  SCENARIO_META,
  assetMeta,
  fxMeta,
  historicalFor,
  rates,
} from '../engine'
import { Box, Disclose, Pill, Reveal, SectionHead, Source } from './ui'

export function SecPractical() {
  const groups = [accessData.broker, accessData.domicile, accessData.region]

  return (
    <div className="mwm-stack" style={{ gap: '3.5rem' }}>
      <SectionHead
        eyebrow="Section 06"
        title="Where to hold it"
        lede="The part that decides whether any of this actually happens. None of it is tax advice and none of it recommends a broker. It is published fact with a link on every line."
      />

      <div className="mwm-stack" style={{ gap: '2rem' }}>
        {groups.map((g, gi) => (
          <Reveal key={g.title} delay={gi * 0.05}>
            <div>
              <div className="mwm-head" style={{ marginBottom: '1.4rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.8rem' }}>{g.title}</h3>
                </div>
                {'lede' in g && g.lede ? <p className="mwm-note">{g.lede}</p> : null}
              </div>
              <div className="mwm-grid mwm-grid--2">
                {g.points.map((p, i) => (
                  <Box key={i} variant="quiet" style={{ height: '100%' }}>
                    <p className="mwm-body" style={{ fontSize: '1.05rem' }}>
                      {p.claim}
                    </p>
                    {p.caveat ? (
                      <p className="mwm-note" style={{ marginTop: '0.7rem' }}>
                        {p.caveat}
                      </p>
                    ) : null}
                    <p style={{ marginTop: '0.9rem' }}>
                      {p.source ? <Source url={p.source} /> : <Pill tone="warn">our conclusion, not a quote</Pill>}
                    </p>
                  </Box>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <hr className="mwm-rule" />

      <div>
        <div className="mwm-head">
          <div>
            <h3>Every number this tool used</h3>
          </div>
          <p className="mwm-note">
            Not one of them was made up here. Each is read off a published source with a date and a link, so you can
            check the work instead of trusting it, and so that when the figures age it is obvious rather than hidden.
          </p>
        </div>

        <div className="mwm-stack" style={{ gap: '1.5rem' }}>
          <Reveal>
            <Box>
              <p className="mwm-eyebrow">What each thing might earn</p>
              <p className="mwm-note" style={{ marginTop: '0.8rem' }}>
                Two columns, because there are two honest answers. The left is what actually happened over the longest
                periods anyone has measured. The right is what large houses forecast for the next ten to fifteen years.
                They disagree by a lot, and nobody knows which the future will resemble.
              </p>

              <div className="mwm-scroll-x" style={{ marginTop: '1.5rem' }}>
                <table className="mwm-table">
                  <thead>
                    <tr>
                      <th>What it is</th>
                      <th className="num">Actually happened</th>
                      <th className="num">Forecast</th>
                      <th className="num">Moves about</th>
                      <th>Period, and source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ASSETS.map((c) => {
                      const h = historicalFor(c.key)
                      return (
                        <tr key={c.key}>
                          <td>
                            <strong>{c.label}</strong>
                            <p className="mwm-tiny" style={{ marginTop: '0.3rem', maxWidth: '30ch' }}>
                              {c.plain}
                            </p>
                          </td>
                          <td className="num" style={{ fontWeight: 600 }}>
                            {h.nominal.toFixed(1)}%
                            {!h.verified ? (
                              <span className="mwm-tiny" style={{ display: 'block' }}>
                                stand-in
                              </span>
                            ) : null}
                          </td>
                          <td className="num" style={{ color: 'var(--muted)' }}>
                            {c.expectedReturn.toFixed(1)}%
                          </td>
                          <td className="num" style={{ color: 'var(--muted)' }}>
                            {c.volatility.toFixed(0)}%
                          </td>
                          <td>
                            <p className="mwm-tiny" style={{ maxWidth: '34ch' }}>
                              {h.period}. {h.measures} <Source url={h.source} />
                            </p>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mwm-grid mwm-grid--2" style={{ marginTop: '1.8rem' }}>
                <Box variant="quiet">
                  <p className="mwm-eyebrow">Forecasts</p>
                  <p className="mwm-note" style={{ marginTop: '0.7rem' }}>
                    {ASSUMPTION_META.primarySource} Data as of {ASSUMPTION_META.dataAsOf}.{' '}
                    <Source url={ASSUMPTION_META.primarySourceUrl} />
                  </p>
                  <p className="mwm-note" style={{ marginTop: '0.9rem' }}>
                    <strong>They do not agree with each other. </strong>
                    {ASSUMPTION_META.disagreement}
                  </p>
                </Box>
                <Box variant="quiet">
                  <p className="mwm-eyebrow">History</p>
                  <p className="mwm-note" style={{ marginTop: '0.7rem' }}>
                    {HISTORICAL_LINES.length} lines, mostly from the UBS Global Investment Returns Yearbook 2026, which
                    covers 1900 to 2025. Lines marked stand-in had no published figure of their own and borrow a close
                    relative, which is stated on each row.
                  </p>
                </Box>
              </div>
            </Box>
          </Reveal>

          <Reveal delay={0.05}>
            <Box>
              <p className="mwm-eyebrow">Do they move together</p>
              <p className="mwm-note" style={{ marginTop: '0.7rem' }}>
                1.00 means two things move in lockstep. 0.00 means they ignore each other. That is the whole reason to
                own more than one thing.
              </p>
              <div className="mwm-scroll-x" style={{ marginTop: '1.3rem' }}>
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
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{assetMeta(k).label}</td>
                        {CORRELATIONS[i].map((v, j) => (
                          <td
                            key={j}
                            className="num"
                            style={{
                              background: v > 0.5 && i !== j ? `rgb(122 31 42 / ${(v * 0.2).toFixed(2)})` : undefined,
                              color: i === j ? 'var(--muted)' : undefined,
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
            </Box>
          </Reveal>

          <Reveal delay={0.05}>
            <Box>
              <p className="mwm-eyebrow">Exchange rates</p>
              <p className="mwm-note" style={{ marginTop: '0.7rem' }}>
                {fxMeta.note}
              </p>
              <div className="mwm-scroll-x" style={{ marginTop: '1.3rem' }}>
                <table className="mwm-table">
                  <thead>
                    <tr>
                      <th>Currency</th>
                      <th className="num">Per dollar</th>
                      <th>Type</th>
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
                            <strong>{r.code}</strong> <span className="mwm-note">{r.name}</span>
                            <p className="mwm-tiny" style={{ maxWidth: '38ch', marginTop: '0.3rem' }}>
                              {r.note}
                            </p>
                          </td>
                          <td className="num">
                            {r.perUsd.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                            {r.parallelPerUsd ? (
                              <span className="mwm-tiny" style={{ display: 'block' }}>
                                street {r.parallelPerUsd.toLocaleString('en-US')}
                              </span>
                            ) : null}
                          </td>
                          <td className="mwm-note">{r.regime}</td>
                          <td className="num mwm-note">{r.asOf}</td>
                          <td>
                            <Source url={r.sourceUrl} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Box>
          </Reveal>

          <Reveal delay={0.05}>
            <Box>
              <p className="mwm-eyebrow">Every fund it can pick from</p>
              <p className="mwm-note" style={{ marginTop: '0.7rem' }}>
                {INSTRUMENT_META.note} Checked on {INSTRUMENT_META.checkedOn}.
              </p>
              <div style={{ marginTop: '1.3rem' }}>
                <Disclose summary={`Show all ${INSTRUMENTS.length} funds`}>
                  <div className="mwm-scroll-x">
                    <table className="mwm-table">
                      <thead>
                        <tr>
                          <th>Fund</th>
                          <th>What it holds</th>
                          <th>Registered in</th>
                          <th className="num">Yearly cost</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {INSTRUMENTS.map((i) => (
                          <tr key={i.id}>
                            <td>
                              <strong>{i.id}</strong>
                              <p className="mwm-tiny" style={{ maxWidth: '30ch' }}>
                                {i.name}
                              </p>
                            </td>
                            <td className="mwm-tiny" style={{ maxWidth: '26ch' }}>
                              {ASSET_KEYS.includes(i.assetClass as never)
                                ? assetMeta(i.assetClass as never).label
                                : 'never allocated'}
                            </td>
                            <td className="mwm-tiny">
                              {i.domicile}
                              {i.usSitus ? (
                                <span className="mwm-accent" style={{ display: 'block' }}>
                                  American asset
                                </span>
                              ) : null}
                            </td>
                            <td className="num">{i.ter.toFixed(2)}%</td>
                            <td>
                              <Source url={i.source} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Disclose>
              </div>
            </Box>
          </Reveal>

          <Box variant="quiet">
            <p className="mwm-eyebrow">On the bad years</p>
            <p className="mwm-note" style={{ marginTop: '0.7rem' }}>
              {SCENARIO_META.note}
            </p>
          </Box>

          <Box variant="accent">
            <p className="mwm-eyebrow">What this is not</p>
            <p className="mwm-body" style={{ marginTop: '0.9rem' }}>
              Not investment advice. Not a recommendation of any fund or any broker. Not tax advice. It is a teaching
              tool built by a finance student. Every model in here can be wrong, and the ones hardest to check are
              usually the ones that are. Check the sources yourself before you act on anything, and talk to someone who
              is licensed to advise you.
            </p>
          </Box>
        </div>
      </div>
    </div>
  )
}
