import { Suspense } from "react";
import type { Metadata } from "next";
import { Login } from "@/app/components/auth/login";

export const metadata: Metadata = {
  title: "Entrar | Compras Abertas",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <Suspense fallback={<div className="auth-page"><div className="auth-shell">Carregando...</div></div>}>
      <Login next={next} />
    </Suspense>
  );
}
