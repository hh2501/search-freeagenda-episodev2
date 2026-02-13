import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import CriticalCSS from "./components/CriticalCSS";
import GoogleAnalytics from "./components/GoogleAnalytics";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "フリーアジェンダのあの回",
  description:
    "「フリーアジェンダのあの回」は、思い出せないエピソードを簡単に見つけられる非公式の検索ツールです。トーク内容の細部まで、文字起こしから検索が可能です。",
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body className={notoSansJP.className}>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
