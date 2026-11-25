# FolioLens Product Requirements

**AI-powered investment assistant**  
Product requirements, user journey, wireframes, AI architecture, roadmap and success metrics  
26 November 2026 · Submission brief · Version 1.0

## Product vision

Help a self-directed retail investor understand what they own, where they are exposed, and what changed, in one portfolio review. FolioLens combines holdings, market prices, fundamentals and news. Each insight should show the evidence the investor can inspect and the assumptions behind any calculation.

## Target users and problems

| Segment | Job to be done | Current friction |
|---|---|---|
| Primary · Self-directed Indian equity investors with 5–25 positions | Check whether changes in price or exposure deserve a closer look during a weekly review | Broker statements and news feeds are disconnected. Several holdings can create exposure to the same sector. |
| Secondary · First-time investors | Understand the difference between an open-position gain, daily price movement and benchmark performance | Investing language is unfamiliar and different return figures look interchangeable. |
| Later · Multi-account households | Consolidate holdings and detect repeated exposure across funds and accounts | Symbols, transaction formats and holdings overlap across providers. |

**Assumptions to validate.** India and INR are the initial market and currency. The segments and their frequency of review are hypotheses. Interview eight self-directed investors and four newer investors. Ask each to walk through a recent review. Run five moderated prototype sessions with a fixed portfolio and collect time to identify the main risk, first-click errors and comprehension.

**Product objectives.** Help an investor reach an evidence-backed first review within five minutes, explain concentration and performance correctly, and make it worthwhile to return after a relevant update. Judge the product by understanding and repeat reviews, rather than trade volume.

**Scope of this submission.** The prototype covers long-only fictional equities, one INR portfolio and a dated synthetic snapshot. Its companion roadmap defines the work from prototype to an invitation-only beta.

<!-- page -->
## MVP requirements

| Priority | Capability | Acceptance criteria |
|---|---|---|
| P0 | Sample and CSV onboarding | Sample opens immediately. CSV previews row count, symbols and valued total. Duplicate tickers merge with weighted cost. An invalid file shows a repairable error and leaves the prior portfolio usable. |
| P0 | Overview and holdings | Show dated portfolio value, prior-close change and unrealized gain with consistent values in the table and assistant. Period controls update the labeled illustrative chart and benchmark. Company detail shows dated fundamentals. |
| P0 | Concentration and scenarios | Surface the top stock and sector. Flag a stock at 25% or a sector at 40%. A sector or whole-portfolio price shock updates the INR and percentage impact together. |
| P0 | Relevant news | Held-stock filtering links events to portfolio weights. Each story shows source and publication date, explains a plausible channel, and states where the evidence is incomplete. |
| P0 | Evidence-backed Q&A | Support risk, performance, news, fundamentals and scenarios. Use templated educational responses for unsupported or prescriptive requests. Show the evidence label and link to relevant in-app detail. |
| P1 | Review preferences | Record time horizon and sensitivity. Lower swings adds a note to the risk response. Model routing requires explicit opt-in when available. |

**Prototype exclusions.** Live accounts and quotes, trading, alerts, price forecasts, transaction history, ETF look-through and multi-currency accounting are roadmap items or outside product scope. Time horizon is stored in the demo and reserved for future product context. The assistant is single-turn per question.

**Pilot quality targets.** Overview and rules answers under 2 seconds at p95 on representative devices after data is ready. Investigate model routing separately with an 8-second ceiling and automatic fallback. Support keyboard navigation, clear focus, readable mobile layout and text equivalents for chart takeaways.

**Product boundary for beta.** Keep first release focused on education and descriptive analysis. Obtain India-specific review of the exact wording, workflow, business model, registration implications and data licenses before onboarding real portfolios or adding personalized recommendations. See the SEBI references on the final page.

<!-- page -->
## User journey and product workflow

**Entry path.** An investor opens FolioLens after a price move or as part of a weekly review. They explore the sample or select Import portfolio. The dashboard remains usable while an import is being repaired.

| Stage | Investor action | System response and recovery |
|---|---|---|
| Discover | Open the overview or download the CSV template | Label the fictional close and currency. An immediately available sample provides a first review without setup. |
| Import and confirm | Select a CSV, review the preview and apply | Validate units, average cost and symbols. Reject invalid input with a row-specific error where possible. Replace existing holdings after confirmation. |
| Understand | Compare valuation, P&L and benchmark illustration | Calculate against the same portfolio snapshot. Label fixed quantities and price-only history. Use the holdings table to reconcile figures. |
| Investigate | Open Risk Lab, move a scenario slider, inspect a company or filter news | Explain thresholds, quantify a hypothetical loss, and expose evidence. If held companies have no stories, offer the full demo feed. |
| Ask | Select a suggested question or type one | Route the topic, render dated evidence, and link back to the source view. Unclear prompts offer examples. Provider failure uses local rules. |
| Return | Reopen the workspace or reset to sample | Restore holdings and preferences on the same browser when storage is available. A new import clears prior assistant messages tied to the previous portfolio. |

