"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PRODUCT_NAME } from "@/lib/brand";

// Dark sidebar for the workspace area. Client component only so the active
// nav item and the workspace selector can react without a round trip.
export default function WorkspaceSidebar({
  workspaceId,
  workspaceName,
  workspaces,
}: {
  workspaceId: string;
  workspaceName: string;
  workspaces: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/workspace/${workspaceId}`;
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  // H2: a direct-linked tab must be visible on mobile, not scrolled
  // off-screen at x~467. Scroll the active tab into view on nav change.
  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [pathname]);

  const nav = [
    { href: `${base}/overview`, label: "Overview" },
    { href: `${base}/tasks`, label: "Tasks" },
    { href: `${base}/handoffs`, label: "Handoffs" },
    { href: `${base}/agents`, label: "Agents" },
    { href: `${base}/usage`, label: "Usage" },
    { href: `${base}/reports`, label: "Reports" },
    { href: `${base}/approvals`, label: "Approvals" },
    { href: `${base}/activity`, label: "Activity" },
    { href: `${base}/onboarding`, label: "Get started" },
    { href: `${base}/settings`, label: "Settings" },
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 border-b border-white/10 bg-coal px-4 py-3 text-ivory sm:w-56 sm:gap-6 sm:py-5 sm:border-b-0 sm:border-r">
      <Link
        href="/dashboard"
        className="px-2 text-sm font-bold uppercase tracking-[0.25em] text-gold"
      >
        {PRODUCT_NAME}
      </Link>

      <div>
        <label
          htmlFor="ws-select"
          className="px-2 text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Workspace
        </label>
        <select
          id="ws-select"
          value={workspaceId}
          onChange={(e) =>
            router.push(`/workspace/${e.target.value}/overview`)
          }
          className="mt-2 w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-ivory focus:border-gold"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <p className="mt-2 hidden px-2 text-xs text-muted sm:block">
          Viewing: <span className="text-ivory">{workspaceName}</span>
        </p>
      </div>

      <nav className="flex flex-row gap-1 overflow-x-auto py-1 sm:flex-col sm:overflow-visible">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={active ? activeLinkRef : undefined}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm ${
                active
                  ? "bg-white/10 font-medium text-gold-soft"
                  : "text-muted hover:bg-white/5 hover:text-ivory"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <details className="sm:hidden">
        <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm text-muted">
          Menu
        </summary>
        <div className="flex flex-col gap-1 pt-1">
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-ivory"
          >
            All workspaces
          </Link>
          <Link
            href="/my-work"
            className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-ivory"
          >
            My work
          </Link>
          <Link
            href="/settings"
            className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-ivory"
          >
            My account
          </Link>
        </div>
      </details>
      <div className="mt-auto hidden flex-col gap-1 border-t border-white/10 pt-4 sm:flex">
        <Link
          href="/dashboard"
          className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-ivory"
        >
          All workspaces
        </Link>
        <Link
          href="/my-work"
          className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-ivory"
        >
          My work
        </Link>
        <Link
          href="/settings"
          className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-ivory"
        >
          My account
        </Link>
      </div>
    </aside>
  );
}
