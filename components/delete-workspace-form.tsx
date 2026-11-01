"use client";

import { useRef, useState, useTransition } from "react";

// H1: deleting a workspace must never happen on a single click.
// First click only opens confirmation. The final action is disabled
// until the workspace name is typed exactly, Cancel returns focus to
// the first button, and the action is disabled while pending.
export default function DeleteWorkspaceForm({
  workspaceName,
  onDelete,
}: {
  workspaceName: string;
  onDelete: (formData: FormData) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!confirming) {
    return (
      <button
        ref={firstButtonRef}
        type="button"
        onClick={() => {
          setConfirming(true);
          setTyped("");
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="rounded-lg border border-[#d98c8c]/40 bg-[#2a1515] px-4 py-3 text-sm font-medium text-[#d98c8c] hover:border-[#d98c8c]"
      >
        Delete workspace
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        startTransition(() => onDelete(formData));
      }}
      className="space-y-3"
    >
      <p className="text-sm text-ivory">
        Delete <strong>{workspaceName}</strong> permanently?
      </p>
      <p className="text-sm text-muted">
        This removes its agents, tasks, reports, and approvals permanently.
        This cannot be undone.
      </p>
      <div>
        <label
          htmlFor="delete-confirm-name"
          className="text-sm font-medium text-ivory"
        >
          Type {workspaceName} to confirm
        </label>
        <input
          ref={inputRef}
          id="delete-confirm-name"
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="mt-1.5 w-full rounded-lg border border-white/15 bg-coal px-4 py-3 text-base text-ivory placeholder:text-muted focus:border-gold"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={typed !== workspaceName || pending}
          className="rounded-lg border border-[#d98c8c]/40 bg-[#2a1515] px-4 py-3 text-sm font-medium text-[#d98c8c] hover:border-[#d98c8c] disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirming(false);
            setTyped("");
            setTimeout(() => firstButtonRef.current?.focus(), 0);
          }}
          className="rounded-lg border border-white/15 bg-coal px-4 py-3 text-sm font-medium text-ivory hover:border-gold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
