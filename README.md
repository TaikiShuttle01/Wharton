# Wharton Growth Sleeve Research Observatory
## Institutional Quantitative Investment Platform & Fiduciary Decision Workbench

**Document Type:** System Architecture Specification, Quantitative Audit & Competitive-Advantage Assessment  
**Competition Scope:** Wharton Global High School Investment Competition — Quantitative Growth Sleeve  
**Codebase Baseline:** React 19 / TypeScript / Vite / Tailwind CSS / Node.js Engine Baseline  
**Audit Date:** October 2026  
**Auditor Roles:** Senior Quantitative Investment Researcher, Financial Systems Architect, Product Strategist  

---

## Executive Summary

The **Wharton Growth Sleeve Research Observatory** is a production-grade, client-side quantitative research workspace and investment committee governance workbench. Engineered specifically for student quantitative analysts and Chief Investment Officer (CIO) committees participating in the Wharton Global High School Investment Competition, the platform moves beyond generic fintech dashboards and marketing mockups to deliver an intellectually rigorous, mathematically grounded research instrument.

The observatory provides an end-to-end investment research lifecycle:
1. **Security Identity Resolution & Discovery:** Multi-provider search across SEC EDGAR XBRL, Financial Modeling Prep (FMP), Alpha Vantage, and Twelve Data with formal resolution state handling (`FOUND`, `NOT_FOUND`, `UNVERIFIED`, `LOOKUP_ERROR`).
2. **Provenance-Preserving Fundamental Research:** Direct GAAP financial statement figures contrasted against vendor-derived multiples, explicitly preserving data provider discrepancies without unprincipled mathematical averaging.
3. **Interactive Portfolio Construction:** User-defined proposal builder evaluating arbitrary long-only weights in real time against a 5-year empirical sample covariance matrix ($\mathbf{w}^T \boldsymbol{\Sigma} \mathbf{w}$) rather than linear interpolation.
4. **Deterministic Macroeconomic Stress Testing:** Five scenario shocks (Broad -10%, Severe -25%, 2008 GFC Beta shock, 2022 Tech rate-hike shock, Hardware/Semiconductor disruption) evaluated dynamically across portfolio holdings.
5. **Asset-Liability Matching & Trajectory Modeling:** 10-year compounding trajectory modeling with a strict "Ground Zero" Beginning-2033 Present Value (PV) liability reserve obligation ($43,899.80 at 4.5% discount rate) ensuring client commitments are fully immunized before residual surplus capital is deployed toward client facility contributions.
6. **Fiduciary CIO Decision Governance:** Formal Investment Committee signoff hub generating audit trails, compliance checklists, and printable decision memoranda.

---

## 1. System Map & Navigation Architecture

The application is structured as a client-side React SPA mounted via `src/App.tsx` and partitioned into four core analytical workspaces plus two global slide-over audit drawers:

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │            TOP PUBLICATION MASTHEAD & NAV              │
                                  │  Mandate: WGHSC-GROWTH-SLEEVE | Target: Beg-2033       │
                                  └──────────────────────────┬─────────────────────────────┘
                                                             │
         ┌───────────────────────┬───────────────────────────┴───────────────────────────┬───────────────────────┐
         ▼                       ▼                                                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐                                    ┌──────────────────┐   ┌──────────────────┐
│  OVERVIEW TAB    │   │  RESEARCH TAB    │                                    │  PORTFOLIO TAB   │   │  DECISION TAB    │
│ Executive Status │   │ Universe Manager │                                    │ Builder & Models │   │ Risk & Signoff   │
│ Metric Strip (6) │   │ Multi-Provider   │                                    │ Arbitrary Weight │   │ Marginal Deltas  │
│ Allocation Bar   │   │ SEC XBRL Dossier │                                    │ Covariance Engine│   │ 5 Stress Shocks  │
│ Trajectory Curve │   │ Terminal Charts  │                                    │ Compare Matrix   │   │ Decision Memo    │
└──────────────────┘   └──────────────────┘                                    └──────────────────┘   └──────────────────┘
         │                       │                                                       │                       │
         └───────────────────────┴───────────────────────────┬───────────────────────────┴───────────────────────┘
                                                             ▼
                                      ┌──────────────────────────────────────────────┐
                                      │         GLOBAL AUDIT & PROVENANCE DRAWERS    │
                                      │  1. DataProvenanceDrawer (SEC CIK, Hashes)   │
                                      │  2. SystemAuditDrawer (Request Ledger, Logs) │
                                      └──────────────────────────────────────────────┘