**Processing flow.** Select sample or file → validate and preview → confirm snapshot → value positions and compute exposure → assemble dashboard and source records → interpret the question → render evidence and linked details. An imported snapshot is written only after validation and confirmation. The prototype works in memory if the browser blocks storage.

**Graded demo.** Load sample → identify the 54.7% Technology exposure → shock it by −10% → confirm −₹13,680 → ask about the source of the risk → open a company filing → import a different position mix and repeat the review.

<!-- page -->
## Wireframes and interaction

The review starts at the overview. Import previews changes before committing them. Holdings and Market News open evidence in dialogs. Risk Lab places assumptions beside the result. On mobile, the assistant follows the main content.

<!-- wireframes -->

**Interaction states.** Import has idle, invalid, validated and applied states. News has a held-only empty state. The assistant distinguishes rules and AI-assisted routing and offers a safe next view for advice requests. Each dialog supports keyboard dismissal and returns focus to the triggering control.

<!-- page -->
## AI architecture and implementation

**Prototype data flow.** CSV or sample → browser validation → shared portfolio calculator → typed facts from holdings and fixtures → answer renderer. A question first goes through local rules. If the user enables AI and the local server is configured, the server sends question text to the Responses API for a constrained intent. The browser validates the result and renders an answer using known facts. The server keeps the API key and falls back on timeout, refusal or invalid output.

<!-- architecture -->

| Layer | What to use | Why it belongs there |
|---|---|---|
| Portfolio calculator | Deterministic code | Valuation, P&L, weights, thresholds and shocks must reconcile across UI and Q&A. Keep these computations outside the language model. |
| Market context | Prototype tags and time order; beta entity resolution and retrieval | Resolve issuer identifiers, link holdings to primary filings and licensed news, deduplicate syndication, and rank by relevance, recency, quality and exposure. |
| ML after beta | Train a news relevance ranker on adjudicated event labels and user feedback | Compare against exact symbol tags and recency on a time-based holdout. Measure precision at 5 and duplicate rate by sector before rollout. Use explicit relevance labels rather than clicks alone. |
| Language model | Prototype intent classification; beta evidence-bound explanations | In beta retrieve approved source chunks, pass typed portfolio facts, and require claim-to-evidence IDs. Reject unknown citations and check numeric claims against the calculation tool output. |

**Proposed data contract.** Keep a canonical security ID, exchange, currency, as-of close and source version. Each fact has a value, unit, as-of time, portfolio snapshot ID and provenance ID. Each article has an issuer ID, publication and ingestion times, source link, tags and a license status. An answer records intent, fact IDs, source IDs and fallback reason.

**Beta operating controls.** Rights-check feeds and excerpts. Store only needed portfolio fields, encrypt them, isolate each user's data, and support removal. Keep identifiers and holdings out of provider prompts where possible. Treat retrieved text as data, strip markup, and constrain tools to read-only. On stale or missing evidence, show coverage and timestamps, suppress affected comparisons and state what is unavailable. Start with audited prompts and a rollback flag.

<!-- page -->
## Portfolio analysis specification

| Metric | Formula and assumptions | Sample check |
|---|---|---|
| Marked value | Sum of quantity × snapshot close across listed positions. | ₹250,000 |
| Prior-close change | Sum of quantity × (close − prior close). Percentage divides by the value at prior close using the same quantities. | +₹1,960 · +0.8% |
| Unrealized P&L | Marked value − sum of quantity × entered average cost. Percentage divides by entered cost. Excludes fees, taxes and realized gains. | +₹22,940 · +10.1% |
| Weight and concentration | Holding value ÷ portfolio value. Sum each sector’s holdings. Compare unrounded weights to the demo thresholds. | VANTA 38.4%; Technology 54.7% |
| Sector shock | Sum affected holdings’ marked values × assumed move. Other prices fixed. Divide the impact by total value for percent impact. | Technology −10% → −₹13,680 · −5.5% |
| Demo history | Index synthetic fixed-quantity price paths at 100 for selected period. Benchmark is a synthetic price series over the same period. | Portfolio and benchmark series align at 100 |

**Production performance method.** With only a holdings snapshot, disclose that actual historical portfolio returns are unavailable. Add a reconciled transaction ledger and corporate actions first. Use daily or subperiod time-weighted returns with external flows accounted for and geometric linking. For investor experience, add XIRR only when dated flows, a terminal valuation and a sensible solution are available. Compare like-for-like returns over matching dates and currency. For an appropriate Indian large-cap equity allocation, a dividend-inclusive comparison can use the Nifty 50 Total Return Index.

