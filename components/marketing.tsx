"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inter, Instrument_Serif } from "next/font/google";
import { PRODUCT_NAME } from "@/lib/brand";

// Fonts: next/font replaces the embedded base64 Inter / Instrument Serif
// blob from the supplied standalone file. The --font-* variables are set on
// the .orbely-home wrapper below; homepage.css maps them into --f-sans /
// --f-serif so the look stays the same.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

/* ============================================================
   Demo data — the illustrative workspace from the supplied
   design. Local only: no provider is connected, nothing is
   sent, spent or published.
   ============================================================ */

type TaskStatus = "done" | "progress" | "review" | "todo" | "failed";
type Task = {
  id: string;
  title: string;
  agent: string;
  owner: string;
  status: TaskStatus;
  desc: string;
  evidence: { text: string; ok: boolean }[];
};
type ApprovalState = "pending" | "approved" | "requested" | "verified";
type View = "tasks" | "agents" | "approvals";
type Filter = "all" | "progress" | "review" | "done" | "todo" | "failed";

const ICONS: Record<TaskStatus, string> = {
  done: "i-check-c",
  progress: "i-half",
  review: "i-doc",
  todo: "i-circle",
  failed: "i-x-c",
};
const LABELS: Record<TaskStatus, string> = {
  done: "Done",
  progress: "In progress",
  review: "In review",
  todo: "To do",
  failed: "Failed",
};
const PILL: Record<TaskStatus, string> = {
  done: "pill--done",
  progress: "pill--working",
  review: "pill--review",
  todo: "pill--todo",
  failed: "pill--failed",
};
const STATE_CLASS: Record<TaskStatus, string> = {
  done: "task__state--done",
  progress: "task__state--progress",
  review: "task__state--review",
  failed: "task__state--failed",
  todo: "",
};

const seedTasks = (): Task[] => [
  {
    id: "HV-101",
    title: "Research the audience",
    agent: "Researcher",
    owner: "Dev",
    status: "done",
    desc: "A short audience brief: who this launch is for, what they already believe, and what would make them care.",
    evidence: [
      { text: "Audience brief v2 · 3 segments", ok: true },
      { text: "Source references · 6 links checked", ok: true },
      { text: "Verified by Dev", ok: true },
    ],
  },
  {
    id: "HV-102",
    title: "Draft the launch announcement",
    agent: "Writer",
    owner: "Maya",
    status: "progress",
    desc: "A 180-word announcement in the house voice, with one clear call to action and no unsupported claims.",
    evidence: [
      { text: "Draft v1 attached", ok: true },
      { text: "Brand voice file applied", ok: true },
      { text: "Awaiting a completed run", ok: false },
    ],
  },
  {
    id: "HV-103",
    title: "Review the launch draft",
    agent: "Reviewer",
    owner: "Patrick",
    status: "review",
    desc: "The first draft is waiting for a human review. Approving here shows how a decision is gated — nothing is published by it.",
    evidence: [
      { text: "Draft v2 attached", ok: true },
      { text: "Reviewer report · 4 notes", ok: true },
      { text: "Human verification pending", ok: false },
    ],
  },
  {
    id: "HV-104",
    title: "Prepare the product brief",
    agent: "Researcher",
    owner: "Dev",
    status: "todo",
    desc: "One page: what Orbely is, who owns what, and the exact path from a task to an approved action.",
    evidence: [{ text: "No run started yet", ok: false }],
  },
  {
    id: "HV-105",
    title: "Check the source reference",
    agent: "Researcher",
    owner: "Dev",
    status: "failed",
    desc: "A source link could not be reached. The run stopped rather than guessing — failed runs never count toward usage.",
    evidence: [
      { text: "Run stopped on a timeout", ok: true },
      { text: "No output produced", ok: false },
      { text: "Retry available", ok: false },
    ],
  },
];

const AGENTS = [
  { name: "Researcher", owner: "Dev", icon: "i-sparkle", tone: "avatar" },
  { name: "Writer", owner: "Maya", icon: "i-pen", tone: "avatar avatar--brass" },
  { name: "Reviewer", owner: "Patrick", icon: "i-shield", tone: "avatar" },
];

const PRICES = {
  monthly: {
    pro: "$19",
    team: "$49",
    inr: { pro: "₹999 / month (draft)", team: "₹2,999 / month (draft)" },
  },
  yearly: {
    pro: "$15",
    team: "$39",
    inr: {
      pro: "₹799 / month, billed yearly (draft)",
      team: "₹2,399 / month, billed yearly (draft)",
    },
  },
} as const;

const STAGE_LABELS: Record<number, string> = {
  1: "The shared office",
  2: "The work, with its context",
  3: "The approval gate",
};

const FAQ = [
  {
    q: "Is this another chat window?",
    a: "No. Orbely organises work around tasks, agents, handoffs, reports and decisions. The goal is a clear next step — not a longer conversation history.",
  },
  {
    q: "Where do people fit in?",
    a: "Every agent has a human owner. People set the direction, inspect the work and review sensitive actions. Agent-reported progress and human verification stay separate — an agent saying “done” is a report, not a fact.",
  },
  {
    q: "Can I try it before connecting anything?",
    a: "Yes. The preview on this page uses illustrative local data. No provider is connected, no credentials are needed, and no external action is executed.",
  },
  {
    q: "What does it cost?",
    a: "Free covers one workspace and 100 verified runs a month. Pro and Team are proposals while we are in early access: billing is not switched on, so nothing is charged and these numbers are not a price list yet.",
  },
  {
    q: "What happens when an agent needs permission?",
    a: "It stops at an approval gate, with the exact action and payload shown. Nothing is published, sent or spent until a human approves it — and approval is permission, not proof that the action succeeded. Try it in the preview above.",
  },
  {
    q: "What if an agent’s work is wrong?",
    a: "It stays in review, not marked done. A human checks the report, requests changes, or verifies the outcome — and only that verification moves the work forward.",
  },
];

/* ============================================================
   Small helpers
   ============================================================ */

function Icon({
  name,
  className = "i",
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg className={className} aria-hidden="true" style={style}>
      <use href={`#${name}`} />
    </svg>
  );
}

function reduceMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** A number that tweens to its value once `started` is true. */
function TweenNumber({
  value,
  started,
  className,
}: {
  value: number;
  started: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const currentRef = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !started) return;
    const from = currentRef.current;
    const to = value;
    if (from === to) {
      el.textContent = String(to);
      return;
    }
    if (reduceMotion()) {
      el.textContent = String(to);
      currentRef.current = to;
      return;
    }
    const start = performance.now();
    const dur = 320;
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (to - from) * eased);
      el.textContent = String(v);
      currentRef.current = v;
      if (t < 1) raf = requestAnimationFrame(frame);
      else {
        el.textContent = String(to);
        currentRef.current = to;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [value, started]);
  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}

/** Counts up to `to` the first time it scrolls into view. */
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduceMotion() || !("IntersectionObserver" in window)) {
      el.textContent = String(to);
      return;
    }
    el.textContent = "0";
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          obs.disconnect();
          const start = performance.now();
          const dur = 900;
          const step = (now: number) => {
            const t = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = String(Math.round(to * eased));
            if (t < 1) requestAnimationFrame(step);
            else el.textContent = String(to);
          };
          requestAnimationFrame(step);
        });
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return (
    <b ref={ref} className="tnum">
      {to}
    </b>
  );
}

/* ============================================================
   The homepage
   ============================================================ */

