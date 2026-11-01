"use client";
// Team hub primitives, adapted from the prototype's team-hub/primitives.
// Same shapes (buttons, pills, panels, dialog with focus trap, meter),
// restyled on the real app's Tailwind tokens: ink, coal, raised, ivory,
// muted, gold, gold-soft. No prototype CSS classes, no store import.
import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowUpRight, X, type LucideIcon } from "lucide-react";
import { TaskStatusPill, PriorityPill } from "@/components/workspace-ui";

export function HubButton({
  children,
  onClick,
  secondary = false,
  icon: Icon,
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  icon?: LucideIcon;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={
        secondary
          ? `rounded-lg border border-white/15 bg-coal px-4 py-2 text-sm font-medium text-muted hover:border-gold ${className}`
          : `rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-soft ${className}`
      }
    >
      <span className="inline-flex items-center gap-2">
        {Icon && <Icon size={16} strokeWidth={1.7} />}
        {children}
      </span>
    </button>
  );
}

export function HubLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      prefetch={false}
      href={href}
      className="inline-flex items-center gap-1 text-sm text-gold-soft hover:text-gold"
    >
      {children}
      <ArrowUpRight size={14} />
    </Link>
  );
}

export function PersonAvatar({
  initials,
  label,
  small = false,
}: {
  initials: string;
  label: string;
  small?: boolean;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-gold/40 bg-raised font-medium text-gold-soft ${
        small ? "h-7 w-7 text-xs" : "h-10 w-10 text-sm"
      }`}
    >
      {initials}
    </span>
  );
}

export function HubStatus({ status }: { status: string }) {
  return <TaskStatusPill status={status} />;
}
export { PriorityPill };

export function PanelHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-semibold text-ivory">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function HubEmpty({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-coal px-5 py-8 text-center">
      {Icon && (
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-raised text-muted">
          <Icon size={24} strokeWidth={1.3} />
        </span>
      )}
      <h3 className="font-semibold text-ivory">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{text}</p>
      {children && <div className="mt-4 flex justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Field({
  label,
  id,
  hint,
  children,
  wide = false,
}: {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="text-sm font-medium text-ivory">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-white/15 bg-coal px-3 py-2.5 text-sm text-ivory focus:border-gold";

// Native dialog with focus trap and opener restoration, adapted from the
// prototype's HubDialog. openKey is null when closed; any non-null key
// (e.g. a task id or "search") opens it.
export function HubDialog({
  openKey,
  onClose,
  children,
}: {
  openKey: string | null;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const isOpen = !!openKey;
  useEffect(() => {
    if (!isOpen) return;
    opener.current = document.activeElement as HTMLElement | null;
    return () => {
      opener.current?.focus();
    };
  }, [isOpen]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let frame = 0;
    if (openKey) {
      if (!dialog.open) dialog.showModal();
      frame = requestAnimationFrame(() => {
        dialog
          .querySelector<HTMLElement>("[data-autofocus],input[autofocus]")
          ?.focus();
      });
    } else if (dialog.open) dialog.close();
    return () => cancelAnimationFrame(frame);
  }, [openKey]);
  const trap = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const elements = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
      ),
    ].filter((node) => node.getClientRects().length);
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === event.currentTarget)
    ) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  return (
    <dialog
      ref={ref}
      className="w-[min(620px,calc(100%-40px))] max-w-[620px] rounded-xl border border-white/15 bg-coal p-6 text-ivory"
      aria-labelledby="th-dialog-title"
      aria-describedby="th-dialog-description"
      onKeyDown={trap}
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Hivlet / Team workspace
        </span>
        <button
          type="button"
          aria-label="Close team dialog"
          onClick={onClose}
          className="rounded-lg border border-white/15 px-2 py-1 text-muted hover:border-gold"
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function Meter({
  value,
  max = 100,
  success = false,
}: {
  value: number;
  max?: number;
  success?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return (
    <span
      className="block h-1.5 w-full overflow-hidden rounded-full bg-white/10"
      role="meter"
      aria-label="Progress"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
    >
      <i
        className={`block h-full rounded-full ${success ? "bg-[#9db89a]" : "bg-gold"}`}
        style={{ width: `${pct}%` } as CSSProperties}
      />
    </span>
  );
}
