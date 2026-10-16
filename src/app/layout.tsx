import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Madison",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-palette="graphite">
      <body>{children}</body>
    </html>
  );
}
