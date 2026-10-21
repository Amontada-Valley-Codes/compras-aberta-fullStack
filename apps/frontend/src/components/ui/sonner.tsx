"use client";

import type { CSSProperties } from "react";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// A barra de progresso (css/toast.css) lê --toast-duration para esvaziar no
// mesmo ritmo em que o sonner fecha o toast.
const TOAST_DURATION_MS = 4500;

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      duration={TOAST_DURATION_MS}
      closeButton
      gap={12}
      offset={20}
      className="app-toaster"
      style={{ "--width": "380px", "--toast-duration": `${TOAST_DURATION_MS}ms` } as CSSProperties}
      icons={{
        success: <CircleCheck size={18} strokeWidth={2.25} />,
        info: <Info size={18} strokeWidth={2.25} />,
        warning: <TriangleAlert size={18} strokeWidth={2.25} />,
        error: <CircleAlert size={18} strokeWidth={2.25} />,
        loading: <LoaderCircle size={18} strokeWidth={2.25} className="animate-spin" />,
      }}
      {...props}
    />
  );
}

export { toast } from "sonner";
