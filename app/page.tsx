import { MarketingPage } from "@/components/marketing";

// Public homepage, integrated from the zip homepage only.
// The prototype's own header was removed because the real app layout
// already renders a session-aware header (Sign in / Get started when
// signed out, Workspaces when signed in). All signup and login links
// in the homepage point at the real backend routes, and demo links
// point at the on-page interactive preview, not at a fake dashboard.
// No prototype backend, store, or localStorage demo data was copied.
export default function Home() {
  return <MarketingPage />;
}
