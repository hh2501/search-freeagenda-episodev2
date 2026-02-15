import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import CriticalCSS from "./components/CriticalCSS";
import GoogleAnalytics from "./components/GoogleAnalytics";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: "フリーアジェンダのあの回",
    template: "%s - フリーアジェンダのあの回",
  },
  description:
    "「フリーアジェンダのあの回」は、思い出せないエピソードを簡単に見つけられる非公式の検索ツールです。トーク内容の細部まで検索が可能です。",
  icons: {
    icon: "/Compressed_Thumbnail_image.avif",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const runtime = "edge";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <CriticalCSS />
      </head>
      <body className={notoSansJP.className}>
        {children}
        <GoogleAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
