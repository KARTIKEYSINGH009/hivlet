"use client";

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

  const nav = [
    { href: `${base}/overview`, label: "Overview" },
    { href: `${base}/tasks`, label: "Tasks" },
    { href: `${base}/agents`, label: "Agents" },
    { href: `${base}/reports`, label: "Reports" },
    { href: `${base}/approvals`, label: "Approvals" },
    { href: `${base}/activity`, label: "Activity" },
    { href: `${base}/settings`, label: "Settings" },
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 bg-ink px-4 py-5 text-ivory sm:w-60">
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
          className="mt-2 w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-ivory focus:border-gold focus:outline-none"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <p className="mt-2 px-2 text-xs text-muted">
          Viewing: <span className="text-ivory">{workspaceName}</span>
        </p>
      </div>

      <nav className="flex flex-row gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
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

      <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
        <Link
          href="/dashboard"
          className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-ivory"
        >
          All workspaces
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
