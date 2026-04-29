# DataFirm — Financial Intelligence MVP

An automated financial statement analysis tool for Nigerian businesses. Upload a multi-period income statement and balance sheet to receive instant variance analysis, key financial ratios, anomaly flags, and a plain-English FP&A diagnostic summary.

## What It Does

### Five Analysis Tabs

| Tab | What You Get |
|---|---|
| **Overview** | P&L bar chart across periods + margin trend lines (gross, EBIT, net) |
| **Ratios** | 10 financial ratios with colour-coded risk benchmarks |
| **Variance** | Year-on-year variance table (₦ and %) with waterfall bar chart |
| **Anomalies** | Automated flags at high / medium / low severity |
| **Diagnostic** | Plain-English FP&A summary contextualised to Nigerian macro conditions |

### Ratios Computed

- Gross Margin, EBIT Margin, Net Profit Margin
- Current Ratio, Quick Ratio
- Debt-to-Equity
- Asset Turnover
- Return on Equity (ROE), Return on Assets (ROA)
- Interest Coverage

### Anomaly Detection Rules

- COGS growing faster than revenue (margin compression)
- Gross margin deterioration > 4pp year-on-year
- Receivables growing faster than sales (collection risk)
- Profit without cash conversion (working capital absorption)
- Debt-to-equity above 2.5x
- Interest coverage below 1.5x
- Current ratio below 1.0 (negative working capital)
- Elevated overhead ratio

### Diagnostic Engine

Generates a plain-English summary that:
- Quantifies revenue growth and margin compression
- Contextualises findings against Nigeria-specific macro pressures (naira depreciation, PMS costs, CBN rate cycle)
- Flags the number of high-severity issues with recommended actions

## Demo Data

Pre-loaded with a Nigerian SME income statement and balance sheet across FY 2022, FY 2023, and FY 2024 (amounts in ₦ millions). Drag-and-drop CSV upload zone is wired up for future integration.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Recharts** — BarChart, LineChart with Cell-level colouring
- **Tailwind CSS**
- All analysis runs client-side — no data leaves the browser

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

Built by [Muhammed Adediran](https://adediran.xyz/contact)
