"use client";

import { useRef } from "react";
import Script from "next/script";
import { ClosingCtaSection } from "./sections/closing-cta";
import { DataExplorerSection } from "./sections/data-explorer";
import { DataProcessSection } from "./sections/data-process";
import { FaqSection } from "./sections/faq";
import { LandingFooter } from "./sections/footer";
import { LandingHeader } from "./sections/header";
import { HeroSection } from "./sections/hero";
import { StepsSection } from "./sections/steps";
import { useScrollReveal } from "./useScrollReveal";

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollReveal(rootRef);

  return (
    <div className="public-site" ref={rootRef}>
      <LandingHeader />
      <main>
        <HeroSection />
        <DataExplorerSection />
        <DataProcessSection />
        <StepsSection />
        <FaqSection />
        <ClosingCtaSection />
      </main>
      <LandingFooter />
      <Script
        id="noupe-chatbot"
        src="https://www.noupe.com/embed/01a0c0bf7d1070008c519ce4b0af52a479ec.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