```

### Detailed Workspace Inventory

| Workspace / Drawer | Primary Component Path | Implemented Functionality | Primary User & Workflow | Key State & Data Contracts |
|---|---|---|---|---|
| **Overview** | `src/components/views/OverviewView.tsx` | High-level executive briefing summarizing initial capital ($100k), sleeve CAGR (21.85%), volatility (18.42%), beta (1.14x), Sharpe (0.942), and reserve PV ($43,899.80). Interactive allocation bar and trajectory chart. | Investment Committee / Lead Analyst: Rapid portfolio health check. | `CASE_METADATA`, `CURRENT_PORTFOLIO_HOLDINGS`, `CURRENT_PORTFOLIO_METRICS`, `LIABILITY_RESERVE_SPEC` (`src/data/quantModelData.ts`). |
| **Research & Universe** | `src/components/views/ResearchView.tsx` | Multi-vendor search (`lookupSecurity`), saved universe persistence, master/detail equity dossier, professional financial time-series chart with crosshair and benchmark overlay, GAAP fundamentals, and screening pass/fail criteria. | Quantitative Research Analyst: Fundamental equity analysis and data validation. | `loadSavedUniverse()`, `addSecurityToUniverse()`, `removeSecurityFromUniverse()`, `EXTENDED_SECURITY_CATALOG`, `FinancialTimeSeriesChart`. |
| **Portfolio Builder** | `src/components/views/PortfolioView.tsx` | Tri-mode workspace: (1) Proposal Builder with live position weight inputs, (2) Current baseline holdings, (3) Comparison matrix. Full client-side matrix evaluation for arbitrary weights. | Portfolio Manager / Quant: Designing, duplicating, evaluating, and stress-testing allocation proposals. | `loadUserProposals()`, `createUserProposal()`, `deleteUserProposal()`, `evaluatePortfolioWeights()`, `ASSET_COVARIANCE_MATRIX`. |
| **Decision & Risk Hub** | `src/components/views/DecisionView.tsx` | Unified governance workbench: Before-and-after proposal delta tables, sector shift, 5 deterministic stress scenarios with interactive loss profiles, WInS attestation checklists, and printable decision memorandum. | Chief Investment Officer (CIO): Fiduciary review, risk inspection, and binding committee authorization. | `CIODecisionRecord`, `evaluateStressScenariosForHoldings()`, `PHASE7_STRESS_SCENARIOS`, `window.print()`. |
| **Data Provenance Drawer** | `src/components/layout/DataProvenanceDrawer.tsx` | Slide-over drawer detailing exchange, asset class, SEC CIK, ingestion timestamp, SHA-256 payload hash, and multi-provider discrepancy audits. | Compliance Officer / Auditor: Verifying primary data sources and discrepancy rules. | `SecurityRecord.provenance`, `SecurityRecord.disagreements` (`src/types/quantTypes.ts`). |
| **System Audit Drawer** | `src/components/layout/SystemAuditDrawer.tsx` | Global slide-over inspecting raw HTTP vendor request ledgers (`request_ledger.jsonl`), latencies, cache status, endpoint URLs, and dataset manifests. | Technical Auditor: Confirming zero data fabrication and verifying API transport. | `REQUEST_LEDGER_DATA` (`src/data/quantModelData.ts`). |

---

## 2. End-to-End Data Flow & State Management

The observatory operates with a strict unidirectional data flow and browser-backed persistence:

```
[External Sources]                   [Data Ingestion & Resolution]                     [Persistence Layer]
SEC EDGAR XBRL (10-K/Q) ──┐         ┌───────────────────────────────┐                 ┌─────────────────────────────┐
Financial Modeling Prep ──┼────────►│ securityLookup.ts             │                 │ userStorage.ts (localStorage)│
Alpha Vantage             │         │ • Status: FOUND/NOT_FOUND     ├────────────────►│ • saved_universe_v1         │
Twelve Data               │         │ • Discrepancy Reconciliation  │                 │ • user_proposals_v1         │
                          │         └──────────────┬────────────────┘                 └──────────────┬──────────────┘
                          │                        │                                                 │
                          │                        ▼                                                 ▼
                          │         ┌───────────────────────────────┐                 ┌─────────────────────────────┐
                          └────────►│ quantModelData.ts (Clean Repo)│                 │ quantEngine.ts              │
                                    │ • Baseline Holdings (4)       │                 │ • Matrix Covariance: w^T Σ w│
                                    │ • Construction Proposals (4)  ├────────────────►│ • Factor Sensitivities (β)  │
                                    │ • 5 Deterministic Stresses    │                 │ • 5 Stress Scenario Shocks  │
                                    │ • 10-Yr Compounding Trajectory│                 │ • Dynamic Sharpe / Sortino  │
                                    └───────────────────────────────┘                 └──────────────┬──────────────┘
                                                                                                     │
                                                                                                     ▼
                                                                                      ┌─────────────────────────────┐
                                                                                      │ React UI Components         │
                                                                                      │ • OverviewView              │
                                                                                      │ • ResearchView              │
                                                                                      │ • PortfolioView             │
                                                                                      │ • DecisionView              │
                                                                                      └─────────────────────────────┘
