import AuthStateListener from "@/components/AuthStateListener"
import type { Metadata } from "next"
import Navbar from "@/components/navbar"
import FacebookBubble from "@/components/FacebookBubble"
import { Analytics } from "@vercel/analytics/next"
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics"
import { Be_Vietnam_Pro, Inter, JetBrains_Mono } from "next/font/google"
import NextTopLoader from "nextjs-toploader"
import { siteConfig } from "@/config/site"
import "./globals.css"

// Inter — display/heading font (Latin + Vietnamese subset, variable font)
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
})

// Be Vietnam Pro — body font, optimised for Vietnamese diacritics
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
})

// JetBrains Mono — monospace font for code blocks and technical data
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://gendarena.com"),
  title: {
    default: `${siteConfig.name} — Đấu Trường Khởi Nghiệp Công Nghệ`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.name} — Đấu Trường Khởi Nghiệp Công Nghệ`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — Đấu Trường Khởi Nghiệp Công Nghệ`,
    description: siteConfig.description,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={`${inter.variable} ${beVietnamPro.variable} ${jetbrainsMono.variable}`}>
      <body style={{ margin: 0 }} className="font-body">
        <NextTopLoader
          color="#00F0FF"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #00F0FF, 0 0 5px #00F0FF"
          zIndex={1600}
        />
        <AuthStateListener />
        <Navbar />
        {children}
        <FacebookBubble />
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  )
}