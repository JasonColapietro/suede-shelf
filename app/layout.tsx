import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: "Suede Shelf: let AI assistants check out at your store with PayPal",
  description:
    "Suede Shelf reads your product pages and publishes a storefront that ChatGPT, Claude and any MCP assistant can shop. Customers approve and pay on PayPal; money lands in your PayPal account.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <header className="border-b border-rule">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 font-medium">
              <Image src="/suede-mark.png" alt="" width={28} height={28} priority />
              <span>
                Suede <span className="display text-lg">Shelf</span>
              </span>
            </Link>
            <span className="rounded-full border border-rule px-2.5 py-1 font-mono text-xs text-ink-2">PayPal Sandbox</span>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-rule">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-3 sm:flex-row sm:justify-between sm:px-6">
            <p>Built by Suede AI for the PayPal AI Hackathon. Open source under the MIT license.</p>
            <a className="underline underline-offset-4 hover:text-ink" href="https://github.com/JasonColapietro/suede-shelf">
              Source on GitHub
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
