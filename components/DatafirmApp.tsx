"use client";

import { useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
interface IncomeRow {
  period: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  ebit: number;
  interest: number;
  ebt: number;
  tax: number;
  netProfit: number;
}

interface BalanceRow {
  period: string;
  cash: number;
  receivables: number;
  inventory: number;
  currentAssets: number;
  fixedAssets: number;
  totalAssets: number;
  currentLiabilities: number;
  longTermDebt: number;
  totalLiabilities: number;
  equity: number;
}

interface Ratios {
  grossMargin: number;
  ebitMargin: number;
  netMargin: number;
  currentRatio: number;
  quickRatio: number;
  debtEquity: number;
  assetTurnover: number;
  roe: number;
  roa: number;
  interestCoverage: number;
}

// ── Demo data (Nigerian SME — amounts in ₦ millions) ─────────────────────────
const DEMO_INCOME: IncomeRow[] = [
  { period: "FY 2022", revenue: 850, cogs: 510, grossProfit: 340, opex: 185, ebit: 155, interest: 42, ebt: 113, tax: 34, netProfit: 79 },
  { period: "FY 2023", revenue: 1120, cogs: 718, grossProfit: 402, opex: 232, ebit: 170, interest: 68, ebt: 102, tax: 31, netProfit: 71 },
  { period: "FY 2024", revenue: 1580, cogs: 1105, grossProfit: 475, opex: 310, ebit: 165, interest: 95, ebt: 70, tax: 21, netProfit: 49 },
];

const DEMO_BALANCE: BalanceRow[] = [
  { period: "FY 2022", cash: 95, receivables: 125, inventory: 88, currentAssets: 320, fixedAssets: 480, totalAssets: 800, currentLiabilities: 185, longTermDebt: 280, totalLiabilities: 465, equity: 335 },
  { period: "FY 2023", cash: 68, receivables: 198, inventory: 142, currentAssets: 420, fixedAssets: 560, totalAssets: 980, currentLiabilities: 260, longTermDebt: 380, totalLiabilities: 640, equity: 340 },
  { period: "FY 2024", cash: 42, receivables: 285, inventory: 195, currentAssets: 535, fixedAssets: 620, totalAssets: 1155, currentLiabilities: 360, longTermDebt: 490, totalLiabilities: 850, equity: 305 },
];

// ── Ratio computation ─────────────────────────────────────────────────────────
function computeRatios(inc: IncomeRow, bal: BalanceRow): Ratios {
  return {
    grossMargin: parseFloat(((inc.grossProfit / inc.revenue) * 100).toFixed(2)),
    ebitMargin: parseFloat(((inc.ebit / inc.revenue) * 100).toFixed(2)),
    netMargin: parseFloat(((inc.netProfit / inc.revenue) * 100).toFixed(2)),
    currentRatio: parseFloat((bal.currentAssets / bal.currentLiabilities).toFixed(2)),
    quickRatio: parseFloat(((bal.currentAssets - bal.inventory) / bal.currentLiabilities).toFixed(2)),
    debtEquity: parseFloat((bal.totalLiabilities / bal.equity).toFixed(2)),
    assetTurnover: parseFloat((inc.revenue / bal.totalAssets).toFixed(2)),
    roe: parseFloat(((inc.netProfit / bal.equity) * 100).toFixed(2)),
    roa: parseFloat(((inc.netProfit / bal.totalAssets) * 100).toFixed(2)),
    interestCoverage: parseFloat((inc.ebit / inc.interest).toFixed(2)),
  };
}

// ── Anomaly detection ─────────────────────────────────────────────────────────
interface Anomaly {
  severity: "high" | "medium" | "low";
  flag: string;
  detail: string;
}

function detectAnomalies(income: IncomeRow[], balance: BalanceRow[]): Anomaly[] {
  const flags: Anomaly[] = [];

  if (income.length < 2) return flags;

  const latest = income[income.length - 1];
  const prev = income[income.length - 2];
  const latestBal = balance[balance.length - 1];
  const prevBal = balance[balance.length - 2];

  const revenueGrowth = (latest.revenue - prev.revenue) / prev.revenue;
  const cogsGrowth = (latest.cogs - prev.cogs) / prev.cogs;
  const grossMarginLatest = latest.grossProfit / latest.revenue;
  const grossMarginPrev = prev.grossProfit / prev.revenue;
  const receivablesGrowth = (latestBal.receivables - prevBal.receivables) / prevBal.receivables;
  const cashTrend = latestBal.cash - prevBal.cash;

  if (cogsGrowth > revenueGrowth + 0.1)
    flags.push({ severity: "high", flag: "COGS Growing Faster Than Revenue", detail: `COGS grew ${(cogsGrowth * 100).toFixed(1)}% vs revenue ${(revenueGrowth * 100).toFixed(1)}% — margin compression risk.` });

  if (grossMarginLatest < grossMarginPrev - 0.04)
    flags.push({ severity: "high", flag: "Gross Margin Deterioration", detail: `Margin fell from ${(grossMarginPrev * 100).toFixed(1)}% to ${(grossMarginLatest * 100).toFixed(1)}% — pricing pressure or input cost spike.` });

  if (receivablesGrowth > revenueGrowth + 0.15)
    flags.push({ severity: "medium", flag: "Receivables Growing Faster Than Sales", detail: `Receivables grew ${(receivablesGrowth * 100).toFixed(1)}% vs revenue ${(revenueGrowth * 100).toFixed(1)}% — collection risk or aggressive revenue recognition.` });

  if (cashTrend < 0 && latest.netProfit > 0)
    flags.push({ severity: "medium", flag: "Profit Without Cash Conversion", detail: `Net profit is positive (₦${latest.netProfit}M) but cash fell ₦${Math.abs(cashTrend)}M — working capital absorption.` });

  const deRatio = latestBal.totalLiabilities / latestBal.equity;
  if (deRatio > 2.5)
    flags.push({ severity: "high", flag: "High Leverage", detail: `Debt-to-equity at ${deRatio.toFixed(2)}x exceeds 2.5x threshold — elevated insolvency risk.` });

  const intCov = latest.ebit / latest.interest;
  if (intCov < 1.5)
    flags.push({ severity: "high", flag: "Weak Interest Coverage", detail: `EBIT covers interest only ${intCov.toFixed(1)}x — debt service stress, especially with CBN MPR at 27.5%.` });

  if (latestBal.currentAssets / latestBal.currentLiabilities < 1)
    flags.push({ severity: "high", flag: "Negative Working Capital", detail: "Current ratio below 1.0 — company cannot cover short-term obligations with current assets." });

  if (latest.opex / latest.revenue > 0.22)
    flags.push({ severity: "low", flag: "Elevated Overhead Ratio", detail: `Opex is ${((latest.opex / latest.revenue) * 100).toFixed(1)}% of revenue — review SG&A and administrative costs.` });

  return flags;
}

// ── Variance analysis ─────────────────────────────────────────────────────────
function computeVariance(income: IncomeRow[]) {
  if (income.length < 2) return [];
  const latest = income[income.length - 1];
  const prev = income[income.length - 2];
  return [
    { item: "Revenue", current: latest.revenue, prior: prev.revenue },
    { item: "COGS", current: latest.cogs, prior: prev.cogs },
    { item: "Gross Profit", current: latest.grossProfit, prior: prev.grossProfit },
    { item: "Opex", current: latest.opex, prior: prev.opex },
    { item: "EBIT", current: latest.ebit, prior: prev.ebit },
    { item: "Net Profit", current: latest.netProfit, prior: prev.netProfit },
  ].map((row) => ({
    ...row,
    variance: row.current - row.prior,
    variancePct: parseFloat((((row.current - row.prior) / Math.abs(row.prior)) * 100).toFixed(1)),
  }));
}

// ── Generate plain-English diagnostic ────────────────────────────────────────
function generateDiagnostic(income: IncomeRow[], balance: BalanceRow[], anomalies: Anomaly[]): string {
  if (income.length === 0) return "";
  const latest = income[income.length - 1];
  const latestBal = balance[balance.length - 1];
  const ratios = computeRatios(latest, latestBal);

  const revGrowth = income.length > 1
    ? (((latest.revenue - income[income.length - 2].revenue) / income[income.length - 2].revenue) * 100).toFixed(1)
    : "N/A";

  const highSev = anomalies.filter((a) => a.severity === "high").length;
  const overallHealth = highSev >= 3 ? "Critical" : highSev >= 1 ? "At Risk" : "Healthy";

  return `**Overall Assessment: ${overallHealth}**

Revenue grew ${revGrowth}% year-on-year to ₦${latest.revenue.toLocaleString()}M, but net profit contracted to ₦${latest.netProfit.toLocaleString()}M — a ${ratios.netMargin.toFixed(1)}% net margin. Gross margin has compressed to ${ratios.grossMargin.toFixed(1)}%, suggesting input cost escalation faster than pricing power, consistent with Nigeria's naira depreciation and elevated PMS costs.

The balance sheet shows a current ratio of ${ratios.currentRatio.toFixed(2)}x and debt-to-equity of ${ratios.debtEquity.toFixed(2)}x. Interest coverage has thinned to ${ratios.interestCoverage.toFixed(1)}x — a concern given the high-interest-rate environment (CBN MPR 27.5%). Cash has declined materially despite reported profitability, pointing to working capital absorption driven by rising receivables and inventory.

${highSev > 0 ? `${highSev} high-severity flag${highSev > 1 ? "s" : ""} detected — management attention recommended on debt restructuring and receivables collection.` : "No critical flags detected. Monitor margin trends and leverage ratios closely."}`;
}

// ── Ratio Card ────────────────────────────────────────────────────────────────
function RatioCard({ label, value, unit, benchmark, description }: {
  label: string; value: number; unit?: string; benchmark?: { low: number; high: number }; description: string;
}) {
  let color = "var(--accent2)";
  let status = "";
  if (benchmark) {
    if (value >= benchmark.high) { color = "#22c55e"; status = "Good"; }
    else if (value >= benchmark.low) { color = "#f59e0b"; status = "Watch"; }
    else { color = "#ef4444"; status = "Weak"; }
  }

  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "16px" }}>
      <div style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
        {value.toFixed(2)}{unit ?? ""}
      </div>
      {status && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
          <span style={{ color, fontSize: 11, fontWeight: 600 }}>{status}</span>
        </div>
      )}
      <div style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1.5 }}>{description}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px" }}>
      <p style={{ color: "var(--accent2)", fontWeight: 700, marginBottom: 8 }}>{label}</p>
      {payload.map((p: any) => (
        p.value != null && (
          <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 4 }}>
            <span style={{ color: p.color || "var(--muted)", fontSize: 13 }}>{p.name}</span>
            <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 13 }}>₦{p.value.toLocaleString()}M</span>
          </div>
        )
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function DatafirmApp() {
  const [activeTab, setActiveTab] = useState<"overview" | "ratios" | "variance" | "anomalies" | "diagnostic">("overview");
  const [activePeriod, setActivePeriod] = useState(DEMO_INCOME.length - 1);
  const [usingDemo, setUsingDemo] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const income = DEMO_INCOME;
  const balance = DEMO_BALANCE;

  const latestInc = income[activePeriod];
  const latestBal = balance[activePeriod];
  const ratios = useMemo(() => computeRatios(latestInc, latestBal), [latestInc, latestBal]);
  const anomalies = useMemo(() => detectAnomalies(income, balance), [income, balance]);
  const variance = useMemo(() => computeVariance(income), [income]);
  const diagnostic = useMemo(() => generateDiagnostic(income, balance, anomalies), [income, balance, anomalies]);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "ratios", label: "Ratios" },
    { id: "variance", label: "Variance" },
    { id: "anomalies", label: `Anomalies (${anomalies.length})` },
    { id: "diagnostic", label: "Diagnostic" },
  ] as const;

  const severityColor = (s: string) => s === "high" ? "#ef4444" : s === "medium" ? "#f59e0b" : "#60a5fa";

  // Format diagnostic markdown-like text
  const renderDiagnostic = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} style={{ color: "var(--accent2)", fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{line.replace(/\*\*/g, "")}</p>;
      }
      if (line.trim() === "") return <br key={i} />;
      // Inline bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
          {parts.map((part, j) =>
            part.startsWith("**") ? <strong key={j} style={{ color: "var(--text)" }}>{part.replace(/\*\*/g, "")}</strong> : part
          )}
        </p>
      );
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #0b0e18 0%, #0d1220 60%, #111828 100%)", borderBottom: "1px solid var(--border)", padding: "56px 24px 48px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {["Automated Variance Analysis", "Financial Ratios", "Anomaly Detection", "Plain-English Diagnostics"].map((tag) => (
            <span key={tag} style={{ background: "rgba(200,168,58,0.12)", border: "1px solid rgba(200,168,58,0.3)", color: "var(--accent2)", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 500 }}>
              {tag}
            </span>
          ))}
        </div>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 46px)", fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>
          DataFirm — Financial Intelligence
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 620, margin: "0 auto" }}>
          Upload a financial statement and receive automated variance analysis, key ratios, anomaly flags,
          and a plain-English diagnostic summary. FP&A intelligence for Nigerian businesses.
        </p>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
          style={{
            border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 12,
            padding: "32px",
            textAlign: "center",
            marginBottom: 32,
            background: dragOver ? "rgba(200,168,58,0.05)" : "var(--surface)",
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p style={{ color: "var(--text)", fontWeight: 600, marginBottom: 8 }}>
            Drop your financial statement CSV here
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Supports income statement and balance sheet in multi-period format. Running demo data (Nigerian SME, FY 2022–2024).
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{
              padding: "10px 24px", borderRadius: 8, border: "1px solid var(--accent)",
              background: "rgba(200,168,58,0.15)", color: "var(--accent2)", fontWeight: 600,
              cursor: "pointer", fontSize: 14,
            }}>
              Browse Files
            </button>
            <button
              onClick={() => setUsingDemo(true)}
              style={{
                padding: "10px 24px", borderRadius: 8, border: "1px solid var(--border)",
                background: usingDemo ? "rgba(200,168,58,0.1)" : "transparent",
                color: usingDemo ? "var(--accent2)" : "var(--muted)",
                fontWeight: 600, cursor: "pointer", fontSize: 14,
              }}
            >
              {usingDemo ? "✓ Demo Data Active" : "Use Demo Data"}
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {income.map((row, i) => (
            <button key={row.period} onClick={() => setActivePeriod(i)}
              style={{
                padding: "8px 20px", borderRadius: 8, border: "1px solid",
                borderColor: activePeriod === i ? "var(--accent)" : "var(--border)",
                background: activePeriod === i ? "rgba(200,168,58,0.15)" : "var(--surface)",
                color: activePeriod === i ? "var(--accent2)" : "var(--muted)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              {row.period}
            </button>
          ))}
        </div>

        {/* Summary header row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Revenue", value: `₦${latestInc.revenue.toLocaleString()}M`, color: "var(--accent2)" },
            { label: "Gross Profit", value: `₦${latestInc.grossProfit.toLocaleString()}M`, color: "var(--accent2)" },
            { label: "EBIT", value: `₦${latestInc.ebit.toLocaleString()}M`, color: latestInc.ebit > 0 ? "#22c55e" : "#ef4444" },
            { label: "Net Profit", value: `₦${latestInc.netProfit.toLocaleString()}M`, color: latestInc.netProfit > 0 ? "#22c55e" : "#ef4444" },
            { label: "Total Assets", value: `₦${latestBal.totalAssets.toLocaleString()}M`, color: "var(--accent2)" },
            { label: "Equity", value: `₦${latestBal.equity.toLocaleString()}M`, color: latestBal.equity > 0 ? "#22c55e" : "#ef4444" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px" }}>
              <div style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
              <div style={{ color, fontSize: 20, fontWeight: 800 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 20px", border: "none",
                borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                background: "transparent",
                color: activeTab === tab.id ? "var(--accent2)" : "var(--muted)",
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: 14, cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px" }}>
              <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, marginBottom: 20 }}>P&L Summary (₦M)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={income}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="period" stroke="var(--muted)" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <YAxis stroke="var(--muted)" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 13, paddingTop: 12 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="rgba(200,168,58,0.7)" />
                  <Bar dataKey="grossProfit" name="Gross Profit" fill="rgba(96,165,250,0.7)" />
                  <Bar dataKey="netProfit" name="Net Profit" fill="rgba(34,197,94,0.7)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px" }}>
              <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Margin Trends (%)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={income.map((inc, i) => ({
                  period: inc.period,
                  grossMargin: parseFloat(((inc.grossProfit / inc.revenue) * 100).toFixed(1)),
                  ebitMargin: parseFloat(((inc.ebit / inc.revenue) * 100).toFixed(1)),
                  netMargin: parseFloat(((inc.netProfit / inc.revenue) * 100).toFixed(1)),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="period" stroke="var(--muted)" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <YAxis stroke="var(--muted)" tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                  <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 13, paddingTop: 12 }} />
                  <Line dataKey="grossMargin" name="Gross Margin" stroke="var(--accent)" strokeWidth={2.5} dot={{ fill: "var(--accent)", r: 5 }} />
                  <Line dataKey="ebitMargin" name="EBIT Margin" stroke="#60a5fa" strokeWidth={2.5} dot={{ fill: "#60a5fa", r: 5 }} />
                  <Line dataKey="netMargin" name="Net Margin" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: "#22c55e", r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Ratios tab */}
        {activeTab === "ratios" && (
          <div>
            <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
              Financial Ratios — {latestInc.period}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <RatioCard label="Gross Margin" value={ratios.grossMargin} unit="%" benchmark={{ low: 25, high: 35 }} description="Revenue minus direct costs. Measures pricing power and cost efficiency." />
              <RatioCard label="EBIT Margin" value={ratios.ebitMargin} unit="%" benchmark={{ low: 10, high: 18 }} description="Operating profit margin before interest and tax." />
              <RatioCard label="Net Profit Margin" value={ratios.netMargin} unit="%" benchmark={{ low: 5, high: 10 }} description="Bottom-line profitability after all costs and taxes." />
              <RatioCard label="Current Ratio" value={ratios.currentRatio} benchmark={{ low: 1, high: 1.5 }} description="Ability to meet short-term obligations. >1.5x is comfortable." />
              <RatioCard label="Quick Ratio" value={ratios.quickRatio} benchmark={{ low: 0.8, high: 1.2 }} description="Liquidity excluding inventory. More stringent than current ratio." />
              <RatioCard label="Debt/Equity" value={ratios.debtEquity} benchmark={{ low: 3, high: 2 }} description="Financial leverage. Higher = more creditor-financed." />
              <RatioCard label="Asset Turnover" value={ratios.assetTurnover} benchmark={{ low: 0.8, high: 1.2 }} description="Revenue generated per naira of assets. Efficiency measure." />
              <RatioCard label="Return on Equity" value={ratios.roe} unit="%" benchmark={{ low: 10, high: 20 }} description="Net profit as % of shareholder equity. Key investor metric." />
              <RatioCard label="Return on Assets" value={ratios.roa} unit="%" benchmark={{ low: 5, high: 10 }} description="Net profit as % of total assets. Overall asset efficiency." />
              <RatioCard label="Interest Coverage" value={ratios.interestCoverage} benchmark={{ low: 1.5, high: 3 }} description="EBIT / Interest. How comfortably debt service is met." />
            </div>
          </div>
        )}

        {/* Variance tab */}
        {activeTab === "variance" && (
          <div>
            <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Year-on-Year Variance — {income[income.length - 2]?.period} → {income[income.length - 1]?.period}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>Amounts in ₦ millions</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Line Item", "Prior Year", "Current Year", "Variance (₦M)", "Variance %"].map((h) => (
                      <th key={h} style={{ padding: "12px 16px", color: "var(--muted)", textAlign: "right", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {variance.map((row) => {
                    const isPositive = (row.item === "COGS" || row.item === "Opex")
                      ? row.variance < 0 : row.variance > 0;
                    const varColor = isPositive ? "#22c55e" : "#ef4444";
                    return (
                      <tr key={row.item} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "12px 16px", color: "var(--text)", fontWeight: 600, textAlign: "right" }}>{row.item}</td>
                        <td style={{ padding: "12px 16px", color: "var(--muted)", textAlign: "right" }}>{row.prior.toLocaleString()}</td>
                        <td style={{ padding: "12px 16px", color: "var(--accent2)", fontWeight: 600, textAlign: "right" }}>{row.current.toLocaleString()}</td>
                        <td style={{ padding: "12px 16px", color: varColor, fontWeight: 700, textAlign: "right" }}>
                          {row.variance > 0 ? "+" : ""}{row.variance.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <span style={{ background: `${varColor}20`, color: varColor, borderRadius: 4, padding: "2px 10px", fontWeight: 700, fontSize: 13 }}>
                            {row.variancePct > 0 ? "+" : ""}{row.variancePct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Waterfall-style bar chart */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "24px", marginTop: 24 }}>
              <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Variance Bar Chart</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={variance} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="item" stroke="var(--muted)" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <YAxis stroke="var(--muted)" tick={{ fill: "var(--muted)", fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                  <Bar dataKey="variancePct" name="YoY Change %">
                    {variance.map((entry, i) => (
                      <Cell key={i} fill={entry.variancePct >= 0 ? "rgba(200,168,58,0.7)" : "rgba(239,68,68,0.7)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Anomalies tab */}
        {activeTab === "anomalies" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: 16 }}>Anomaly Flags</h3>
              <span style={{ background: anomalies.some(a => a.severity === "high") ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)", color: anomalies.some(a => a.severity === "high") ? "#ef4444" : "#f59e0b", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                {anomalies.length} flags detected
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {anomalies.map((a, i) => (
                <div key={i} style={{
                  background: "var(--surface)", border: `1px solid ${severityColor(a.severity)}40`,
                  borderLeft: `4px solid ${severityColor(a.severity)}`,
                  borderRadius: 8, padding: "20px 24px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{ background: `${severityColor(a.severity)}20`, color: severityColor(a.severity), borderRadius: 4, padding: "2px 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
                      {a.severity}
                    </span>
                    <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 15 }}>{a.flag}</span>
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>{a.detail}</p>
                </div>
              ))}
              {anomalies.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px", color: "#22c55e" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
                  <p style={{ fontWeight: 700, fontSize: 18 }}>No anomalies detected</p>
                  <p style={{ color: "var(--muted)", marginTop: 8 }}>Financial statements appear consistent and within normal ranges.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Diagnostic tab */}
        {activeTab === "diagnostic" && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <h3 style={{ color: "var(--text)", fontWeight: 700, fontSize: 18 }}>Plain-English Diagnostic</h3>
              <span style={{ background: "rgba(200,168,58,0.12)", border: "1px solid rgba(200,168,58,0.3)", color: "var(--accent2)", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>
                AI-Style FP&A Summary
              </span>
            </div>
            <div style={{ maxWidth: 720 }}>
              {renderDiagnostic(diagnostic)}
            </div>

            <div style={{ marginTop: 32, padding: "20px", background: "rgba(200,168,58,0.06)", borderRadius: 8, border: "1px solid rgba(200,168,58,0.2)" }}>
              <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.8 }}>
                <strong style={{ color: "var(--accent2)" }}>Note:</strong> This diagnostic is generated from deterministic ratio and variance analysis.
                It contextualises findings against Nigerian macro conditions (naira depreciation, CBN rate cycle, input cost pressures).
                For audit purposes, all underlying figures are verifiable in the Ratios and Variance tabs above.
              </p>
            </div>
          </div>
        )}
      </div>

      <footer style={{ textAlign: "center", padding: "32px 24px", borderTop: "1px solid var(--border)", marginTop: 48 }}>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          Built by{" "}
          <a href="https://adediran.xyz/contact" style={{ color: "var(--accent)", textDecoration: "none" }}>
            Muhammed Adediran
          </a>{" "}
          · DataFirm Financial Intelligence · FP&A for Nigerian Businesses
        </p>
      </footer>
    </div>
  );
}
