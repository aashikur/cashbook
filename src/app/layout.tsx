import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cashbook.ashikbuilds.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CashBook - Modern Financial & Expense Tracker",
    template: "%s | CashBook",
  },
  description:
    "Clean, multi-tenant offline-first expense ledger with real-time analytics, receipt management, and 15-year data longevity.",
  applicationName: "CashBook",
  keywords: [
    "CashBook",
    "Expense Tracker",
    "Ledger",
    "Money Management",
    "Accounting",
    "PWA",
    "Offline-first",
  ],
  authors: [{ name: "CashBook Team" }],
  creator: "CashBook",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "CashBook",
    title: "CashBook - Modern Financial & Expense Tracker",
    description:
      "Clean, multi-tenant offline-first expense ledger with real-time analytics, receipt management, and 15-year data longevity.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CashBook - Financial Management Dashboard",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CashBook - Modern Financial & Expense Tracker",
    description:
      "Clean, multi-tenant offline-first expense ledger with real-time analytics, receipt management, and 15-year data longevity.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-canvas text-txt-main min-h-screen`}
      >
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
