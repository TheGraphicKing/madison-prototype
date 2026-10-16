import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";

// Satoshi (Fontshare, free for commercial use), self-hosted. Variable, 300 to 900.
export const satoshi = localFont({
  src: "../fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
});

// JetBrains Mono, the Lyzr brand's mono: labels, ids, citations, table numbers.
export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jbm",
  display: "swap",
});
