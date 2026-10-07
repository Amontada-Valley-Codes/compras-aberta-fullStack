import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./css/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

import QueryProvider from "./providers/QueryProvider";

export const metadata: Metadata = {
  title: "Compras Abertas | Transparência que movimenta",
  description:
    "Oportunidades públicas, dados transparentes e desenvolvimento para a economia local.",
  icons: {
    icon: "/logos/logo-symbol.png",
    shortcut: "/logos/logo-symbol.png",
    apple: "/logos/logo-symbol.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <head>
        <link rel="icon" href="/logos/logo-symbol.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