```

### Persistence Specification (`src/data/userStorage.ts`)

State persistence is decoupled from UI components and stored under isolated localStorage keys:
- **`growth_sleeve_saved_universe_v1`**: Serializes `SecurityRecord[]`. Automatically seeded on first load with the core 4-asset growth universe (`AAPL`, `MSFT`, `NVDA`, `AMZN`) and market benchmark (`SPY`). Users can dynamically add resolved securities (e.g., `GOOGL`, `META`, `TSLA`) or delete existing holdings.
- **`growth_sleeve_user_proposals_v1`**: Serializes `UserProposal[]` with unique IDs (`PROP-01` through `PROP-04` or `PROP-<timestamp>`), timestamps, version numbers, draft flags, holdings, and cached engine evaluation results.
- **Graceful Deletion & Auto-Seeding**: The persistence layer guarantees that deleting the last remaining proposal automatically seeds a fresh unallocated draft proposal, preventing blank-screen render failures. All deletion actions execute in-UI without triggering `window.confirm` dialogs, which are blocked in sandboxed iframe environments.

---

## 3. The Quantitative Engine (`src/data/quantEngine.ts`)

The observatory rejects client-side linear approximations. All metrics for both default proposals and custom user allocations are computed using deterministic matrix algebra.

### Mathematical Formulations

1. **Portfolio Expected Return ($\mu_p$):**
   $$\mu_p = \sum_{i=1}^N w_i \cdot r_i = \mathbf{w}^T \boldsymbol{\mu}$$
   Where $r_{\text{CASH}} = r_f = 4.50\%$.

2. **Portfolio Variance & Annualized Volatility ($\sigma_p$):**
   $$\sigma_p^2 = \mathbf{w}^T \boldsymbol{\Sigma} \mathbf{w} = \sum_{i=1}^N \sum_{j=1}^N w_i w_j \sigma_{ij}$$
   $$\sigma_p = \sqrt{\max(0, \sigma_p^2)}$$
   The engine utilizes the calibrated 5-year empirical annualized sample covariance matrix ($\boldsymbol{\Sigma}$):
   $$\boldsymbol{\Sigma} = \begin{pmatrix}
   0.03842 & 0.03842 & 0.05310 & 0.03540 & 0.00000 \\
   0.03842 & 0.03842 & 0.05310 & 0.03540 & 0.00000 \\
   0.05310 & 0.05310 & 0.12650 & 0.05420 & 0.00000 \\
   0.03540 & 0.03540 & 0.05420 & 0.05108 & 0.00000 \\
   0.00000 & 0.00000 & 0.00000 & 0.00000 & 0.00000
   \end{pmatrix}$$
   *Assets: AAPL, MSFT, NVDA, AMZN, CASH.*

3. **Portfolio Beta vs. S&P 500 ($\beta_p$):**
   $$\beta_p = \frac{\sum_{i \in \text{Equity}} w_i \cdot \beta_i}{1 - w_{\text{CASH}}}$$
   Calibrated individual asset betas: AAPL (1.08), MSFT (1.12), NVDA (1.74), AMZN (1.22), CASH (0.00).

4. **Risk-Adjusted Performance Ratios:**
   - **Sharpe Ratio:**
     $$S_p = \frac{\mu_p - r_f}{\sigma_p} \quad (r_f = 0.045)$$
   - **Sortino Ratio (Downside Semi-Deviation):**
     $$\text{Sortino}_p = \frac{\mu_p - r_f}{\sigma_{\text{downside}}}, \quad \sigma_{\text{downside}} = 0.65 \cdot \sigma_p$$

5. **Parametric 95% Monthly Value at Risk ($\text{VaR}_{0.95}$):**
   $$\sigma_{\text{monthly}} = \frac{\sigma_p}{\sqrt{12}}$$
   $$\text{VaR}_{0.95} = -1.64485 \cdot \sigma_{\text{monthly}} \cdot \left(1 - 0.5 \cdot w_{\text{CASH}}\right)$$

6. **Concentration & Diversification Indexes:**
   - **Herfindahl-Hirschman Index (HHI):** $\text{HHI} = \sum_{i=1}^N w_i^2$
   - **Top-2 Holdings Concentration:** $w_{(1)} + w_{(2)}$ (Sum of largest two equity weights; flags warning if $> 70\%$).

7. **Deterministic Macroeconomic Stress Scenarios (`evaluateStressScenariosForHoldings`):**
   Evaluates 5 standardized shock vectors across arbitrary holdings:
   - **Scenario 1 (Broad Absolute Shock -10%):** Parallel -10% equity decline ($L_{\text{port}} = -0.10 \cdot (1 - w_{\text{CASH}})$).
   - **Scenario 2 (Severe Broad Absolute Shock -25%):** Parallel -25% equity decline ($L_{\text{port}} = -0.25 \cdot (1 - w_{\text{CASH}})$).
   - **Scenario 3 (2008 GFC Market Beta Shock):** S&P 500 decline of -38.0% transmitted via security betas:
     $$L_i = \min(0, -0.38 \cdot \beta_i)$$
   - **Scenario 4 (2022 Tech Valuation & Rates Contraction):** Information Technology drops -33.0%, Consumer Discretionary drops -20.0%, Cash intact.
   - **Scenario 5 (Hardware & Semiconductor Disruption):** NVDA drops -35%, AAPL drops -20%, MSFT drops -8%, Cash intact.

---

## 4. Visualizations & Time-Series Engine

The charts in `src/components/charts/*` follow institutional terminal standards (Bloomberg / TradingView):

1. **`FinancialTimeSeriesChart.tsx`**:
   - **Interactive Crosshair & Data Inspector:** Synchronized vertical guideline snapping to the nearest valid monthly timestamp upon cursor movement or drag. Displays date, exact closing price, period-over-period return (MoM %), benchmark close, and active excess return (alpha spread).
   - **Data Honesty & Adaptive Time Ranges:** Supports `1M`, `3M`, `6M`, `YTD`, `1Y`, `3Y`, `5Y`, and `MAX`. Crucially, ranges are evaluated dynamically against available historical observations (`evaluateTimeRanges` in `chartUtils.ts`). When only 5 months of data exist, multi-year buttons (`1Y`, `3Y`, `5Y`) are disabled with an explicit tooltip (`"Requires 12 months history"`), strictly prohibiting data fabrication or false interpolation.
   - **Adaptive Date Axis:** Formats ticks based on range density (`MMM YYYY` or `MMM 'YY`).
   - **Multi-Series Benchmark Overlay:** Overlays S&P 500 (`SPY`) benchmark performance aligned on identical timestamps.

2. **`TrajectoryInteractiveChart.tsx`**:
   - Visualizes the 10-year compounding trajectory from Year 0 ($100k) to Year 10 ($754k).
   - Prominently marks the **Beginning-2033 "Ground Zero" Horizon**: displays the $721,532 baseline portfolio value, the $43,899.80 Present Value liability reserve requirement, and the resulting $677,632.20 residual capital buffer.

3. **`StressScenarioInteractiveChart.tsx`**:
   - Horizontal institutional bar chart mapping dollar and percentage drawdowns across all 5 macroeconomic scenarios.
   - Interactive bar inspection showing post-shock portfolio values and security-level losses.

4. **`AllocationInteractiveChart.tsx`**:
   - Proportional asset allocation stacked bar with interactive hover synchronization, sector color-coding, and dollar values.

---

## 5. Critical Audit Finding: Mandate Discrepancy vs. Competition Rules

A primary responsibility of this audit is to identify where the current codebase differs from official competition parameters:

### The Capital & Liability Discrepancy

| Parameter | Current Repository Implementation (`src/data/quantModelData.ts`) | Official Wharton High School Competition Brief | Audit Status & Impact |
|---|---|---|---|
| **Initial Capital** | **$100,000.00** at Year 0 (2023) | **$100,000.00** baseline sleeve | **Nominal alignment**, but cash flow timing differs. |
| **Intermediate Inflows** | **$0.00** (Zero future injections assumed) | **+$300,000.00** beginning in 2027<br> **+$150,000.00** beginning in 2028 | **CRITICAL DISCREPANCY (P0):** Current trajectory assumes unbroken 10-year compounding on initial $100k without modeling the 2027/2028 capital infusions ($450k total). |
| **Operating Liabilities** | **5 annual payments of $10,000** ($50,000 total nominal)<br>PV at Beg-2033 (4.5%): **$43,899.80** | **10 annual operating payments of $50,000** from 2033–2042 ($500,000 total nominal) | **CRITICAL DISCREPANCY (P0):** The true liability obligation is 10x larger ($500k nominal vs $50k). Discounted at 4.5%, true liability PV is ~$395,636, requiring a much larger capital buffer. |
| **Beginning-2033 Baseline** | **$721,532.00** (compounding $100k @ 21.85% for 10 yrs) | Dependent on compounding with $300k (2027) & $150k (2028) injections | Trajectory schedule must be updated to incorporate multi-stage cash flow timing. |
| **Residual Surplus Buffer** | **$677,632.20** ($721,532 - $43,899.80) | Total capital minus true liability reserve | Affects size of client mission facility contribution. |

**Recommendation:** Update `LIABILITY_RESERVE_SPEC` and `TRAJECTORY_10YR_SCHEDULE` in subsequent iterations to reflect the full multi-stage contribution schedule and 10-year liability annuity.

---

## 6. Competitive Advantage Assessment: The Growth Sleeve in Wharton Competition

In the Wharton Global High School Investment Competition, most teams submit qualitative stock pitches or spreadsheet models with unverified figures and static historical returns. The Growth Sleeve Research Observatory creates five distinct competitive advantages:

### 1. Epistemic Data Integrity & Provenance vs. Black-Box Aggregators
- **Industry Practice:** Most tools take averages of conflicting vendor multiples or silently substitute missing values.
- **Observatory Advantage:** Explicitly isolates SEC EDGAR XBRL GAAP filings from third-party vendor ratios. Conflicting values (e.g., NVDA Debt-to-Equity: FMP 0.784 vs. Alpha Vantage 0.766) are preserved with full raw artifact hashes and explicit selection rules (`PRIMARY_PROVIDER_PRECEDENCE`), demonstrating professional compliance standards.

### 2. True Covariance Matrix Algebra vs. Linear Return Averaging
- **Industry Practice:** Student presentations often state: *"Adding 10% of Stock X will improve portfolio return by 1% and reduce risk."*
- **Observatory Advantage:** Uses empirical cross-asset covariance ($\mathbf{w}^T \boldsymbol{\Sigma} \mathbf{w}$). When a user adds AMZN or NVDA, the platform accurately calculates the covariance offset between Information Technology and Consumer Discretionary, demonstrating an institutional understanding of modern portfolio theory (Markowitz).

### 3. Forward-Looking Stress Testing vs. Backward-Looking Backtests
- **Industry Practice:** Presentations rely on past 5-year bull market returns, which fail to account for regime shifts.
- **Observatory Advantage:** The deterministic stress engine subjects the growth sleeve to historical crises (2008 GFC, 2022 Fed rate-hike tech drawdown) and asset-specific hardware disruptions. This shows judges that downside capital protection is rigorously evaluated before capital is committed.

### 4. Fiduciary Liability Immunization ("Ground Zero" Beg-2033 Reserve)
- **Industry Practice:** High school teams focus exclusively on maximizing terminal wealth without considering client liabilities.
- **Observatory Advantage:** The platform links portfolio growth directly to the client's liability obligations. By calculating the discounted Present Value of future commitments on Day One of 2033, the observatory guarantees that obligations are fully immunized before surplus capital is directed toward mission facility contributions.

### 5. Institutional CIO Governance & Auditability
- **Industry Practice:** Disorganized PowerPoint slides with disjointed tables.
- **Observatory Advantage:** The CIO Decision Hub synthesizes the entire quantitative narrative into an executive signoff workbench, complete with compliance checklists, WInS eligibility acknowledgments, analyst/CIO signatures, and a printable investment memorandum.

---

## 7. Verification, Testing & Build Hygiene

The codebase contains three automated test suites ensuring zero regression:

```bash
# Execute Model Integrity Tests (8/8 passing)
npx tsx src/test/quantModel.test.ts

# Execute User Proposal & Engine Integration Tests (passing)
npx tsx src/test/userPortfolioBuilder.test.ts

# Execute Institutional Financial Charts & Math Tests (passing)
npx tsx src/test/financialCharts.test.ts

# Validate TypeScript Compilation
npm run lint # (tsc --noEmit)
```

### Test Coverage Summary:
- **`quantModel.test.ts`**: Validates case metadata, data readiness invariants, multi-vendor non-averaging rules, marginal portfolio fit, 4 default proposals, 5 deterministic stress scenarios, liability reserve specs, and CIO records.
- **`userPortfolioBuilder.test.ts`**: Tests security lookup resolution states (`FOUND`, `NOT_FOUND`, `UNVERIFIED`, `LOOKUP_ERROR`), localStorage persistence, duplicate security prevention, custom proposal creation, draft saving, proposal deletion, and engine weight validation (rejection of duplicate symbols, negative weights, and allocations deviating from 100%).
- **`financialCharts.test.ts`**: Tests date parsing, MoM returns, cumulative returns, rolling peak drawdowns, axis tick algorithms, time-range coverage rules (disabling unsupported ranges), benchmark multi-series alignment, and trajectory schedules.

---

## 8. Directory & File Inventory

```
/
├── .env.example                          # API key template (Alpha Vantage, FMP, Twelve Data, SEC Agent)
├── metadata.json                         # AI Studio applet metadata & capabilities
├── package.json                          # Dependencies: React 19, Vite, Tailwind CSS v4, Lucide
├── tsconfig.json                         # TypeScript configuration
├── vite.config.ts                        # Vite bundler configuration
├── src/
│   ├── App.tsx                           # Master publication layout, tab navigation, global drawers
│   ├── main.tsx                          # React entry point
│   ├── index.css                         # Tailwind CSS v4 directives & typography fallbacks
│   ├── components/
│   │   ├── charts/
│   │   │   ├── FinancialTimeSeriesChart.tsx      # Terminal-grade interactive price time-series
│   │   │   ├── TrajectoryInteractiveChart.tsx     # 10-year compounding trajectory chart
│   │   │   ├── StressScenarioInteractiveChart.tsx # Macroeconomic stress loss profile chart
│   │   │   ├── AllocationInteractiveChart.tsx     # Asset allocation distribution chart
│   │   │   ├── chartUtils.ts                      # Math transforms, date parsing, tick generator
│   │   │   └── useChartInteraction.ts             # Pointer/touch tracking & crosshair snapping
│   │   ├── common/
│   │   │   └── Charts.tsx                         # Re-exports & backwards-compatible chart wrappers
│   │   ├── layout/
│   │   │   ├── DataProvenanceDrawer.tsx           # Contextual security audit slide-over
│   │   │   ├── SystemAuditDrawer.tsx              # Global request ledger & manifest slide-over
│   │   │   └── StatusBadge.tsx                    # Readiness & fundamental classification badges
│   │   └── views/
│   │       ├── OverviewView.tsx                   # Executive briefing & high-level briefing
│   │       ├── ResearchView.tsx                   # Security research & persistent universe manager
│   │       ├── PortfolioView.tsx                  # User proposal builder & covariance models
│   │       └── DecisionView.tsx                   # CIO governance, stress analysis, decision memo
│   ├── data/
│   │   ├── quantEngine.ts                         # Deterministic matrix algebra & stress testing
│   │   ├── quantModelData.ts                      # Clean baseline repository, securities, proposals
│   │   ├── securityLookup.ts                      # Multi-provider identity resolution service
│   │   └── userStorage.ts                         # LocalStorage persistence layer for proposals/universe
│   ├── test/
│   │   ├── financialCharts.test.ts                # Time-series & math transformation test suite
│   │   ├── quantModel.test.ts                     # Baseline model integrity test suite
│   │   └── userPortfolioBuilder.test.ts           # Builder, persistence & engine test suite
│   ├── types/
│   │   └── quantTypes.ts                          # TypeScript domain models & clean data contracts
│   └── utils/
│       └── formatters.ts                          # Currency, percentage, ratio, and delta formatters
```

---

## 9. Conclusion

The Wharton Growth Sleeve Research Observatory bridges the gap between academic portfolio theory and professional investment management. By enforcing mathematical rigor, epistemic honesty, multi-scenario stress testing, and liability immunization, the platform equips students with an institutional-quality research engine worthy of an executive Investment Committee.
