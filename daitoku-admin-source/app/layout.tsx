import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "セコカン｜ダイトク運営管理",
  description: "契約会社・現場・利用者・請求を一元管理。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
