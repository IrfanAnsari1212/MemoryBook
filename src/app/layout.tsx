import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Caveat, Playfair_Display, Lora, Nunito, Dancing_Script } from "next/font/google";
import "./globals.css";

const heading = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});
const body = Inter({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const accent = Caveat({ variable: "--font-accent", subsets: ["latin"], display: "swap" });

// Additional theme fonts (see lib/themes/fonts.ts). preload:false => the font files are only
// downloaded when a story actually uses them, so unused options cost nothing.
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], display: "swap", preload: false });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], display: "swap", preload: false });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], display: "swap", preload: false });
const dancing = Dancing_Script({ variable: "--font-dancing", subsets: ["latin"], display: "swap", preload: false });

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
    <html lang="en" className={`${heading.variable} ${body.variable} ${accent.variable} ${playfair.variable} ${lora.variable} ${nunito.variable} ${dancing.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