export function MarketingPage({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();

  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navIndicatorRef = useRef<HTMLSpanElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const kineticSectionRef = useRef<HTMLElement>(null);
  const kineticTrackRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLElement>(null);
  const officeCardRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);
  const approvalRegionRef = useRef<HTMLDivElement>(null);
  const readoutsRef = useRef<HTMLDivElement>(null);
  const bandSpotRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scrolledRef = useRef(false);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [headerDark, setHeaderDark] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const [view, setViewState] = useState<View>("tasks");
  const [filter, setFilter] = useState<Filter>("all");
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [selected, setSelected] = useState<string | null>(null);
  const [approval, setApprovalState] = useState<ApprovalState>("pending");
  const [toast, setToast] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [faqOpen, setFaqOpen] = useState(0);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [readoutsStarted, setReadoutsStarted] = useState(false);
  const [bumped, setBumped] = useState<Record<string, boolean>>({});
  const [phase, setPhaseState] = useState(0);

  const say = useCallback((message: string) => setToast(message), []);

  const selectedTask = selected
    ? tasks.find((t) => t.id === selected) ?? null
    : null;
  const countInView =
    filter === "all"
      ? tasks.length
      : tasks.filter((t) => t.status === filter).length;
  const decisions = approval === "pending" ? 1 : 0;
  const filterCounts = useMemo(() => {
    const c: Record<string, number> = {
      all: tasks.length,
      done: 0,
      progress: 0,
      review: 0,
      todo: 0,
      failed: 0,
    };
    tasks.forEach((t) => {
      c[t.status] = (c[t.status] || 0) + 1;
    });
    return c;
  }, [tasks]);

  /* ---------- mobile sheet ---------- */
  const setSheet = useCallback((open: boolean) => {
    setMobileOpen(open);
    document.body.style.overflow = open ? "hidden" : "";
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet(false);
    };
    const onResize = () => {
      if (window.innerWidth > 820) setSheet(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [mobileOpen, setSheet]);

  /* ---------- one scroll loop: progress bar, kinetic band,
     scroll-driven gate scene, parallax ---------- */
  useEffect(() => {
    const bar = progressBarRef.current;
    const kineticSection = kineticSectionRef.current;
    const kineticTrack = kineticTrackRef.current;
    const scene = sceneRef.current;
    const officeCard = officeCardRef.current;
    const livePaths = scene
      ? Array.from(scene.querySelectorAll<SVGPathElement>("[data-draw]"))
      : [];
    const parallax = officeCard ? [{ el: officeCard, k: 0.16 }] : [];
    let activePhase = -1;
    let ticking = false;
    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const wide = () => window.innerWidth > 1024;

    livePaths.forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 80;
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = String(len);
    });

    const setPhase = (i: number) => {
      if (i === activePhase) return;
      activePhase = i;
      setPhaseState(i);
    };

    const frame = () => {
      ticking = false;
      const y = window.scrollY || window.pageYOffset;
      const vh = window.innerHeight;
      const scrolled = y > 8;
      if (scrolled !== scrolledRef.current) {
        scrolledRef.current = scrolled;
        setHeaderScrolled(scrolled);
      }
      if (bar) {
        const max =
          document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform =
          "scaleX(" + (max > 0 ? Math.min(1, y / max).toFixed(4) : 0) + ")";
      }
      if (kineticSection && kineticTrack && !reduceMotion()) {
        const r = kineticSection.getBoundingClientRect();
        if (r.bottom > -200 && r.top < vh + 200) {
          const span = kineticTrack.scrollWidth / 3;
          const p = clamp01((vh - r.top) / (vh + r.height));
          kineticTrack.style.transform =
            "translate3d(" + (-p * span).toFixed(1) + "px,0,0)";
        }
      }
      if (scene && wide() && !reduceMotion()) {
        const r = scene.getBoundingClientRect();
        const total = scene.offsetHeight - vh;
        if (r.top <= 0 && r.bottom >= vh && total > 0) {
          const p = clamp01(-r.top / total);
          setPhase(p < 0.34 ? 0 : p < 0.67 ? 1 : 2);
          livePaths.forEach((path) => {
            const len = path.getTotalLength ? path.getTotalLength() : 80;
            path.style.strokeDashoffset = String(len * (1 - p));
          });
        }
      } else if (scene && (!wide() || reduceMotion())) {
        livePaths.forEach((path) => {
          path.style.strokeDashoffset = "0";
        });
      }
      if (!reduceMotion() && parallax.length) {
        for (const p of parallax) {
          const r = p.el.getBoundingClientRect();
          if (r.bottom < -240 || r.top > vh + 240) continue;
          const centre = r.top + r.height / 2;
          const progress = (centre - vh / 2) / vh;
          p.el.style.transform =
            "translate3d(0," + (-progress * p.k * 100).toFixed(2) + "px,0)";
        }
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(frame);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("load", onScroll);
    };
  }, []);

  /* ---------- reveal on scroll ---------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reveals = Array.from(root.querySelectorAll(".reveal"));
    if ("IntersectionObserver" in window && !reduceMotion()) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add("is-in");
              obs.unobserve(en.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );
      reveals.forEach((el) => io.observe(el));
      return () => io.disconnect();
    }
    reveals.forEach((el) => el.classList.add("is-in"));
  }, []);

  /* ---------- active nav section ---------- */
  useEffect(() => {
    const ids = ["demo", "how", "control", "pricing", "faq"];
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (!("IntersectionObserver" in window) || !sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  /* ---------- header inverts over ink sections ---------- */
  useEffect(() => {
    const header = headerRef.current;
    const root = rootRef.current;
    if (!header || !root || !("IntersectionObserver" in window)) return;
    const zones = Array.from(
      root.querySelectorAll(".showcase, .kinetic, .band"),
    );
    if (!zones.length) return;
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) seen.add(e.target);
          else seen.delete(e.target);
        });
        setHeaderDark(seen.size > 0);
      },
      {
        rootMargin: `0px 0px -${window.innerHeight - header.offsetHeight}px 0px`,
        threshold: 0,
      },
    );
    zones.forEach((z) => io.observe(z));
    return () => io.disconnect();
  }, []);

  /* ---------- sliding nav indicator ---------- */
  useEffect(() => {
    const move = () => {
      const nav = navRef.current;
      const ind = navIndicatorRef.current;
      if (!nav || !ind) return;
      const active = nav.querySelector(
        'a[aria-current="true"]',
      ) as HTMLAnchorElement | null;
      if (!active || window.innerWidth <= 820) {
        ind.classList.remove("is-on");
        return;
      }
      const pad = parseFloat(getComputedStyle(active).paddingLeft) || 11;
      ind.style.width = Math.max(0, active.offsetWidth - pad * 2) + "px";
      ind.style.transform =
        "translateX(" + (active.offsetLeft + pad) + "px)";
      ind.classList.add("is-on");
    };
    move();
    window.addEventListener("resize", move);
    const t = setTimeout(move, 600);
    if (document.fonts?.ready) document.fonts.ready.then(move);
    return () => {
      window.removeEventListener("resize", move);
      clearTimeout(t);
    };
  }, [activeSection]);

  /* ---------- toast auto-hide ---------- */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- demo intro: read the numbers in, once ---------- */
  useEffect(() => {
    const wrap = readoutsRef.current;
    if (!wrap) return;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      setReadoutsStarted(true);
    };
    if (reduceMotion() || !("IntersectionObserver" in window)) {
      run();
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            obs.disconnect();
            run();
          }
        });
      },
      { threshold: 0.55 },
    );
    io.observe(wrap);
    const t = setTimeout(run, 2600);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  /* ---------- readout bump when a value changes ---------- */
  const prevReadouts = useRef({ agents: 3, tasks: 5, decisions: 1 });
  useEffect(() => {
    if (!readoutsStarted) return;
    const next = {
      agents: AGENTS.length,
      tasks: countInView,
      decisions,
    };
    const changed: string[] = [];
    (Object.keys(next) as (keyof typeof next)[]).forEach((k) => {
      if (prevReadouts.current[k] !== next[k]) changed.push(k);
    });
    prevReadouts.current = next;
    if (!changed.length) return;
    setBumped((b) => {
      const n = { ...b };
      changed.forEach((k) => {
        n[k] = true;
      });
      return n;
    });
    const t = setTimeout(
      () =>
        setBumped((b) => {
          const n = { ...b };
          changed.forEach((k) => {
            n[k] = false;
          });
          return n;
        }),
      700,
    );
    return () => clearTimeout(t);
  }, [readoutsStarted, countInView, decisions]);

  /* ---------- how-it-works auto-cycle ---------- */
  const stopAuto = useCallback(() => {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }, []);
  useEffect(() => {
    if (reduceMotion()) return;
    stepTimerRef.current = setInterval(() => {
      setStep((s) => (s >= 3 ? 1 : s + 1));
    }, 7000);
    return () => stopAuto();
  }, [stopAuto]);

  /* ---------- Escape closes the detail panel ---------- */
  useEffect(() => {
    if (!selected) return;
    const id = selected;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail(id);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  /* ---------- demo actions ---------- */
  const closeDetail = (id?: string | null) => {
    const backId = id ?? selected;
    setSelected(null);
    if (backId) {
      const back = taskListRef.current?.querySelector(
        `[data-task="${backId}"]`,
      ) as HTMLElement | null;
      back?.focus();
    }
  };

  const selectTask = (id: string) => {
    setSelected(id);
    requestAnimationFrame(() => {
      const app = appRef.current;
      if (!app) return;
      const rect = app.getBoundingClientRect();
      const headerH = headerRef.current?.offsetHeight ?? 0;
      if (rect.top < headerH + 8) {
        window.scrollTo({
          top: window.scrollY + rect.top - headerH - 12,
          behavior: reduceMotion() ? "auto" : "smooth",
        });
      }
    });
  };

  const setView = (v: View, focusTab = false) => {
    setViewState(v);
    if (v !== "tasks") setSelected(null);
    if (focusTab) {
      setTimeout(() => tabRefs.current[v]?.focus(), 0);
    }
  };

  const openApprovals = () => {
    setView("approvals", true);
    document
      .getElementById("demo")
      ?.scrollIntoView({
        behavior: reduceMotion() ? "auto" : "smooth",
        block: "start",
      });
  };

  const setApproval = (next: ApprovalState) => {
    setApprovalState(next);
    if (next === "verified") {
      setTasks((ts) =>
        ts.map((x) =>
          x.id === "HV-103"
            ? {
                ...x,
                status: "done" as TaskStatus,
                evidence: [
                  { text: "Draft v2 attached", ok: true },
                  { text: "Reviewer report · 4 notes", ok: true },
                  { text: "Verified by Patrick", ok: true },
                ],
              }
            : x,
        ),
      );
      say("Verified. HV-103 moved to done — evidence and permission on record.");
    } else if (next === "requested") {
      setTasks((ts) =>
        ts.map((x) =>
          x.id === "HV-103"
            ? {
                ...x,
                status: "progress" as TaskStatus,
                agent: "Writer",
                owner: "Maya",
                desc: "Changes were requested by a human, so the task went back to the Writer with the review notes attached.",
                evidence: [
                  { text: "Review notes attached", ok: true },
                  { text: "Returned to Writer", ok: true },
                  { text: "New run not started", ok: false },
                ],
              }
            : x,
        ),
      );
      say("Changes requested. HV-103 went back to the Writer with the notes attached.");
    } else if (next === "approved") {
      say("Permission recorded. Execution is tracked separately — approve is not proof.");
    }
    if (view === "approvals") {
      setTimeout(() => {
        approvalRegionRef.current
          ?.querySelector("button")
          ?.focus({ preventScroll: true });
      }, 0);
    }
  };

  const resetApproval = () => {
    setTasks(seedTasks());
    setSelected(null);
    setApprovalState("pending");
    say("Approval reset. HV-103 is back in review.");
  };

  const resetDemo = () => {
    setTasks(seedTasks());
    setApprovalState("pending");
    setFilter("all");
    setSelected(null);
    say("Preview reset to its starting state.");
  };

  const onDetailAction = (act: string) => {
    if (act === "close") return closeDetail();
    if (act === "to-approval") {
      setView("approvals", true);
      appRef.current?.scrollIntoView({
        behavior: reduceMotion() ? "auto" : "smooth",
        block: "start",
      });
      return;
    }
    if (!selectedTask) return;
    if (act === "retry") {
      setTasks((ts) =>
        ts.map((x) =>
          x.id === selectedTask.id
            ? {
                ...x,
                status: "progress" as TaskStatus,
                desc: "A fresh run is queued. The failed attempt stays visible in the trail — failures are not deleted, they are learned from.",
                evidence: [
                  { text: "Previous failure kept on record", ok: true },
                  { text: "New run queued", ok: true },
                  { text: "Result pending", ok: false },
                ],
              }
            : x,
        ),
      );
      say("Retry queued. The failed attempt stays in the history.");
      return;
    }
    if (act === "ask") {
      say(
        `Update requested from ${selectedTask.agent}. No action is executed without you.`,
      );
    }
  };

  const onTabKeyDown = (e: React.KeyboardEvent, i: number) => {
    const views: View[] = ["tasks", "agents", "approvals"];
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = (i + 1) % views.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (i - 1 + views.length) % views.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = views.length - 1;
    setView(views[next], true);
  };

  const onStepKeyDown = (e: React.KeyboardEvent, i: number) => {
    const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    let next = i;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % 3;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (i - 1 + 3) % 3;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = 2;
    setStep(next + 1);
    stopAuto();
  };

  /* ---------- capture form: no waitlist exists, so a valid email
     takes the visitor straight to the real signup flow. ---------- */
  const onCaptureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value);
    if (!valid) {
      setEmailError(true);
      emailInputRef.current?.focus();
      return;
    }
    setEmailError(false);
    router.push("/signup");
  };

  const onMagneticMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (
      !window.matchMedia("(pointer: fine)").matches ||
      reduceMotion()
    )
      return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    el.style.transform =
      "translate3d(" +
      (dx * 4).toFixed(2) +
      "px," +
      (dy * 3).toFixed(2) +
      "px,0)";
  };

  const onBandMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const spot = bandSpotRef.current;
    if (
      !spot ||
      !window.matchMedia("(pointer: fine)").matches ||
      reduceMotion()
    )
      return;
    const r = e.currentTarget.getBoundingClientRect();
    spot.style.setProperty(
      "--mx",
      (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%",
    );
    spot.style.setProperty(
      "--my",
      (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%",
    );
  };

  const statusPill = (status: TaskStatus, extra = "") => (
    <span className={`pill ${PILL[status]} ${extra}`}>
      <i className="dot" />
      {LABELS[status]}
    </span>
  );

  const visibleTasks =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const prices = PRICES[billing];

  return (
    <div
      ref={rootRef}
      className={`orbely-home ${inter.variable} ${instrumentSerif.variable}`}
    >
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="progress" aria-hidden="true">
        <div className="progress__bar" ref={progressBarRef} />
      </div>

      {/* icon sprite */}
      <svg
        width="0"
        height="0"
        style={{ position: "absolute" }}
        aria-hidden="true"
        focusable="false"
      >
        <symbol id="i-arrow-ur" viewBox="0 0 24 24">
          <path d="M7 17 17 7M9 7h8v8" />
        </symbol>
        <symbol id="i-arrow-r" viewBox="0 0 24 24">
          <path d="M4 12h15M13 6l6 6-6 6" />
        </symbol>
        <symbol id="i-arrow-l" viewBox="0 0 24 24">
          <path d="M20 12H5M11 18l-6-6 6-6" />
        </symbol>
        <symbol id="i-play" viewBox="0 0 24 24">
          <path d="M9 7.5v9l7.5-4.5z" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="9" />
        </symbol>
        <symbol id="i-check" viewBox="0 0 24 24">
          <path d="m5 12.5 4.5 4.5L19 7" />
        </symbol>
        <symbol id="i-check-c" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.3 2.4 2.4 4.6-4.9" />
        </symbol>
        <symbol id="i-circle" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" />
        </symbol>
        <symbol id="i-half" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="i-x" viewBox="0 0 24 24">
          <path d="M6 6l12 12M18 6 6 18" />
        </symbol>
        <symbol id="i-x-c" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6M15 9l-6 6" />
        </symbol>
        <symbol id="i-shield" viewBox="0 0 24 24">
          <path d="M12 3.5 5 6.2v5.4c0 4.1 2.9 7.4 7 8.9 4.1-1.5 7-4.8 7-8.9V6.2z" />
        </symbol>
        <symbol id="i-tasks" viewBox="0 0 24 24">
          <rect x="4" y="4.5" width="16" height="15" rx="2.5" />
          <path d="M8 9.5h8M8 14.5h5" />
        </symbol>
        <symbol id="i-agents" viewBox="0 0 24 24">
          <circle cx="9" cy="9" r="3.2" />
          <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
          <path d="M16 6.2a3 3 0 0 1 0 5.6M17.2 14.8c2 .5 3.3 2.2 3.3 4.7" />
        </symbol>
        <symbol id="i-doc" viewBox="0 0 24 24">
          <path d="M6 4.5h7l5 5v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z" />
          <path d="M13 4.5v5h5" />
        </symbol>
        <symbol id="i-chev" viewBox="0 0 24 24">
          <path d="m9 6 6 6-6 6" />
        </symbol>
        <symbol id="i-down" viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" />
        </symbol>
        <symbol id="i-reset" viewBox="0 0 24 24">
          <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
          <path d="M4.5 5v4h4" />
        </symbol>
        <symbol id="i-clock" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 1.8" />
        </symbol>
        <symbol id="i-alert" viewBox="0 0 24 24">
          <path d="M12 4.5 3.8 18.5h16.4z" />
          <path d="M12 10v3.4M12 16.2v.1" />
        </symbol>
        <symbol id="i-mail" viewBox="0 0 24 24">
          <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
          <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
        </symbol>
        <symbol id="i-layers" viewBox="0 0 24 24">
          <path d="m12 3.5 8.5 4.3L12 12.1 3.5 7.8z" />
          <path d="m3.5 12.5 8.5 4.3 8.5-4.3" />
          <path d="m3.5 16.8 8.5 4.2 8.5-4.2" />
        </symbol>
        <symbol id="i-pen" viewBox="0 0 24 24">
          <path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5z" />
        </symbol>
        <symbol id="i-sparkle" viewBox="0 0 24 24">
          <path d="M12 3.5 13.9 9l5.6 2-5.6 2L12 18.5 10.1 13 4.5 11l5.6-2z" />
        </symbol>
        <symbol id="i-gate" viewBox="0 0 24 24">
          <rect x="4.5" y="10" width="15" height="9.5" rx="2.5" />
          <path d="M8.5 10V7.8a3.5 3.5 0 0 1 7 0V10" />
        </symbol>
        <symbol id="i-file" viewBox="0 0 24 24">
          <path d="M7 3.5h6l4 4v13H7z" />
          <path d="M13 3.5v4h4" />
        </symbol>
        <symbol id="i-info" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11v5M12 8.2v.1" />
        </symbol>
        <symbol id="i-menu" viewBox="0 0 24 24">
          <path d="M4 7h16M4 12h16M4 17h11" />
        </symbol>
        <symbol id="i-pause" viewBox="0 0 24 24">
          <path d="M9 6v12M15 6v12" strokeWidth="2.4" />
        </symbol>
      </svg>

      <header
        className={`site-header${headerScrolled ? " is-scrolled" : ""}${headerDark ? " is-dark" : ""}`}
        id="site-header"
        ref={headerRef}
      >
        <div className="wrap header-inner">
          <a href="#top" className="brand" aria-label={`${PRODUCT_NAME} — home`}>
            <img
              src="/orbely-logo.svg"
              alt={`${PRODUCT_NAME} logo`}
              className="brand__mark"
            />
            <span className="brand__word">{PRODUCT_NAME}</span>
          </a>
          <nav className="nav" aria-label="Primary" ref={navRef}>
            <span
              className="nav-indicator"
              aria-hidden="true"
              ref={navIndicatorRef}
            />
            <a
              href="#demo"
              aria-current={activeSection === "demo" ? "true" : undefined}
            >
              Product
            </a>
            <a
              href="#how"
              aria-current={activeSection === "how" ? "true" : undefined}
            >
              How it works
            </a>
            <a
              href="#control"
              aria-current={activeSection === "control" ? "true" : undefined}
            >
              Control
            </a>
            <a
              href="#pricing"
              aria-current={activeSection === "pricing" ? "true" : undefined}
            >
              Pricing
            </a>
            <a
              href="#faq"
              aria-current={activeSection === "faq" ? "true" : undefined}
            >
              FAQ
            </a>
          </nav>
          <div className="header-actions">
            {signedIn ? (
              <Link href="/workspaces" className="btn btn--secondary">
                Workspaces
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn--ghost">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn--secondary">
                  Start free
                </Link>
              </>
            )}
            <button
              className="nav-toggle"
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="mobile-sheet"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setSheet(!mobileOpen)}
            >
              <Icon name={mobileOpen ? "i-x" : "i-menu"} />
            </button>
          </div>
        </div>
      </header>
      <div
        className={`sheet-backdrop${mobileOpen ? " is-open" : ""}`}
        id="sheet-backdrop"
        hidden={!mobileOpen}
        onClick={() => setSheet(false)}
      />
      <div
        className={`mobile-sheet${mobileOpen ? " is-open" : ""}`}
        id="mobile-sheet"
        aria-label="Mobile navigation"
      >
        <a href="#demo" onClick={() => setSheet(false)}>
          Product <Icon name="i-arrow-ur" />
        </a>
        <a href="#how" onClick={() => setSheet(false)}>
          How it works <Icon name="i-arrow-ur" />
        </a>
        <a href="#control" onClick={() => setSheet(false)}>
          Human in the loop <Icon name="i-arrow-ur" />
        </a>
        <a href="#pricing" onClick={() => setSheet(false)}>
          Pricing <Icon name="i-arrow-ur" />
        </a>
        <a href="#faq" onClick={() => setSheet(false)}>
          FAQ <Icon name="i-arrow-ur" />
        </a>
        {signedIn ? (
          <Link href="/workspaces" className="btn" onClick={() => setSheet(false)}>
            Open your workspace
          </Link>
        ) : (
          <Link href="/signup" className="btn" onClick={() => setSheet(false)}>
            Start free
          </Link>
        )}
      </div>

      <main id="main">
        <span id="top" />

        {/* ================= HERO ================= */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="wrap">
            <div className="hero__head">
              <p className="eyebrow reveal eyebrow--plain">
                Early access · onboarding small teams
              </p>
              <h1 id="hero-title" className="hero-title">
                <span className="line">
                  <span className="w">
                    <span className="w__i">Your</span>
                  </span>{" "}
                  <span className="w">
                    <span className="w__i">AI</span>
                  </span>{" "}
                  <span className="w">
                    <span className="w__i">team.</span>
                  </span>
                </span>
                <span className="line">
                  <span className="w">
                    <span className="w__i serif">Better</span>
                  </span>{" "}
                  <span className="w">
                    <span className="w__i serif">together.</span>
                  </span>
                </span>
              </h1>
            </div>
            <div className="hero__grid">
              <div className="hero__copy">
                <p className="lede reveal" data-d="2">
                  A shared office for your agents, their work, and the people
                  in charge. Less chasing updates. More moving things
                  forward.
                </p>
                <div className="hero__actions reveal" data-d="3">
                  <Link
                    href="/signup"
                    className="btn btn--lg btn--sheen btn--magnetic"
                    data-magnetic
                    onPointerMove={onMagneticMove}
                    onPointerLeave={(e) => {
                      e.currentTarget.style.transform = "";
                    }}
                  >
                    Start free <Icon name="i-arrow-ur" className="i i--arrow" />
                  </Link>
                  <a href="#demo" className="btn btn--lg btn--secondary">
                    <Icon name="i-play" /> See the live office
                  </a>
                </div>
                <ul className="hero__meta reveal" data-d="3">
                  <li>
                    <Icon name="i-check" /> No credit card
                  </li>
                  <li>
                    <Icon name="i-check" /> 100 verified runs free
                  </li>
                  <li>
                    <Icon name="i-check" /> A human approves every action
                  </li>
                </ul>
                <div className="hero__roles reveal" data-d="4">
                  <span className="eyebrow eyebrow--muted eyebrow--plain">
                    For teams with things to make
                  </span>
                  <span className="role">
                    <Icon name="i-layers" /> Builders
                  </span>
                  <span className="role">
                    <Icon name="i-pen" /> Creators
                  </span>
                  <span className="role">
                    <Icon name="i-tasks" /> Operators
                  </span>
                </div>
              </div>

              <div className="office reveal" data-d="2">
                <div className="office-card" data-parallax="0.16" ref={officeCardRef}>
                  <div className="office-card__head">
                    <span className="tile">
                      <Icon name="i-layers" style={{ width: 15, height: 15 }} />
                    </span>
                    <div>
                      <strong>The launch team</strong>
                      <span>One office. A shared direction.</span>
                    </div>
                    <span className="tag">Example</span>
                  </div>
                  <div className="office-card__body">
                    <div className="office-card__kicker">
                      <span>Your team, in view</span>
                      <span>Today</span>
                    </div>
                    <div className="office-metrics">
                      <div className="office-metric">
                        <CountUp to={3} />
                        <span>Agents, aligned</span>
                      </div>
                      <div className="office-metric">
                        <CountUp to={5} />
                        <span>Tasks, in view</span>
                      </div>
                      <div className="office-metric">
                        <CountUp to={1} />
                        <span>Your next call</span>
                      </div>
                    </div>
                    <h2 className="sr-only">Today in the example workspace</h2>
                    <div className="office-agents">
                      <div className="agent-row">
                        <span className="avatar">
                          <Icon name="i-sparkle" style={{ width: 13, height: 13 }} />
                        </span>
                        <div className="agent-row__id">
                          <strong>Researcher</strong>
                          <span>Owned by Dev</span>
                        </div>
                        <span className="pill pill--idle">
                          <i className="dot" />
                          Idle
                        </span>
                      </div>
                      <div className="agent-row">
                        <span className="avatar avatar--brass">
                          <Icon name="i-pen" style={{ width: 13, height: 13 }} />
                        </span>
                        <div className="agent-row__id">
                          <strong>Writer</strong>
                          <span>Owned by Maya</span>
                        </div>
                        <span className="pill pill--working">
                          <i className="dot" />
                          Working
                        </span>
                      </div>
                      <div className="agent-row">
                        <span className="avatar">
                          <Icon name="i-shield" style={{ width: 13, height: 13 }} />
                        </span>
                        <div className="agent-row__id">
                          <strong>Reviewer</strong>
                          <span>Owned by Patrick</span>
                        </div>
                        <span className="pill pill--review">
                          <i className="dot" />
                          Awaiting approval
                        </span>
                      </div>
                    </div>
                    <button
                      className="approval-strip"
                      type="button"
                      onClick={openApprovals}
                    >
                      <Icon name="i-gate" />
                      <span>
                        <strong>A little human judgment, please.</strong>
                        <span>
                          The launch announcement is ready to review.
                        </span>
                      </span>
                      <Icon name="i-arrow-ur" className="i go" />
                    </button>
                  </div>
                  <div className="office-card__foot">
                    <span className="live">Illustrative workspace</span>
                    <span>Agents work. People decide.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= KINETIC BAND ================= */}
        <section
          className="kinetic"
          id="kinetic"
          aria-label="Agents work. People decide."
          ref={kineticSectionRef}
        >
          <div className="wrap kinetic__wrap">
            <div className="kinetic__track" id="kinetic-track" ref={kineticTrackRef}>
            <div className="kinetic__group">
              <span className="kinetic__phrase">
                Agents work. <em>People decide.</em>
              </span>
              <span className="kinetic__sep" aria-hidden="true" />
              <span className="kinetic__phrase">
                Human in the loop. <em>Every time.</em>
              </span>
              <span className="kinetic__sep" aria-hidden="true" />
            </div>
            <div className="kinetic__group" aria-hidden="true">
              <span className="kinetic__phrase">
                Agents work. <em>People decide.</em>
              </span>
              <span className="kinetic__sep" />
              <span className="kinetic__phrase">
                Human in the loop. <em>Every time.</em>
              </span>
              <span className="kinetic__sep" />
            </div>
            <div className="kinetic__group" aria-hidden="true">
              <span className="kinetic__phrase">
                Agents work. <em>People decide.</em>
              </span>
              <span className="kinetic__sep" />
              <span className="kinetic__phrase">
                Human in the loop. <em>Every time.</em>
              </span>
              <span className="kinetic__sep" />
            </div>
          </div>
          </div>
        </section>

        {/* ================= PILLARS ================= */}
        <section aria-label="What belongs in your workspace" className="pillars">
          <div className="wrap" style={{ display: "contents" }} />
          <div className="pillar reveal">
            <Icon name="i-tasks" />
            <div>
              <strong>The work</strong>
              <span>Tasks with a clear next step</span>
            </div>
          </div>
          <div className="pillar reveal" data-d="1">
            <Icon name="i-agents" />
            <div>
              <strong>The team</strong>
              <span>Agents with human owners</span>
            </div>
          </div>
          <div className="pillar reveal" data-d="2">
            <Icon name="i-doc" />
            <div>
              <strong>The evidence</strong>
              <span>Reports ready for review</span>
            </div>
          </div>
          <div className="pillar reveal" data-d="3">
            <Icon name="i-shield" />
            <div>
              <strong>The decisions</strong>
              <span>Permission, with context</span>
            </div>
          </div>
        </section>

        {/* ================= DEMO ================= */}
        <section className="showcase" id="demo" aria-labelledby="demo-title">
          <div className="wrap">
            <div className="sec-head">
              <div>
                <p className="eyebrow reveal">
                  <span className="eyebrow__n">01</span>
                  <span className="eyebrow__t">Inside the product</span>
                </p>
                <h2 id="demo-title" className="reveal" data-d="1">
                  All the context. <span className="serif">None of the guesswork.</span>
                </h2>
                <p className="lede reveal" data-d="2">
                  See who’s doing what, where the work stands, and what needs
                  you next. This preview is live — filter it, open a task,
                  approve something. The numbers follow you.
                </p>
              </div>
              <div className="sec-head__aside reveal" data-d="2">
                <span className="sec-meta">
                  <Icon name="i-check-c" /> Keyboard friendly
                </span>
                <span className="sec-meta">
                  <Icon name="i-info" /> Illustrative local data
                </span>
              </div>
            </div>

            <div className="app reveal" data-d="2" id="app" ref={appRef}>
              <aside className="app-side">
                <div className="app-ws">
                  <span className="tile">L</span>
                  <div>
                    <strong>Launch workspace</strong>
                    <span>Our next big thing</span>
                  </div>
                </div>
                <nav className="app-nav" role="tablist" aria-label="Workspace views">
                  {(["tasks", "agents", "approvals"] as View[]).map((v, i) => {
                    const meta = {
                      tasks: { icon: "i-tasks", label: "Tasks", count: tasks.length },
                      agents: { icon: "i-agents", label: "Agents", count: AGENTS.length },
                      approvals: {
                        icon: "i-gate",
                        label: "Approvals",
                        count: decisions,
                      },
                    }[v];
                    return (
                      <button
                        key={v}
                        ref={(el) => {
                          tabRefs.current[v] = el;
                        }}
                        className="app-tab"
                        role="tab"
                        id={`tab-${v}`}
                        aria-controls={`view-${v}`}
                        aria-selected={view === v}
                        tabIndex={view === v ? 0 : -1}
                        onClick={() => setView(v, false)}
                        onKeyDown={(e) => onTabKeyDown(e, i)}
                      >
                        <Icon name={meta.icon} /> {meta.label}{" "}
                        <span
                          className={`count${v === "approvals" ? " count--alert" : ""}`}
                        >
                          {meta.count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
                <p className="app-side__note">
                  <Icon name="i-info" /> Preview with local data. Resets when
                  you reload.
                </p>
                <div className="app-user">
                  <span className="avatar avatar--ink">P</span>
                  <div>
                    <strong>Patrick</strong>
                    <span>The human in the loop</span>
                  </div>
                </div>
              </aside>

              <div className="app-main">
                <div
                  className="readouts"
                  role="group"
                  aria-label="Live workspace readouts"
                  ref={readoutsRef}
                >
                  <span
                    className={`readout${bumped.agents ? " is-bumped" : ""}`}
                    style={
                      readoutsStarted
                        ? { animation: "ohreadoutPulse .9s var(--ease)" }
                        : undefined
                    }
                  >
                    <TweenNumber
                      value={AGENTS.length}
                      started={readoutsStarted}
                      className="num"
                    />
                    <span className="lbl">Agents aligned</span>
                  </span>
                  <span
                    className={`readout${bumped.tasks ? " is-bumped" : ""}`}
                    style={
                      readoutsStarted
                        ? { animation: "ohreadoutPulse .9s var(--ease)" }
                        : undefined
                    }
                  >
                    <TweenNumber
                      value={countInView}
                      started={readoutsStarted}
                      className="num"
                    />
                    <span className="lbl">Tasks in view</span>
                  </span>
                  <span
                    className={`readout${bumped.decisions ? " is-bumped" : ""}`}
                    style={
                      readoutsStarted
                        ? { animation: "ohreadoutPulse .9s var(--ease)" }
                        : undefined
                    }
                  >
                    <TweenNumber
                      value={decisions}
                      started={readoutsStarted}
                      className="num"
                    />
                    <span className="lbl">Awaiting you</span>
                  </span>
                  <button
                    className="btn btn--ghost btn--sm"
                    id="reset-demo"
                    type="button"
                    onClick={resetDemo}
                  >
                    <Icon name="i-reset" style={{ width: 13, height: 13 }} /> Reset
                  </button>
                </div>

                {/* TASKS */}
                <div
                  className="view"
                  id="view-tasks"
                  role="tabpanel"
                  aria-labelledby="tab-tasks"
                  tabIndex={0}
                  hidden={view !== "tasks"}
                >
                  <div className="view-head">
                    <div>
                      <h3>A little momentum.</h3>
                      <p>Every task has a place to go.</p>
                    </div>
                  </div>
                  <div className="filters" role="group" aria-label="Filter tasks by status">
                    {(
                      [
                        ["all", "All work"],
                        ["progress", "In progress"],
                        ["review", "In review"],
                        ["done", "Done"],
                        ["todo", "To do"],
                        ["failed", "Failed"],
                      ] as [Filter, string][]
                    ).map(([f, label]) => (
                      <button
                        key={f}
                        className="filter"
                        type="button"
                        data-filter={f}
                        aria-pressed={filter === f}
                        onClick={() => setFilter(f)}
                      >
                        {label} <span className="n">{filterCounts[f]}</span>
                      </button>
                    ))}
                  </div>
                  <div
                    className="task-list"
                    id="task-list"
                    role="group"
                    aria-label="Tasks"
                    ref={taskListRef}
                  >
                    {visibleTasks.length === 0 ? (
                      <p
                        className="muted xs"
                        style={{
                          padding: "1.5rem .5rem",
                          textAlign: "center",
                        }}
                      >
                        Nothing in this column right now. Try another filter.
                      </p>
                    ) : (
                      visibleTasks.map((t) => (
                        <button
                          key={t.id}
                          className="task"
                          type="button"
                          data-task={t.id}
                          aria-current={selected === t.id}
                          aria-label={`Open ${t.title}, ${LABELS[t.status]}`}
                          onClick={() => selectTask(t.id)}
                        >
                          <span
                            className={`task__state ${STATE_CLASS[t.status]}`}
                            aria-hidden="true"
                          >
                            <Icon name={ICONS[t.status]} />
                          </span>
                          <span className="task__id">
                            <span className="task__title">{t.title}</span>
                            <span className="task__meta">
                              <span className="mono">{t.id}</span>
                              <span className="sep">·</span>
                              <span>{t.agent}</span>
                              <span className="sep">·</span>
                              <span>Owned by {t.owner}</span>
                            </span>
                          </span>
                          {statusPill(t.status)}
                          <Icon name="i-chev" className="i task__chev" />
                        </button>
                      ))
                    )}
                  </div>
                  <div className="view-foot">
                    <span id="task-footnote">
                      {countInView} of {tasks.length} illustrative tasks
                      {filter === "all"
                        ? ""
                        : ` · ${LABELS[filter as TaskStatus].toLowerCase()}`}
                    </span>
                    <span>
                      Click a task to see its context{" "}
                      <Icon
                        name="i-arrow-ur"
                        style={{
                          width: 12,
                          height: 12,
                          display: "inline-block",
                          verticalAlign: "-1px",
                        }}
                      />
                    </span>
                  </div>
                </div>

                {/* AGENTS */}
                <div
                  className="view"
                  id="view-agents"
                  role="tabpanel"
                  aria-labelledby="tab-agents"
                  tabIndex={0}
                  hidden={view !== "agents"}
                >
                  <div className="view-head">
                    <div>
                      <h3>Every agent, a person behind it.</h3>
                      <p>
                        Ownership is not a label. It is who answers for the
                        work.
                      </p>
                    </div>
                  </div>
                  <div id="agent-list">
                    {AGENTS.map((a) => {
                      const mine = tasks.filter((t) => t.agent === a.name);
                      const active = mine.filter(
                        (t) => t.status === "progress" || t.status === "review",
                      ).length;
                      const status = active
                        ? mine.some((t) => t.status === "review")
                          ? "review"
                          : "progress"
                        : "todo";
                      const label = active
                        ? status === "review"
                          ? "Awaiting approval"
                          : "Working"
                        : "Idle";
                      const pillClass =
                        status === "review"
                          ? "pill--review"
                          : status === "progress"
                            ? "pill--working"
                            : "pill--idle";
                      return (
                        <div className="agent-card" key={a.name}>
                          <span className={a.tone} aria-hidden="true">
                            <Icon name={a.icon} style={{ width: 13, height: 13 }} />
                          </span>
                          <div className="agent-card__id">
                            <strong>{a.name}</strong>
                            <span>
                              Owned by {a.owner} · {mine.length} task
                              {mine.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <span className="load" aria-hidden="true">
                            <i
                              style={{
                                width: `${Math.min(100, 20 + mine.length * 22)}%`,
                              }}
                            />
                          </span>
                          <span className={`pill ${pillClass}`}>
                            <i className="dot" />
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="view-foot">
                    <span>3 agents · 3 human owners</span>
                    <span>
                      Agent-reported progress is never the same as verification
                    </span>
                  </div>
                </div>

                {/* APPROVALS */}
                <div
                  className="view"
                  id="view-approvals"
                  role="tabpanel"
                  aria-labelledby="tab-approvals"
                  tabIndex={0}
                  hidden={view !== "approvals"}
                >
                  <div className="view-head">
                    <div>
                      <h3>Permission is specific.</h3>
                      <p>
                        Review the exact action and payload before anything
                        moves.
                      </p>
                    </div>
                  </div>
                  <div id="approval-region" aria-live="polite" ref={approvalRegionRef}>
                    {approval === "requested" && (
                      <div className="decision">
                        <div
                          className="decision__head"
                          style={{
                            background: "var(--paper-2)",
                            borderBottomColor: "var(--line-2)",
                          }}
                        >
                          <Icon name="i-reset" style={{ color: "var(--muted)" }} />
                          <strong>Changes requested by a human</strong>
                          <span className="pill pill--todo">
                            <i className="dot" />
                            Returned
                          </span>
                        </div>
                        <div className="decision__body">
                          <dl style={{ margin: 0 }}>
                            <div className="decision__row">
                              <dt>Task</dt>
                              <dd>HV-103 · Review the launch draft</dd>
                            </div>
                            <div className="decision__row">
                              <dt>Now assigned to</dt>
                              <dd>
                                {tasks.find((x) => x.id === "HV-103")?.agent} ·
                                owned by{" "}
                                {tasks.find((x) => x.id === "HV-103")?.owner}
                              </dd>
                            </div>
                            <div className="decision__row">
                              <dt>Carried over</dt>
                              <dd>
                                Review notes, draft v2, original instructions
                              </dd>
                            </div>
                          </dl>
                          <div className="outcome">
                            <Icon name="i-info" />
                            <div>
                              <strong>Nothing was published.</strong>
                              <span>
                                The task moved back, with context attached. That
                                is the whole point of a gate.
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="decision__foot">
                          <button
                            className="btn btn--secondary"
                            type="button"
                            onClick={resetApproval}
                          >
                            Start this decision again
                          </button>
                        </div>
                      </div>
                    )}
                    {approval === "verified" && (
                      <div className="decision">
                        <div
                          className="decision__head"
                          style={{
                            background: "var(--ok-tint)",
                            borderBottomColor: "#CFE5DA",
                          }}
                        >
                          <Icon name="i-check-c" style={{ color: "var(--ok)" }} />
                          <strong>Verified by Patrick</strong>
                          <span className="pill pill--done">
                            <i className="dot" />
                            Done
                          </span>
                        </div>
                        <div className="decision__body">
                          <dl style={{ margin: 0 }}>
                            <div className="decision__row">
                              <dt>Task</dt>
                              <dd>HV-103 · Review the launch draft</dd>
                            </div>
                            <div className="decision__row">
                              <dt>Permission</dt>
                              <dd>Publish to #announcements</dd>
                            </div>
                            <div className="decision__row">
                              <dt>Outcome</dt>
                              <dd>Checked and confirmed by a human</dd>
                            </div>
                            <div className="decision__row">
                              <dt>Run counted</dt>
                              <dd>1 verified run</dd>
                            </div>
                          </dl>
                          <div className="outcome outcome--ok">
                            <Icon name="i-check-c" />
                            <div>
                              <strong>That is the difference.</strong>
                              <span>
                                Permission came from a person. Verification came
                                from a person. The work moved only after both.
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="decision__foot">
                          <button
                            className="btn btn--secondary"
                            type="button"
                            onClick={resetApproval}
                          >
                            Run the approval again
                          </button>
                        </div>
                      </div>
                    )}
                    {approval === "approved" && (
                      <div className="decision">
                        <div
                          className="decision__head"
                          style={{
                            background: "var(--info-tint)",
                            borderBottomColor: "#D8E2EE",
                          }}
                        >
                          <Icon name="i-clock" style={{ color: "var(--info)" }} />
                          <strong>Permission recorded · execution queued</strong>
                          <span
                            className="pill"
                            style={{
                              color: "var(--info)",
                              background: "#fff",
                              borderColor: "#D8E2EE",
                            }}
                          >
                            <i className="dot" />
                            Approved
                          </span>
                        </div>
                        <div className="decision__body">
                          <dl style={{ margin: 0 }}>
                            <div className="decision__row">
                              <dt>Action</dt>
                              <dd>publish.post</dd>
                            </div>
                            <div className="decision__row">
                              <dt>Approved by</dt>
                              <dd>Patrick · just now</dd>
                            </div>
                            <div className="decision__row">
                              <dt>Execution</dt>
                              <dd>Not yet confirmed</dd>
                            </div>
                          </dl>
                          <div className="outcome">
                            <Icon name="i-info" />
                            <div>
                              <strong>Approve ≠ success.</strong>
                              <span>
                                An approval is permission. Whether it worked is
                                a separate, checkable fact.
                              </span>
                              <button
                                className="btn btn--secondary btn--sm"
                                type="button"
                                onClick={() => setApproval("verified")}
                              >
                                Verify the outcome
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="decision__foot">
                          <button
                            className="btn btn--secondary"
                            type="button"
                            onClick={resetApproval}
                          >
                            Reset this decision
                          </button>
                        </div>
                      </div>
                    )}
                    {approval === "pending" && (
                      <div className="decision">
                        <div className="decision__head">
                          <Icon name="i-gate" />
                          <strong>A human is needed</strong>
                          <span className="pill pill--review">
                            <i className="dot" />
                            Awaiting approval
                          </span>
                        </div>
                        <div className="decision__body">
                          <dl style={{ margin: 0 }}>
                            <div className="decision__row">
                              <dt>Requested by</dt>
                              <dd>Reviewer · owned by Patrick</dd>
                            </div>
                            <div className="decision__row">
                              <dt>Task</dt>
                              <dd>HV-103 · Review the launch draft</dd>
                            </div>
                            <div className="decision__row">
                              <dt>Action</dt>
                              <dd>publish.post</dd>
                            </div>
                            <div className="decision__row">
                              <dt>Destination</dt>
                              <dd>#announcements</dd>
                            </div>
                          </dl>
                          <div className="payload">
                            <div className="payload__bar">
                              <Icon name="i-file" style={{ width: 11, height: 11 }} />{" "}
                              Exact payload
                            </div>
                            <pre>
                              {"{\n  "}
                              <span className="k">&quot;action&quot;</span>
                              {": "}
                              <span className="s">&quot;publish.post&quot;</span>
                              {",\n  "}
                              <span className="k">&quot;channel&quot;</span>
                              {": "}
                              <span className="s">&quot;#announcements&quot;</span>
                              {",\n  "}
                              <span className="k">&quot;document&quot;</span>
                              {": "}
                              <span className="s">
                                &quot;launch-announcement-v2&quot;
                              </span>
                              {",\n  "}
                              <span className="k">&quot;visibility&quot;</span>
                              {": "}
                              <span className="s">&quot;public&quot;</span>
                              {",\n  "}
                              <span className="k">&quot;irreversible&quot;</span>
                              {": "}
                              <span className="n">true</span>
                              {"\n}"}
                            </pre>
                          </div>
                        </div>
                        <div className="decision__foot">
                          <button
                            className="btn"
                            type="button"
                            onClick={() => setApproval("approved")}
                          >
                            Approve this action
                          </button>
                          <button
                            className="btn btn--secondary"
                            type="button"
                            onClick={() => setApproval("requested")}
                          >
                            Request changes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="view-foot">
                    <span>
                      Approval is permission — not proof that execution
                      succeeded.
                    </span>
                    <span>Human in the loop: Patrick</span>
                  </div>
                </div>
              </div>

              {/* detail panel */}
              <section
                className="detail"
                id="detail"
                aria-labelledby="detail-title"
                hidden={!selectedTask}
              >
                {selectedTask && (
                  <>
                    <div className="detail__head">
                      <span className="mono xs muted" id="detail-id">
                        {selectedTask.id}
                      </span>
                      <button
                        className="detail__close"
                        type="button"
                        aria-label="Close task details"
                        onClick={() => closeDetail()}
                      >
                        <Icon name="i-x" />
                      </button>
                    </div>
                    <div className="detail__body">
                      {statusPill(selectedTask.status)}
                      <h4 id="detail-title" style={{ marginTop: ".5rem" }}>
                        {selectedTask.title}
                      </h4>
                      <p className="detail__desc">{selectedTask.desc}</p>
                      <dl className="detail__grid">
                        <div>
                          <dt>Assigned agent</dt>
                          <dd>{selectedTask.agent}</dd>
                        </div>
                        <div>
                          <dt>Human owner</dt>
                          <dd>{selectedTask.owner}</dd>
                        </div>
                      </dl>
                      <div className="evidence">
                        <h5>Evidence trail</h5>
                        <ul>
                          {selectedTask.evidence.map((e, i) => (
                            <li key={i} className={e.ok ? "" : "is-muted"}>
                              <Icon name={e.ok ? "i-check" : "i-circle"} />
                              {e.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="detail__pad">
                      <p className="detail-note">
                        {selectedTask.status === "review"
                          ? "Nothing is published, sent or spent until you approve the exact action."
                          : selectedTask.status === "failed"
                            ? "Failed runs never count toward usage. A retry starts a fresh, visible run."
                            : selectedTask.status === "progress"
                              ? "Agent-reported progress is a report. The work only moves forward after a person checks it."
                              : "Context stays with the task — instructions, files, handoffs and review history, not a separate conversation."}
                      </p>
                      <div className="detail__actions">
                        {selectedTask.status === "review" && (
                          <>
                            <button
                              className="btn"
                              type="button"
                              onClick={() => onDetailAction("to-approval")}
                            >
                              Open approval gate
                            </button>
                            <button
                              className="btn btn--secondary"
                              type="button"
                              onClick={() => onDetailAction("close")}
                            >
                              Close
                            </button>
                          </>
                        )}
                        {selectedTask.status === "failed" && (
                          <>
                            <button
                              className="btn"
                              type="button"
                              onClick={() => onDetailAction("retry")}
                            >
                              Retry this run
                            </button>
                            <button
                              className="btn btn--secondary"
                              type="button"
                              onClick={() => onDetailAction("close")}
                            >
                              Close
                            </button>
                          </>
                        )}
                        {selectedTask.status === "progress" && (
                          <>
                            <button
                              className="btn"
                              type="button"
                              onClick={() => onDetailAction("ask")}
                            >
                              Ask for an update
                            </button>
                            <button
                              className="btn btn--secondary"
                              type="button"
                              onClick={() => onDetailAction("close")}
                            >
                              Close
                            </button>
                          </>
                        )}
                        {(selectedTask.status === "done" ||
                          selectedTask.status === "todo") && (
                          <button
                            className="btn btn--secondary"
                            type="button"
                            onClick={() => onDetailAction("close")}
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>

            <p className="demo-note">
              <Icon name="i-info" />
              <span>
                Illustrative workspace. Everything here runs locally in this
                page: no provider is connected, no credentials are needed, and
                nothing is sent, spent or published.
              </span>
            </p>
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section
          className="section section--paper section--edge"
          id="how"
          aria-labelledby="how-title"
        >
          <div className="wrap">
            <div className="sec-head">
              <div>
                <p className="eyebrow reveal">
                  <span className="eyebrow__n">02</span>
                  <span className="eyebrow__t">The rhythm</span>
                </p>
                <h2 id="how-title" className="reveal" data-d="1">
                  From a good idea <span className="serif">to good work.</span>
                </h2>
                <p className="lede reveal" data-d="2">
                  Three moves, repeated. Nothing dramatic — just work that
                  doesn’t disappear between steps.
                </p>
              </div>
            </div>

            <div className="how">
              <div
                className="steps reveal"
                role="tablist"
                aria-label="How Orbely works"
                aria-orientation="vertical"
                onMouseEnter={stopAuto}
                onFocus={stopAuto}
              >
                {[
                  {
                    n: 1,
                    title: "Make room for the team.",
                    body: "Start with a shared workspace. Give every agent a role, and keep a person behind every decision.",
                  },
                  {
                    n: 2,
                    title: "Give the work a direction.",
                    body: "Assign a clear task. Keep its context, files and handoffs together as work moves between agents.",
                  },
                  {
                    n: 3,
                    title: "Keep your judgment in the loop.",
                    body: "Review the evidence and the exact action. Approve what should happen, then track the outcome separately.",
                  },
                ].map((s, i) => (
                  <button
                    key={s.n}
                    className="step"
                    role="tab"
                    id={`step-${s.n}`}
                    aria-controls={`panel-${s.n}`}
                    aria-selected={step === s.n}
                    tabIndex={step === s.n ? 0 : -1}
                    type="button"
                    onClick={() => {
                      setStep(s.n);
                      stopAuto();
                    }}
                    onKeyDown={(e) => onStepKeyDown(e, i)}
                  >
                    <span className="step__n">
                      {String(s.n).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>{s.title}</strong>
                      <p>{s.body}</p>
                      <span className="step__bar" aria-hidden="true">
                        <i key={step} />
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <div
                className="stage reveal"
                data-d="1"
                onMouseEnter={stopAuto}
                onFocus={stopAuto}
              >
                <div className="stage__label">
                  <span id="stage-label">{STAGE_LABELS[step]}</span>
                  <span>Illustrative</span>
                </div>

                <div
                  className="panel"
                  id="panel-1"
                  role="tabpanel"
                  aria-labelledby="step-1"
                  tabIndex={0}
                  hidden={step !== 1}
                >
                  <div className="seats">
                    <div className="seat">
                      <span className="avatar avatar--brass">
                        <Icon name="i-sparkle" style={{ width: 13, height: 13 }} />
                      </span>
                      <div>
                        <strong>Researcher</strong>
                        <span>Owned by Dev · 2 tasks</span>
                      </div>
                      <span
                        className="pill pill--working"
                        style={{ marginLeft: "auto" }}
                      >
                        <i className="dot" />
                        Working
                      </span>
                    </div>
                    <div className="seat">
                      <span className="avatar">
                        <Icon name="i-pen" style={{ width: 13, height: 13 }} />
                      </span>
                      <div>
                        <strong>Writer</strong>
                        <span>Owned by Maya · 1 task</span>
                      </div>
                      <span
                        className="pill pill--working"
                        style={{ marginLeft: "auto" }}
                      >
                        <i className="dot" />
                        Working
                      </span>
                    </div>
                    <div className="seat">
                      <span className="avatar">
                        <Icon name="i-shield" style={{ width: 13, height: 13 }} />
                      </span>
                      <div>
                        <strong>Reviewer</strong>
                        <span>Owned by Patrick · 1 task</span>
                      </div>
                      <span
                        className="pill pill--review"
                        style={{ marginLeft: "auto" }}
                      >
                        <i className="dot" />
                        Awaiting approval
                      </span>
                    </div>
                    <div className="seat seat--empty">
                      + Add an agent, assign an owner
                    </div>
                  </div>
                </div>

                <div
                  className="panel"
                  id="panel-2"
                  role="tabpanel"
                  aria-labelledby="step-2"
                  tabIndex={0}
                  hidden={step !== 2}
                >
                  <div className="handoff">
                    <div className="handoff__card">
                      <strong>HV-102 · Draft the launch announcement</strong>
                      <div className="handoff__chips">
                        <span className="chipx chipx--brass">Instructions</span>
                        <span className="chipx">brand-voice.md</span>
                        <span className="chipx">audience-notes.md</span>
                        <span className="chipx">Handoff · Writer → Reviewer</span>
                      </div>
                    </div>
                    <div className="gate__row">
                      <Icon name="i-file" /> Draft v2 <strong>attached</strong>
                    </div>
                    <div className="gate__row">
                      <Icon name="i-clock" /> Reviewer picked up the handoff{" "}
                      <strong>now</strong>
                    </div>
                    <div className="progress-track" aria-hidden="true">
                      <i style={{ width: "72%" }} />
                    </div>
                    <p className="xs muted" style={{ fontSize: ".6875rem" }}>
                      One thread of work. No lost context, no second
                      conversation.
                    </p>
                  </div>
                </div>

                <div
                  className="panel"
                  id="panel-3"
                  role="tabpanel"
                  aria-labelledby="step-3"
                  tabIndex={0}
                  hidden={step !== 3}
                >
                  <div className="gate">
                    <div className="gate__row">
                      <Icon name="i-gate" /> Action requested{" "}
                      <strong>publish.post</strong>
                    </div>
                    <div className="gate__row">
                      <Icon name="i-agents" /> Requested by Reviewer{" "}
                      <strong>owner Patrick</strong>
                    </div>
                    <div className="gate__row">
                      <Icon name="i-doc" /> Evidence attached{" "}
                      <strong>report + draft v2</strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: ".4rem",
                        marginTop: ".7rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="btn btn--sm btn--brass" aria-hidden="true">
                        Approve action
                      </span>
                      <span
                        className="btn btn--sm btn--secondary"
                        aria-hidden="true"
                      >
                        Request changes
                      </span>
                    </div>
                    <p className="xs muted" style={{ fontSize: ".6875rem" }}>
                      Nothing is published, sent or spent until a person
                      approves it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SCENE · THE GATE ================= */}
        <section className="scene" id="control" aria-labelledby="control-title" ref={sceneRef}>
          <div className="scene__sticky">
            <div className="wrap scene__grid">
              <div className="scene__copy">
                <p className="eyebrow">
                  <span className="eyebrow__n">03</span>
                  <span className="eyebrow__t">Human in the loop</span>
                </p>
                <h2 id="control-title">
                  More capable agents.{" "}
                  <span className="serif">Still your call.</span>
                </h2>
                <p className="lede">
                  Give the team room to move. Keep the decisions that matter
                  where they belong — with a person who has the full picture.
                </p>

                <div className="scene__phases">
                  {[
                    {
                      n: "01 / Permission",
                      h: "Permission is specific.",
                      p: "Review the action and its exact payload. An approval is permission — not a claim that execution succeeded.",
                    },
                    {
                      n: "02 / Evidence",
                      h: "Progress comes with evidence.",
                      p: "An agent report and a human verification are different things. The work stays visible until someone has checked it.",
                    },
                    {
                      n: "03 / Accountability",
                      h: "Responsibility has a name.",
                      p: "See the requesting agent and the human behind it. Good teamwork starts with knowing who is accountable.",
                    },
                  ].map((ph, i) => (
                    <article
                      key={ph.n}
                      className={`phase${phase === i ? " is-active" : ""}`}
                      data-phase={i}
                    >
                      <span className="phase__n">{ph.n}</span>
                      <h3>{ph.h}</h3>
                      <p>{ph.p}</p>
                    </article>
                  ))}
                </div>

                <div className="scene__rail" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      data-rail={i}
                      className={
                        phase === i
                          ? "is-live"
                          : phase > i
                            ? "is-done"
                            : ""
                      }
                    >
                      <i />
                    </span>
                  ))}
                </div>

                <button
                  className="link"
                  type="button"
                  onClick={openApprovals}
                  style={{ marginTop: "1.6rem" }}
                >
                  Try a real approval gate{" "}
                  <Icon name="i-arrow-ur" className="i i--arrow" />
                </button>
              </div>

              <div className="scene__visual">
                <div className="gate-line" aria-hidden="true">
                  <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
                    <circle cx="200" cy="200" r="172" strokeDasharray="2 8" className="spin" />
                    <circle cx="200" cy="200" r="132" opacity=".55" />
                    <path d="M200 28v74" className="live" data-draw="6" />
                    <path d="M200 298v74" className="live" data-draw="6" />
                  </svg>
                </div>

                <div className={`gate${phase === 0 ? " is-active" : ""}`} data-phase="0">
                  <div className="gate-card">
                    <div className="gate-card__bar">
                      <Icon name="i-gate" /> Action requested{" "}
                      <span className="pill pill--review">
                        <i className="dot" />
                        Awaiting you
                      </span>
                    </div>
                    <div className="gate-card__body">
                      <dl style={{ margin: 0 }}>
                        <div className="gate-kv">
                          <dt>Requested by</dt>
                          <dd>Reviewer · Patrick</dd>
                        </div>
                        <div className="gate-kv">
                          <dt>Action</dt>
                          <dd>publish.post</dd>
                        </div>
                        <div className="gate-kv">
                          <dt>Destination</dt>
                          <dd>#announcements</dd>
                        </div>
                      </dl>
                      <div className="gate-payload">
                        {"{\n  "}
                        <span className="k">&quot;action&quot;</span>
                        {": "}
                        <span className="s">&quot;publish.post&quot;</span>
                        {",\n  "}
                        <span className="k">&quot;document&quot;</span>
                        {": "}
                        <span className="s">&quot;launch-announcement-v2&quot;</span>
                        {",\n  "}
                        <span className="k">&quot;irreversible&quot;</span>
                        {": "}
                        <span className="n">true</span>
                        {"\n}"}
                      </div>
                    </div>
                    <div className="gate-actions">
                      <span className="btn btn--brass btn--sm" aria-hidden="true">
                        Approve
                      </span>
                      <span className="btn btn--secondary btn--sm" aria-hidden="true">
                        Request changes
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`gate${phase === 1 ? " is-active" : ""}`} data-phase="1">
                  <div className="gate-card">
                    <div className="gate-card__bar">
                      <Icon name="i-doc" /> Evidence attached{" "}
                      <span className="pill pill--brass">
                        <i className="dot" />
                        Report
                      </span>
                    </div>
                    <div className="gate-card__body">
                      <ul className="evidence" style={{ margin: 0 }}>
                        <li>
                          <Icon name="i-check" /> Draft v2 · 3 changes
                        </li>
                        <li>
                          <Icon name="i-check" /> Reviewer report · 4 notes
                        </li>
                        <li>
                          <Icon name="i-check" /> Sources checked · 6 links
                        </li>
                        <li className="is-muted">
                          <Icon name="i-circle" /> Human verification pending
                        </li>
                      </ul>
                      <p className="detail-note" style={{ marginTop: ".6rem" }}>
                        An agent saying “done” is a report. It is not a fact.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`gate${phase === 2 ? " is-active" : ""}`} data-phase="2">
                  <div className="gate-card">
                    <div className="gate-card__bar">
                      <Icon name="i-check-c" /> Verified by a person{" "}
                      <span className="pill pill--done">
                        <i className="dot" />
                        Done
                      </span>
                    </div>
                    <div className="gate-card__body">
                      <dl style={{ margin: 0 }}>
                        <div className="gate-kv">
                          <dt>Permission</dt>
                          <dd>Patrick · just now</dd>
                        </div>
                        <div className="gate-kv">
                          <dt>Verification</dt>
                          <dd>Outcome checked</dd>
                        </div>
                        <div className="gate-kv">
                          <dt>Run counted</dt>
                          <dd>1 verified run</dd>
                        </div>
                      </dl>
                      <div className="outcome outcome--ok" style={{ marginTop: ".7rem" }}>
                        <Icon name="i-check-c" />
                        <div>
                          <strong>Two signatures, one person.</strong>
                          <span>
                            Permission and verification both came from a human.
                            That is why the work moved.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= PRICING ================= */}
        <section
          className="section section--paper section--edge"
          id="pricing"
          aria-labelledby="pricing-title"
        >
          <div className="wrap">
            <div className="sec-head">
              <div>
                <p className="eyebrow reveal">
                  <span className="eyebrow__n">04</span>
                  <span className="eyebrow__t">Pricing</span>
                </p>
                <h2 id="pricing-title" className="reveal" data-d="1">
                  Simple plans. <span className="serif">Honest limits.</span>
                </h2>
                <p className="lede reveal" data-d="2">
                  Priced per workspace, not per seat. A leader can run several
                  agents while members review approvals, without paying per
                  human.
                </p>
              </div>
              <div className="sec-head__aside reveal" data-d="2">
                <div className="billing" role="group" aria-label="Billing period">
                  <button
                    type="button"
                    aria-pressed={billing === "monthly"}
                    onClick={() => setBilling("monthly")}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    aria-pressed={billing === "yearly"}
                    onClick={() => setBilling("yearly")}
                  >
                    Yearly <span className="save">−20%</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="plans reveal" data-d="1">
              <article className="plan">
                <h3 className="plan__name">Free</h3>
                <p className="plan__for">
                  Try Orbely with one workspace, no card and no clock.
                </p>
                <p className="plan__price">
                  <b>$0</b>
                  <span>/ month</span>
                </p>
                <p className="plan__inr">₹0 · forever</p>
                <div className="plan__cta">
                  <Link href="/signup" className="btn btn--secondary">
                    Start free
                  </Link>
                </div>
                <ul className="plan__feats">
                  <li>
                    <Icon name="i-check" /> 100 verified runs / month
                  </li>
                  <li>
                    <Icon name="i-check" /> 1 workspace
                  </li>
                  <li>
                    <Icon name="i-check" /> Leader only (1 member)
                  </li>
                  <li>
                    <Icon name="i-check" /> Approval-gated runs, human review
                    first
                  </li>
                  <li className="is-muted">
                    <Icon name="i-circle" /> Team members, top-ups
                  </li>
                </ul>
              </article>

              <article className="plan plan--featured plan--ink">
                <h3 className="plan__name">Pro</h3>
                <p className="plan__for">
                  For a solo founder or a small team shipping every week.
                </p>
                <p className="plan__price">
                  <b data-price="pro" key={billing} className="is-flip">
                    {prices.pro}
                  </b>
                  <span>/ month</span>
                </p>
                <p className="plan__inr" data-inr="pro" key={`inr-${billing}`} >
                  <span className="is-flip" style={{ display: "inline-block" }}>
                    {prices.inr.pro}
                  </span>
                </p>
                <div className="plan__cta">
                  <Link href="/signup" className="btn">
                    Request early access
                  </Link>
                </div>
                <ul className="plan__feats">
                  <li>
                    <Icon name="i-check" /> 2,500 verified runs / month
                  </li>
                  <li>
                    <Icon name="i-check" /> 1 workspace (more later)
                  </li>
                  <li>
                    <Icon name="i-check" /> Up to 3 members
                  </li>
                  <li>
                    <Icon name="i-check" /> Approval gates on every action
                  </li>
                  <li>
                    <Icon name="i-check" /> Top-ups when you run out
                  </li>
                </ul>
              </article>

              <article className="plan">
                <h3 className="plan__name">Team</h3>
                <p className="plan__for">
                  For multi-agent operations with people reviewing the work.
                </p>
                <p className="plan__price">
                  <b data-price="team" key={billing} className="is-flip">
                    {prices.team}
                  </b>
                  <span>/ month</span>
                </p>
                <p className="plan__inr" data-inr="team" key={`inr-${billing}`}>
                  <span className="is-flip" style={{ display: "inline-block" }}>
                    {prices.inr.team}
                  </span>
                </p>
                <div className="plan__cta">
                  <Link href="/contact" className="btn btn--secondary">
                    Talk to us
                  </Link>
                </div>
                <ul className="plan__feats">
                  <li>
                    <Icon name="i-check" /> 10,000 verified runs / month
                  </li>
                  <li>
                    <Icon name="i-check" /> Up to 3 workspaces
                  </li>
                  <li>
                    <Icon name="i-check" /> Up to 10 members
                  </li>
                  <li>
                    <Icon name="i-check" /> Top-ups when you run out
                  </li>
                  <li>
                    <Icon name="i-check" /> Priority onboarding
                  </li>
                </ul>
              </article>
            </div>

            <div className="pricing-foot">
              <div>
                <h3>What counts as a verified run</h3>
                <p>
                  One run is counted only when an agent run completes and is
                  checked. Failed runs never count. Runs served from the dedupe
                  cache cost nothing and do not count either. Extra runs are $5
                  per 1,000 (₹299), spent only after the monthly allowance runs
                  out.
                </p>
              </div>
              <div className="draft">
                <Icon name="i-info" />
                <span>
                  <strong>Draft, not live.</strong> Billing is not switched on:
                  no payment is taken and no checkout works. Treat these as a
                  proposal, not a price list.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <section className="section" id="faq" aria-labelledby="faq-title">
          <div className="wrap faq">
            <div className="faq__intro">
              <p className="eyebrow reveal">
                <span className="eyebrow__n">05</span>
                <span className="eyebrow__t">Good questions</span>
              </p>
              <h2 id="faq-title" className="reveal" data-d="1">
                Good questions. <span className="serif">Clear answers.</span>
              </h2>
              <p className="lede reveal" data-d="2">
                Thoughtful tools should be easy to understand. If something
                here is unclear, that is a bug in the copy.
              </p>
              <Link className="link reveal" data-d="2" href="/contact">
                Ask us something else{" "}
                <Icon name="i-arrow-ur" className="i i--arrow" />
              </Link>
            </div>
            <div className="qa reveal" data-d="1">
              {FAQ.map((item, i) => (
                <div
                  key={item.q}
                  className={`qa__item${faqOpen === i ? " is-open" : ""}`}
                >
                  <h3>
                    <button
                      className="qa__btn"
                      type="button"
                      aria-expanded={faqOpen === i}
                      aria-controls={`qa-p${i + 1}`}
                      id={`qa-b${i + 1}`}
                      onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}
                    >
                      {item.q}
                      <span className="qa__icon" aria-hidden="true" />
                    </button>
                  </h3>
                  <div
                    className="qa__panel"
                    id={`qa-p${i + 1}`}
                    role="region"
                    aria-labelledby={`qa-b${i + 1}`}
                  >
                    <div>
                      <p>{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= BUILDER ================= */}
        <section
          className="section section--tight"
          id="about"
          aria-labelledby="about-title"
        >
          <div className="wrap builder">
            <div>
              <p className="eyebrow reveal">
                <span className="eyebrow__n">06</span>
                <span className="eyebrow__t">The builder</span>
              </p>
              <h2 id="about-title" className="reveal" data-d="1">
                Built by someone <span className="serif">who builds agents.</span>
              </h2>
              <p className="reveal" data-d="2">
                Orbely is a virtual office for AI agents, built by Kartikey
                Singh — an AI developer who builds AI agents, voice agents,
                chatbots and automation.
              </p>
              <p className="reveal" data-d="2">
                The idea is simple: if AI agents are going to do real work,
                they need a real office. Desks, tasks, reports, handoffs — and
                a human in charge.
              </p>
            </div>
            <aside className="profile reveal" data-d="2" aria-label="About the builder">
              <div className="profile__top">
                <span className="profile__av" aria-hidden="true">
                  KS
                </span>
                <div>
                  <strong>Kartikey Singh</strong>
                  <span>AI developer · Founder, Orbely</span>
                </div>
              </div>
              <ul className="profile__list">
                <li>
                  <Icon name="i-sparkle" /> Builds AI agents, voice agents and
                  automation
                </li>
                <li>
                  <Icon name="i-gate" /> Designs for human approval, not full
                  autonomy
                </li>
                <li>
                  <Icon name="i-info" /> Says what is built and what is not
                </li>
              </ul>
              <Link className="profile__mail" href="/contact">
                <Icon name="i-mail" /> help@orbely
              </Link>
            </aside>
          </div>
        </section>

        {/* ================= CTA BAND ================= */}
        <section
          className="section section--tight"
          id="start"
          aria-labelledby="start-title"
        >
          <div className="wrap">
            <div className="band on-dark reveal" onPointerMove={onBandMove}>
              <div className="band__spot" aria-hidden="true" ref={bandSpotRef} />
              <div className="band__inner">
                <div>
                  <p className="eyebrow">The next chapter of work</p>
                  <h2 id="start-title" style={{ marginTop: ".8rem" }}>
                    Good company. <span className="serif">Great work ahead.</span>
                  </h2>
                  <p>
                    One workspace, your people, their agents. Join early
                    access and we will open a workspace with you — start
                    small, make room for good work.
                  </p>
                </div>
                <div>
                  <form
                    className="capture"
                    id="capture-form"
                    noValidate
                    onSubmit={onCaptureSubmit}
                  >
                    <label className="sr-only" htmlFor="email">
                      Work email
                    </label>
                    <div className="capture__row">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        aria-describedby="capture-err capture-note"
                        aria-invalid={emailError || undefined}
                        required
                        value={email}
                        ref={emailInputRef}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError(false);
                        }}
                      />
                      <button className="btn btn--light" type="submit">
                        Start free{" "}
                        <Icon name="i-arrow-ur" className="i i--arrow" />
                      </button>
                    </div>
                    <p
                      className={`capture__err${emailError ? " is-shown" : ""}`}
                      id="capture-err"
                      role="alert"
                    >
                      <Icon name="i-alert" /> Please enter a valid email
                      address.
                    </p>
                    <p className="capture__note" id="capture-note">
                      <Icon name="i-shield" /> Free to start. No credit card.
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#top" className="brand" aria-label="Orbely — back to top">
                <img
                  src="/orbely-logo.svg"
                  alt="Orbely logo"
                  className="brand__mark"
                />
                <span className="brand__word">{PRODUCT_NAME}</span>
              </a>
              <p>
                The office for AI agents. Made for small teams with big things
                to do.
              </p>
              <span className="status">Early access · pricing is a draft</span>
            </div>
            <div className="footer-col">
              <h3>Product</h3>
              <a href="#demo">Inside the product</a>
              <a href="#how">How it works</a>
              <a href="#control">Human in the loop</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="footer-col">
              <h3>Company</h3>
              <a href="#about">About the builder</a>
              <a href="#faq">FAQ</a>
              <Link href="/contact">Contact</Link>
            </div>
            <div className="footer-col">
              <h3>Legal</h3>
              <Link href="/legal/terms">Terms</Link>
              <Link href="/legal/privacy">Privacy</Link>
              <a href="#top">Back to top</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © 2026 {PRODUCT_NAME}
              <span className="sep">·</span>Built by Kartikey Singh
            </span>
            <span>Agents work. People decide.</span>
          </div>
        </div>
      </footer>

      <div
        className={`toast${toast ? " is-open" : ""}`}
        id="toast"
        role="status"
        aria-live="polite"
      >
        <Icon name="i-check-c" />
        <span id="toast-text">{toast ?? "Done."}</span>
      </div>
    </div>
  );
}
