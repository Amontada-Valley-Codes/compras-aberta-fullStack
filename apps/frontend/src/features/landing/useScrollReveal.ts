"use client";

import { useEffect, type RefObject } from "react";

// Revela gradualmente, conforme a rolagem, todo elemento com [data-reveal]
// dentro do container: ele ganha .is-visible ao entrar na tela (uma vez só).
// O CSS (app/css/scroll-reveal.css) só esconde os elementos depois que o
// container recebe .reveal-ready, então sem JavaScript tudo aparece normal.
export function useScrollReveal(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = Array.from(container.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );

    elements.forEach((element) => observer.observe(element));
    container.classList.add("reveal-ready");

    return () => observer.disconnect();
  }, [containerRef]);
}
