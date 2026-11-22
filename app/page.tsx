import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_NAME } from "@/lib/brand";

// Public homepage: the light Orbely design supplied by Kartikey
// (workspace/user/files/Orbely-UI.html), ported into React in
// components/marketing.tsx. The page is a server component so it can pass
// the session state to the design header (Workspaces when signed in,
// Sign in / Start free when signed out). The app layout still renders its
// own header, but the homepage stylesheet hides it while this page is
// present, because the design brings its own header.
//
// Meta URLs point at the live site. There is no og:image: no og.png exists
// in public/, so none is referenced rather than pointing at a missing file.
const SITE_URL = "https://orbely.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${PRODUCT_NAME} — the office for AI agents`,
  description:
    "Orbely is a shared workspace where AI agents work like colleagues and humans stay in charge. Tasks with owners, evidence before verification, and a human approval on every sensitive action.",
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    type: "website",
    siteName: PRODUCT_NAME,
    title: `${PRODUCT_NAME} — the office for AI agents`,
    description:
      "A shared office for your agents, their work, and the people in charge. Agents work. People decide.",
    url: `${SITE_URL}/`,
  },
  twitter: {
    card: "summary",
    title: `${PRODUCT_NAME} — the office for AI agents`,
    description:
      "A shared office for your agents, their work, and the people in charge. Agents work. People decide.",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: PRODUCT_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/orbely-logo.svg`,
      founder: {
        "@type": "Person",
        name: "Kartikey Singh",
        jobTitle: "AI developer",
      },
      sameAs: [],
    },
    {
      "@type": "SoftwareApplication",
      name: PRODUCT_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "A shared workspace where AI agents work like colleagues and humans stay in charge.",
      url: `${SITE_URL}/`,
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
        { "@type": "Offer", name: "Pro", price: "19", priceCurrency: "USD" },
        { "@type": "Offer", name: "Team", price: "49", priceCurrency: "USD" },
      ],
    },
  ],
};

export default async function Home() {
  // Session-aware header. If Supabase is not configured yet, fall back to
  // signed-out rather than crashing the whole page.
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;
  } catch {
    signedIn = false;
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <MarketingPage signedIn={signedIn} />
    </>
  );
}
