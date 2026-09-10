import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "旅伴AI｜懂你的智能旅行搭子",
  description: "输入目的地与旅行偏好，生成可编辑的逐日攻略，并通过地图、天气、路况和实景信息轻松决策。",
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
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
