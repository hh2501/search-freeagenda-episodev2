import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false },
);

// FCP短縮: ウェイトを2つに絞り転送量と描画待ちを削減（500は400で代替）
const notoSansJP = Noto_Sans_JP({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "フリーアジェンダのあの回",
  description: "フリーアジェンダのエピソードを検索できます",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={notoSansJP.className}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
