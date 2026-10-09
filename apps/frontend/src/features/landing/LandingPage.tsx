"use client";

import Script from "next/script";
import { ClosingCtaSection } from "./sections/closing-cta";
import { DataExplorerSection } from "./sections/data-explorer";
import { FaqSection } from "./sections/faq";
import { LandingFooter } from "./sections/footer";
import { LandingHeader } from "./sections/header";
import { ManualWorkSection } from "./sections/manual-work";
import { StepsSection } from "./sections/steps";

export function LandingPage() {
  return (
    <div className="public-site">
      <LandingHeader />
      <main>
        <DataExplorerSection />
        <ManualWorkSection />
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
