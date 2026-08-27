# Mini Wealth Manager

A portfolio tool for people whose cash is not the risk-free asset.

**Live:** [samirkassir.me/wealth](https://samirkassir.me/wealth)

---

## Why this exists

I spent the summer of 2026 inside a Swiss private bank in Beirut, sitting with an investment manager and building views on portfolios for clients whose accounts start in the millions. Private banks set minimums somewhere between half a million and ten million dollars depending on the institution. That is a rational commercial decision and it leaves almost everyone out.

The people it leaves out are not stupid and they are not broke. They are twenty-something, they have four or five figures from an internship or a gift or a part-time job, and nobody has ever shown them what to do with it. There is no money in serving them, so nobody builds for them.

That is the first half. The second half is more specific.

Every mainstream portfolio tool treats your cash as the risk-free asset. It is the thing everything else is measured against, the safe corner of the balance sheet, the number the model starts from. If you live in Lebanon, Egypt, Nigeria, Argentina or Turkey, that assumption is doing an enormous amount of unexamined work. Deposits can be trapped. Currencies reprice. The balance you can see is not the money you can withdraw.

So this tool asks a question the others do not: **not how much you have, but how much of it is actually yours to move.**

Two people with the same seven thousand dollars get materially different answers here. That is the entire point.

---

## What it does

Three modules, all deliberately shallow, all working end to end.

**1. Where you stand.** Every account you hold, tagged with what currency it is in, which kind of institution holds it, how much of it you could withdraw tomorrow, and whether it can cross a border. It produces two numbers instead of one: what you own, and what you can put to work. Everything downstream runs on the second.

It also shows what waiting has cost. US prices rose 29.8 percent between October 2019, the month Lebanon's banks stopped paying out, and July 2026. A dollar held untouched through that buys 22.9 percent less, close to 3.8 percent a year. Both index values and both BLS releases are on screen, and the tool says plainly that this window ran hotter than the long run rather than passing it off as a rule.

It also produces a fragility score out of 100, built from four things you declare yourself: money you cannot reach, money that cannot leave the country, everything sitting in one institution, and money held in a currency that has repriced before. The tool makes no assumption about your country. It only counts what you tell it.

**2. Where it goes.** Income, spending, the share you want to invest, and the things you are saving for. The output is runway in months, and it deliberately shows two runways: one counting everything you own, one counting only what you can reach. The gap between them is the part of your net worth that will not answer the phone in a crisis.

**3. What to do with it.** A three-tier plan. Buffer first, near-term goals second, long-term portfolio third, in that order and never out of it. The buffer size is not a rule of thumb; it runs from three to twelve months depending on your fragility score and how reliable your income is. Gold is sized the same way, from zero to ten percent, because the case for an asset with no issuer scales with how much of your wealth depends on an institution keeping a promise.

Then the part most portfolio tools leave out, because there is no product to sell at the end of it: **if you do not have a recurring income yet, the highest-returning use of your capital is almost certainly not a fund.** The tool proves this with your own numbers. At a 7 percent expected return, one dollar a month of extra income is worth about 171 dollars of invested capital. When you have four figures saved, an extra five hundred a month is worth more than ten times everything you could put in the market. That is division, not motivation, and the working is on screen.

---

## The method

The allocation is **rules-based tiering as the policy, with mean variance optimisation shown as a check rather than as the answer.**

That choice is deliberate and I will defend it. An unconstrained optimiser fed published capital market assumptions will hand its entire budget to whichever asset happened to score best, which is why the technique is known in practice as an error maximiser. Move the expected return on equities by one percentage point, which is well inside the disagreement between the three houses this tool quotes, and the optimiser rewrites the whole portfolio.

So the recommendation is a policy with round numbers, and the efficient frontier is drawn beside it so you can see how much theoretical efficiency the policy gives up. It is close to the curve and not on it, on purpose.

The optimiser itself is a projected gradient descent onto the simplex with box constraints, written from scratch with no dependencies. Caps: 35 percent emerging market equity, 20 percent listed property, 15 percent gold, 40 percent inflation-linked bonds, all stated on screen rather than buried in the model.

### Two return columns, not one

Every number in this tool is shown twice, because there are two honest answers and they are far apart.

| | Cautious | Balanced | Growth |
|---|---|---|---|
| If the last century repeats | 5.6% | 7.3% | 9.3% |
| What the houses forecast | 4.9% | 6.1% | 7.4% |
| Moves about | 5% | 10% | 16% |
| Share of it in equities | 25% | 60% | 96% |

The left row comes from Dimson, Marsh and Staunton's 1900 to 2025 series and the Nareit REIT index. The middle row comes from J.P. Morgan's 2026 assumptions. The gap between them is the most useful thing on the page, and hiding either one would be dishonest.

**Why not the 10 to 12 percent people quote?** Because that figure is American shares alone: the S&P 500 returned 10.4 percent a year over the last thirty years and 11.9 percent over the last fifty. A portfolio spread across the whole world returned about 8.5 percent over a comparable stretch. The missing point and a half is the price of not having everything you own in one country, and the tool says so on screen rather than quietly inflating a number to meet an expectation.

**Risk level** comes from four openly scored inputs: horizon, what you say you would actually do in a 30 percent fall, income stability, and existing runway. Two hard overrides sit on top. A horizon under about two years is forced to Cautious regardless of anything else, because over two years equities are close to a coin toss. And anyone who says they would sell in a crash gets moved down a level, because a portfolio you sell at the bottom returns less than a smaller one you hold.

The three options are compared on the long-term sleeve rather than the whole plan. The emergency buffer is identical whichever level you pick, so blending it in flattens the difference between them: in the first version of this tool that collapsed a real choice into a 0.9 point spread. There is now a test that fails if it ever happens again.

## Every number, and where it came from

Not one figure in this tool was produced by me. Each is read off a published source with a date and a link, and the whole ledger is rendered at the bottom of the page so anyone can check the work rather than trust it.

| What | Source | As of |
|---|---|---|
| Expected returns, volatility, correlations | [J.P. Morgan 2026 Long-Term Capital Market Assumptions, USD matrix](https://am.jpmorgan.com/content/dam/jpm-am-aem/global/en/insights/ltcma-2026-us-matrix_usd.pdf) | 30 Sep 2025 |
| Cross-check | [Vanguard Capital Markets Model](https://corporate.vanguard.com/content/corporatesite/us/en/corp/vemo/vemo-return-forecasts.html) | 30 Jun 2026 |
| Cross-check | [BlackRock Investment Institute CMAs](https://www.blackrock.com/blk-inst-c-assets/images/tools/blackrock-investment-institute/cma/blackrock-capital-market-assumptions.xlsx) | 30 Jun 2026 |
| Long-run history, the left column | [UBS Global Investment Returns Yearbook 2026 (Dimson, Marsh, Staunton)](https://www.ubs.com/content/dam/assets/wm/static/cio/documents/giry2026-summary-public.pdf) | 1900 to 2025 |
| Property history | [FTSE Nareit REITWatch](https://www.reit.com/sites/default/files/reitwatch/RW2607.pdf) | 1972 to Jun 2026 |
| Prices in the self-investment section | Manufacturer and provider pages, one per item | 24 Aug 2026 |
| Fund expense ratios, ISINs, domiciles | Issuer product pages, one per fund | 24 Aug 2026 |
| Exchange rates | ECB, Banque du Liban, CBRT, BCRA, CBUAE, SAMA | see ledger |
| Crisis returns | MSCI, Nareit, Damodaran NYU dataset, slickcharts | see ledger |
| What cash lost since 2019 | [BLS CPI-U, Oct 2019 release](https://www.bls.gov/news.release/archives/cpi_11132019.htm) and [Jul 2026 release](https://www.bls.gov/news.release/cpi.nr0.htm) | 257.346 to 333.918 |
| Withholding and estate tax | IRS, US-Ireland treaty text, Irish Revenue | 24 Aug 2026 |

Those three houses do not agree with each other. On emerging market equity, J.P. Morgan says 7.8 percent, BlackRock says 8.8 percent, and Vanguard says 2.0 to 4.0 percent. That is a five point spread on the same asset class over the same horizon. The tool says so on screen, because anyone quoting an expected return to one decimal place is telling you about their model rather than about the future.

**Where a figure could not be verified, the tool holds it at zero and labels it rather than filling the gap with something plausible.** In the 2008 stress test, four of eight lines are blank for that reason, which understates how much diversification actually helped. A visible blank is more honest than a confident guess, and you can see exactly which cells are blank.

---

## The thing nobody else builds

Two features exist here that I have not found in a mainstream tool.

**Fund domicile as a first-class input.** If you are not a US person, buying the American version of a fund instead of the Irish one is expensive in two ways most people never hear about. Dividends from a US-listed ETF paid to someone in a country with no US tax treaty are withheld at 30 percent; an Irish fund holding the same American shares suffers 15 percent at fund level under the US-Ireland treaty. And US-situated assets above sixty thousand dollars are exposed to US estate tax at rates up to 40 percent for a non-resident, while shares of an Irish company are not US-situated property at all. The tool defaults non-US persons to the Irish lines and shows the sources.

**A stress test on the institution, not just the market.** Every portfolio tool will show you 2008. None of them will ask what happens if the money you already marked as unreachable comes back at forty cents. For a lot of people this is the larger risk by an order of magnitude, and in the worked example on the site the trapped-deposit scenario costs four times what the 2008 scenario costs. The tool has no view on what the recovery fraction should be. You set it.

---

## Technical

No external APIs. No network calls at runtime. No backend, no account, no storage. Everything you type stays in the tab and disappears when you close it. That is a privacy property and it is also why the tool cannot break during a demo.

- React 19, TypeScript, Vite, Tailwind v4, Motion for animation
- Instrument universe, capital market assumptions, exchange rates and stress scenarios all live in versioned JSON with source URLs and as-of dates
- 49 unit tests covering the arithmetic, including a positive semi-definiteness check on the covariance matrix, verification that the efficient frontier is monotone, a test that every unverified stress-test line is actually held at zero, and a set that fails if the three risk levels ever collapse toward each other again
- Deployed on Cloudflare Pages, and embedded as a React island on an Astro site

```bash
npm install
npm run dev      # local
npm test         # the arithmetic
npm run build    # production
```

**Live prices are a v2 feature and are not needed for a v1.** Portfolio construction over a ten to fifteen year horizon does not depend on today's price of anything. Adding a price feed would have made the tool less reliable and no more correct.

---

## What this is not

Not investment advice. Not a recommendation of any fund or any broker. Not tax advice. It is a teaching tool built by a finance student, and the framing is the project rather than a disclaimer attached to the end of it.

Every model in here can be wrong, and the ones hardest to check are usually the ones that are. Check the sources yourself before acting on anything, and speak to someone regulated to advise you.

---

## Roadmap, honestly

This was a two-day build. Things I know are missing:

- Live prices and a rebalancing calculator
- More currencies, and a proper treatment of parallel exchange rates rather than a single note
- Saving a plan locally so you can come back to it
- Instrument coverage outside the Irish and US wrappers, which is thin for anyone in the Gulf for reasons the tool explains
- The prices in the self-investment section need a re-check every few months, and the hardware ones sooner than that

---

Built by [Samir Kassir](https://samirkassir.me). MIT licensed. If you find a number that is wrong, open an issue and I will fix it and say who caught it.
