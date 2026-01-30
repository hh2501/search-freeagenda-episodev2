import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Noto_Sans_JP } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import CriticalCSS from "./components/CriticalCSS";
import "./globals.css";

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false },
);

const notoSansJP = Noto_Sans_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "フリーアジェンダのあの回",
  description:
    "「フリーアジェンダのあの回」は、思い出せないエピソードを簡単に見つけられる非公式の検索ツールです。トーク内容の細部まで、文字起こしから検索が可能です。",
  icons: {
    icon: "/Thumbnail_image.jpg",
    shortcut: "/Thumbnail_image.jpg",
    apple: "/Thumbnail_image.jpg",
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
        <link rel="preload" href="/Thumbnail_image.jpg" as="image" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body className={notoSansJP.className}>
        <NextTopLoader
          color="#304d5f"
          initialPosition={0.1}
          crawlSpeed={100}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #304d5f,0 0 5px #304d5f"
        />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
