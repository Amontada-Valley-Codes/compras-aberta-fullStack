"use client";

import Script from "next/script";
import { ClosingCtaSection } from "./sections/closing-cta";
import { DataExplorerSection } from "./sections/data-explorer";
import { AudiencesSection } from "./sections/audiences";
import { FaqSection } from "./sections/faq";
import { LandingFooter } from "./sections/footer";
import { LandingHeader } from "./sections/header";
import { HowItWorksSection } from "./sections/how-it-works";

export function LandingPage() {
  return (
    <div className="public-site">
      <LandingHeader />
      <main>
        <DataExplorerSection />
        <AudiencesSection />
        <HowItWorksSection />
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
