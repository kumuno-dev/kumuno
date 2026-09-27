import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oshigoto Kit | 社内システムを、AIと作る。",
  description:
    "業務を知っている人とAIが、一緒に業務システムを作るための開発基盤。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
