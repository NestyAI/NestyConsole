import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Chakra_Petch, DM_Sans, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chakra-petch"
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono"
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
      <body className={`${chakraPetch.variable} ${dmSans.variable} ${jetBrainsMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
