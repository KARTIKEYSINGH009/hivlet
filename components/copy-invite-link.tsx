"use client";

import { useEffect, useState } from "react";

// Shows a workspace's shareable invite link and copies it on tap.
// The link resolves to /join/[code], which adds the signed-in visitor as a member.
export default function CopyInviteLink({ code }: { code: string }) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLink(`${window.location.origin}/join/${code}`);
  }, [code]);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the link is still visible to copy manually.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">
        {link || `…/join/${code}`}
      </code>
      <button
        onClick={copy}
        disabled={!link}
        className="shrink-0 rounded-lg border border-brass-line px-3 py-2 text-xs font-medium text-brass hover:bg-brass-tint disabled:opacity-50"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
