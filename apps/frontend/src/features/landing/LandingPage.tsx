"use client";

import { RefObject, useRef } from "react";
import Script from "next/script";
import { ClosingCtaSection } from "./sections/closing-cta";
import { DataExplorerSection } from "./sections/data-explorer";
import { AudiencesSection } from "./sections/audiences";
import { FaqSection } from "./sections/faq";
import { LandingFooter } from "./sections/footer";
import { LandingHeader } from "./sections/header";
import { HowItWorksSection } from "./sections/how-it-works";
import { PlansSection } from "./sections/plans";

const NOUPE_CHATBOT_URL =
  process.env.NEXT_PUBLIC_NOUPE_CHATBOT_URL ||
  "https://www.noupe.com/embed/01a0c0bf7d1070008c519ce4b0af52a479ec.js";

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  // useScrollReveal(rootRef);
  
  return (
    <div className="public-site" ref={rootRef}>
      <LandingHeader />
      <main>
        <DataExplorerSection />
        <AudiencesSection />
        <HowItWorksSection />
        <PlansSection />
        <FaqSection />
        <ClosingCtaSection />
      </main>
      <LandingFooter />
      {NOUPE_CHATBOT_URL && (
        <Script
          id="noupe-chatbot"
          src={NOUPE_CHATBOT_URL}
          strategy="afterInteractive"
        />
      )}
    </div>
  );
}

