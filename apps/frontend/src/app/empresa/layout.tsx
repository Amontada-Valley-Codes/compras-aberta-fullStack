import type { ReactNode } from "react";
import { NoupeWidget } from "@/components/NoupeWidget";

export default function EmpresaLayout({ children }: { children: ReactNode }) {
  return <>
    <NoupeWidget />
    {children}
  </>;
}
