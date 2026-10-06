import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Caveat } from "next/font/google";
import "./globals.css";

const heading = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});
const body = Inter({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const accent = Caveat({ variable: "--font-accent", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "MemoryLetter", template: "%s · MemoryLetter" },
  description: "Interactive digital memory letters.",
  // Safe default: nothing is indexable unless a route explicitly opts in.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf4ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${accent.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
