import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Compras Abertas",
  description: "Plataforma de compras abertas",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
