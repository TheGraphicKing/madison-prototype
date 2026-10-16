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
const paletteScript = `try{var d=document.documentElement,p=localStorage.getItem('mad_palette'),m=localStorage.getItem('mad_mode');if(!/^(graphite|harbor|mist)$/.test(p||''))p='graphite';if(m!=='light'&&m!=='dark'){m=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';localStorage.setItem('mad_mode',m)}d.dataset.palette=p;d.dataset.mode=m}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-palette="graphite" data-mode="light" className={`${satoshi.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: paletteScript }} />
      </head>
      <body>
        <AppShell ask={<AskMadison />}>{children}</AppShell>
      </body>
    </html>
  );
}
