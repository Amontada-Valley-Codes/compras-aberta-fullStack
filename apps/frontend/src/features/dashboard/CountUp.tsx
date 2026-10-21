"use client";

import { useEffect, useRef } from "react";

type CountUpProps = {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  delay?: number;
};

function format(value: number, decimals: number, suffix: string) {
  return (
    value.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + suffix
  );
}

// Número que conta até o valor (ease-out) na entrada do painel e ao mudar.
// Escreve direto no DOM a cada quadro em vez de usar estado: assim a
// animação não re-renderiza o componente (nem os gráficos ao redor) 60x/s.
// Começa em 0 (inclusive no HTML do servidor) para não piscar o valor final
// antes da contagem; com movimento reduzido, mostra o valor final direto.
export function CountUp({ value, decimals = 0, suffix = "", duration = 1100, delay = 0 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const from = fromRef.current;
    fromRef.current = value;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || from === value) {
      element.textContent = format(value, decimals, suffix);
      return;
    }

    let frame = 0;
    let start: number | null = null;
    element.textContent = format(from, decimals, suffix);

    const step = (now: number) => {
      start ??= now;
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = format(from + (value - from) * eased, decimals, suffix);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    const timeout = window.setTimeout(() => {
      frame = requestAnimationFrame(step);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [value, decimals, suffix, duration, delay]);

  return <span ref={ref}>{format(0, decimals, suffix)}</span>;
}
