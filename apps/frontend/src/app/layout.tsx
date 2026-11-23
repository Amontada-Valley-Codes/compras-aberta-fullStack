import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./css/globals.css";

// O fallback termina em sans-serif: sem ele, se o Inter não carregar e a
// máquina não tiver Arial (comum no Linux), o navegador cai numa fonte serifada.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

import QueryProvider from "./providers/QueryProvider";

export const metadata: Metadata = {
  title: "Compras Abertas | Transparência que movimenta",
  description:
    "Oportunidades públicas, dados transparentes e desenvolvimento para a economia local.",
  icons: {
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon-32.png?v=2", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/favicon-32.png?v=2",
    apple: { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" className={inter.variable}>
      <body className={inter.className}>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
