import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist-sans"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-geist-mono"
});

export const metadata: Metadata = {
  title: "Nesty Console",
  description: "Gateway control panel for NestyAI",
  icons: {
    icon: [
      { url: "/NestyAI_Logo.svg", type: "image/svg+xml" },
      { url: "/NestyAI_Logo.png", type: "image/png" }
    ],
    shortcut: ["/NestyAI_Logo.svg"],
    apple: ["/NestyAI_Logo.png"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
