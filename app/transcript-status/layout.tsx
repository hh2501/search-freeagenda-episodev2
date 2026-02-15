import { Metadata } from "next";

export const metadata: Metadata = {
  title: "文字起こし修正状況",
};

export default function TranscriptStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