**Fundamentals and news interpretation.** Keep quarterly year-over-year revenue growth separate from trailing P/E and ROE. In production show the reporting period and identify missing or non-meaningful ratios, such as P/E with non-positive earnings. Distinguish a reported event from a hypothesis about margins or valuation. Even a correctly matched news event does not establish why a stock moved.

**Missing data.** The prototype rejects unsupported tickers. A beta should report count and value coverage where measurable, show the last verified quote, suppress misleading totals or mark them explicitly as partial, and reconcile splits, dividends and renamed listings before calculating returns.

<!-- page -->
## Build sequence and roadmap

| When | Deliverable | Exit condition |
|---|---|---|
| Prototype · completed build | Local dashboard, validated import, scenario lab, news and fundamentals, rules Q&A, optional model adapter | Demo review works end-to-end. The sample calculations reconcile and import errors preserve the prior portfolio. |
| Weeks 1–2 · discovery | Interviews, clickable usability sessions, legal and market-data discovery, first data-provider trial | Five investors can locate the main exposure with unaided task success of at least 4 of 5. Product scope and data rights are documented. |
| Weeks 3–6 · beta preparation | Licensed end-of-day prices, corporate actions, filings, identifiers, persistence and account consent | Quote and identifiers reconcile on a fixed evaluation set. Validate agreed coverage and freshness targets and complete security and scope review. |
| Weeks 7–10 · invite-only beta | Dated source links, evidence-backed summaries, feedback and weekly review tracking | Hit trust and latency gates on an offline and closed-beta sample before expanding access. |
| Months 3–6 · deepen review | Transaction import, total-return comparisons, alerts with explicit consent and expanded coverage | Reconcile returns against an independent ledger. Pilot alert relevance and opt-out controls. |
| Later · gated experiments | ETF look-through, multiple accounts, ML relevance ranking and advisor collaboration | Validate underlying exposure coverage and ranker lift. Reassess regulated capabilities separately with qualified counsel. |

**Engineering build order.** First implement fixture data and calculator checks. Then build import, overview, holdings, scenario and news screens. Add rules Q&A before connecting an optional model router. Finally test invalid imports, disclosure text, mobile layout, fallback and the sample calculations. The README follows this order and names the relevant files.

**Ownership.** Product owns research and review completion. Engineering owns ingestion, calculation quality and performance. Design owns comprehension and accessibility. The data lead owns coverage and freshness. Compliance reviews launch scope with product.

<!-- page -->
## Success metrics and launch gates

| Metric and event definition | Initial pilot target |
|---|---|
| North star · Weekly meaningful review rate. Distinct activated users viewing an overview and then opening evidence or completing a scenario in the same session ÷ distinct activated users eligible for review that week. | ≥40% by week 4 |
| Activation · New users completing overview plus one evidence action within 24 hours ÷ distinct first-time users who started onboarding. Report sample and imported cohorts separately. | ≥60% |
| Time to first value · Median minutes from onboarding start to first qualifying review among users who complete it. Report completion rate alongside it. | ≤5 minutes |
| Week-four return · Users from a weekly activation cohort returning for a qualifying review on days 22–28 ÷ users originally activated in that cohort. | ≥25% |
| Comprehension · Participants correctly identifying largest exposure and explaining scenario impact ÷ participants who attempt both tasks. | ≥80% |
| Answer trust · Audited substantive claims with valid supporting evidence ÷ audited substantive claims. Track numeric match and prescriptive answers separately. | ≥95% supported; 100% arithmetic match; 0 observed prescriptive answers in gate set |
| Data and operations · Expected coverage of fresh, valued eligible position rows and rules-answer p95 after data is ready. | ≥99% rows; p95 ≤2 s |

**Measurement plan.** Proposed events include onboarding_started, portfolio_ready, overview_viewed, evidence_opened, scenario_completed, assistant_answered and answer_feedback. Use pseudonymous IDs, timestamps, mode labels and a 30-minute inactivity cutoff for sessions. Exclude raw CSV values and full prompts from analytics. Targets are hypotheses. Set a baseline in a 50-user pilot and review weekly by sample/import mode and experience.

**Release gate.** Audit at least 100 prompts covering supported topics, missing evidence, ambiguous names, direct advice, instruction injection and provider failures. Manually check calculations against golden fixtures, citations against source content, and review the worst cases before permitting model routing by default in a later release.

**References.** [Investor.gov diversification guide](https://www.investor.gov/additional-resources/general-resources/publications-research/info-sheets/beginners-guide-asset) · [NSE Indices total return methodology](https://niftyindices.com/resources/tutorial/calculation-of-indices) · [SEBI Investment Adviser Regulations](https://www.sebi.gov.in/legal/regulations/nov-2025/securities-and-exchange-board-of-india-investment-advisers-regulations-2013-and-securities-last-amended-on-november-25-2025-_98246.html) · [SEBI Master Circular for Investment Advisers](https://www.sebi.gov.in/sebi_data/attachdocs/feb-2026/1770375291405.pdf) · [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
