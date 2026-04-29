import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataFirm — Financial Intelligence MVP",
  description: "Upload a financial statement and receive automated variance analysis, key ratios, anomaly flags, and plain-English diagnostics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
