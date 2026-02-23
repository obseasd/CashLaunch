import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/Header";
import { WalletProvider } from "@/context/WalletContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CashLaunch — CashTokens Launchpad",
  description:
    "Launch your CashToken with instant bonding curve liquidity on Bitcoin Cash.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-surface-0 text-text-primary min-h-screen`}
      >
        <WalletProvider>
          <Header />
          <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}
