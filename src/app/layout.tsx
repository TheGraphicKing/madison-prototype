import type { Metadata, Viewport } from "next";
import "./globals.css";
import { satoshi, jetbrains } from "./fonts";
import { AppShell } from "@/components/shell/app-shell";
import { AskMadison } from "@/components/ask/ask-madison";

export const metadata: Metadata = {
  title: { default: "Madison · Northgate Community Bank", template: "%s · Madison" },
  description: "Madison, Lyzr's compliance workbench for US banks. Clickable prototype with synthetic data.",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Applies the saved palette before first paint, so there is no flash.
const paletteScript = `try{var p=localStorage.getItem('mad_palette');if(p&&/^(graphite|refinery|yukon|lyzr|midnight|terminal)$/.test(p))document.documentElement.dataset.palette=p}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-palette="graphite" className={`${satoshi.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: paletteScript }} />
      </head>
      <body>
        <AppShell ask={<AskMadison />}>{children}</AppShell>
      </body>
    </html>
  );
}
