import { Metadata } from "next";

export const metadata: Metadata = {
  title: "文字起こしチェックリスト",
};

export default function ChecklistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
