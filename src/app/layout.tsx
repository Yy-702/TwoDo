import type { Metadata } from "next";
import { Noto_Sans_SC, Plus_Jakarta_Sans, ZCOOL_KuaiLe } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-noto-sc",
});

const zcoolKuaiLe = ZCOOL_KuaiLe({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-zcool",
});

export const metadata: Metadata = {
  title: "TwoDo",
  description: "双人协作待办应用",
  applicationName: "TwoDo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${plusJakartaSans.variable} ${notoSansSc.variable} ${zcoolKuaiLe.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
