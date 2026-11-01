"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  Compass,
  CornerDownRight,
  FileCheck2,
  FileText,
  FolderOpen,
  Layers3,
  LayoutList,
  PenLine,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

type PreviewTab = "tasks" | "agents" | "approvals";
type Decision = "pending" | "approved" | "rejected";
type TaskState = "todo" | "in_progress" | "in_review" | "done" | "failed";
type PreviewRecord = { kind: "task" | "agent" | "payload"; id?: string } | null;

// Point these at your existing production routes when integrating this page.
const homepageLinks = {
  signup: "/signup",
  login: "/login",
  demo: "#workspace",
};

const labels: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  failed: "Failed",
  idle: "Idle",
  working: "Working",
  awaiting_approval: "Awaiting approval",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const agents = [
  {
    id: "researcher",
    name: "Researcher",
    owner: "Dev",
    initial: "D",
    role: "Finds the signal in the noise",
    status: "idle",
    icon: Compass,
    focus: "An audience brief, with sources attached.",
    capabilities: ["Research", "Source checking"],
  },
  {
    id: "writer",
    name: "Writer",
    owner: "Maya",
    initial: "M",
    role: "Turns good thinking into a story",
    status: "working",
    icon: PenLine,
    focus: "Refining the next version of the launch announcement.",
    capabilities: ["Drafting", "Editing"],
  },
  {
    id: "reviewer",
    name: "Reviewer",
    owner: "Patrick",
    initial: "P",
    role: "Keeps the bar where it belongs",
    status: "awaiting_approval",
    icon: ShieldCheck,
    focus: "A launch draft is ready for a human decision.",
    capabilities: ["Quality review", "Handoffs"],
  },
];

const tasks: {
  id: string;
  title: string;
  agent: string;
  status: TaskState;
  note: string;
}[] = [
  {
    id: "HV-101",
    title: "Research the audience",
    agent: "researcher",
    status: "done",
    note: "Audience brief ready, with three source references.",
  },
  {
    id: "HV-102",
    title: "Draft the launch announcement",
    agent: "writer",
    status: "in_progress",
    note: "Refining the announcement using the research handoff.",
  },
  {
    id: "HV-103",
    title: "Review the launch draft",
    agent: "reviewer",
    status: "in_review",
    note: "The first draft is waiting for a human review.",
  },
  {
    id: "HV-104",
    title: "Prepare the product brief",
    agent: "researcher",
    status: "todo",
    note: "Outline the product story and the audience it serves.",
  },
  {
    id: "HV-105",
    title: "Check the source reference",
    agent: "researcher",
    status: "failed",
    note: "The example source could not be reached. A person can inspect and retry it.",
  },
];

const payload = {
  action: "publish",
  destination: "Hivlet updates",
  audience: "public",
  content: "Your agents. Better together. A shared office for the work ahead.",
};

const workflow = [
  {
    title: "Make room for the team.",
    description:
      "Start with a shared workspace. Give every agent a role, and keep a person behind every decision.",
    short: "A shared home",
    icon: UsersRound,
    artifact: "Launch workspace",
    detail: "3 agents · 3 human owners",
  },
  {
    title: "Give the work a direction.",
    description:
      "Assign a clear task. Keep its context, files, and handoffs together as work moves between agents.",
    short: "Work with context",
    icon: PenLine,
    artifact: "Launch announcement",
    detail: "Research → draft → review",
  },
  {
    title: "Keep your judgment in the loop.",
    description:
      "Review the evidence and the exact action. Approve what should happen, then track the outcome separately.",
    short: "A human decision",
    icon: ShieldCheck,
    artifact: "Review the final draft",
    detail: "Permission first. Outcome recorded separately.",
  },
];

const faqs = [
  {
    question: "Is this another chat window?",
    answer:
      "No. Hivlet organizes work around tasks, agents, handoffs, reports, and decisions. The goal is a clear next step—not a longer conversation history.",
  },
  {
    question: "Where do people fit in?",
    answer:
      "Every agent has a human owner. People set the direction, inspect the work, and review sensitive actions. Agent-reported progress and human verification stay separate.",
  },
  {
    question: "Can I try it before connecting anything?",
    answer:
      "Yes. The interactive preview on this page uses illustrative local data. No provider is connected, no credentials are needed, and no external action is executed.",
  },
  {
    question: "What does it cost?",
    answer:
      "Hivlet is in early access and pricing has not been set. You can explore the interactive preview before deciding how it fits your team.",
  },
  {
    question: "What happens when an agent needs permission?",
    answer:
      "It stops at an approval gate, with the exact action and payload shown. Nothing is published, sent, or spent until a human approves it, and an approval is permission, not proof that the action succeeded.",
  },
  {
    question: "What if an agent's work is wrong?",
    answer:
      "It stays in review, not marked done. A human checks the report, and only that verification moves the work forward.",
  },
];

function Wordmark({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      prefetch={false}
      href="/"
      className={`hp-brand ${footer ? "hp-brand-footer" : ""}`}
      aria-label="Hivlet homepage"
    >
      <svg viewBox="0 0 28 30" fill="none" aria-hidden="true">
        <path
          d="M3 5v20M25 5v20M3 15h22M8 5h12M8 25h12M8 5v5M20 20v5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
      <span>
        Hivlet<span className="hp-brand-dot">.</span>
      </span>
    </Link>
  );
}

function Status({
  status,
  children,
}: {
  status: string;
  children?: ReactNode;
}) {
  const tone = ["working", "in_progress"].includes(status)
    ? "working"
    : ["in_review", "awaiting_approval", "pending"].includes(status)
      ? "waiting"
      : ["approved", "done"].includes(status)
        ? "success"
        : ["rejected", "failed"].includes(status)
          ? "error"
          : "neutral";
  return (
    <span className={`hp-status hp-status-${tone}`}>
      {tone === "working" && <span className="hp-status-dot" />}
      {children || labels[status] || status}
    </span>
  );
}

function AgentIcon({
  icon: Icon,
  working = false,
  large = false,
}: {
  icon: LucideIcon;
  working?: boolean;
  large?: boolean;
}) {
  return (
    <span
      className={`hp-agent-icon ${working ? "is-working" : ""} ${large ? "is-large" : ""}`}
    >
      <Icon size={large ? 25 : 18} strokeWidth={1.5} />
    </span>
  );
}

function CTA({
  children = "Create a workspace",
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      prefetch={false}
      href={homepageLinks.signup}
      className={`hp-button hp-button-primary ${className}`}
    >
      {children}
      <ArrowUpRight size={17} strokeWidth={1.7} />
    </Link>
  );
}

function keyboardTabs(
  e: KeyboardEvent<HTMLElement>,
  index: number,
  count: number,
  select: (index: number) => void,
) {
  let next = index;
  if (e.key === "ArrowRight" || e.key === "ArrowDown")
    next = (index + 1) % count;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
    next = (index + count - 1) % count;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = count - 1;
  else return;
  e.preventDefault();
  select(next);
  const tabs =
    e.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
      '[role="tab"]',
    );
  tabs?.[next]?.focus();
}

function trapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const elements = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.getClientRects().length > 0);
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (!first || !last) return;
  if (
    event.shiftKey &&
    (document.activeElement === first ||
      document.activeElement === event.currentTarget)
  ) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function MarketingPage() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("tasks");
  const [filter, setFilter] = useState<TaskState | "all">("all");
  const [decision, setDecision] = useState<Decision>("pending");
  const [workflowStep, setWorkflowStep] = useState(0);
  const [faq, setFaq] = useState<number | null>(0);
  const [record, setRecord] = useState<PreviewRecord>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogReturnRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [notification, setNotification] = useState<{
    title: string;
    detail?: string;
    id: number;
  } | null>(null);
  const toast = (title: string, detail?: string) =>
    setNotification({ title, detail, id: Date.now() });

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      root.classList.add("hp-motion-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );
    root
      .querySelectorAll("[data-reveal]")
      .forEach((node) => observer.observe(node));
    let frame = 0;
    const updateScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const total =
          document.documentElement.scrollHeight - window.innerHeight;
        if (progressRef.current)
          progressRef.current.style.transform = `scaleX(${total > 0 ? Math.min(1, window.scrollY / total) : 0})`;
      });
    };
    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateScroll);
      cancelAnimationFrame(frame);
    };
  }, []);


  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (record) {
      dialogReturnRef.current = document.activeElement as HTMLElement;
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
      dialogReturnRef.current?.focus();
    }
  }, [record]);

  const reviewRequest = () => {
    setActiveTab("approvals");
    document.getElementById("workspace")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  const resetPreview = () => {
    setDecision("pending");
    setFilter("all");
    setActiveTab("tasks");
    toast("A fresh start.", "The illustrative workspace has been reset.");
  };

  const selectTab = (tab: PreviewTab) => {
    setActiveTab(tab);
    if (tab === "tasks") setFilter("all");
  };

  const selectedTask =
    record?.kind === "task"
      ? tasks.find((task) => task.id === record.id)
      : undefined;
  const selectedAgent =
    record?.kind === "agent"
      ? agents.find((agent) => agent.id === record.id)
      : undefined;

  return (
    <div
      ref={rootRef}
      className="hp"
      id="top"
    >
      <a href="#homepage-content" className="hp-skip">
        Skip to content
      </a>

      <main id="homepage-content">
        <section
          className="hp-hero hp-container"
          aria-labelledby="hp-hero-title"
        >
          <div className="hp-hero-copy">
            <a
              href="#workspace"
              className="hp-announcement hp-intro hp-intro-1"
            >
              <span className="hp-announcement-dot" />
              <span>A little structure. A lot more possibility.</span>
              <ArrowUpRight size={13} />
            </a>
            <h1 id="hp-hero-title" className="hp-intro hp-intro-2">
              Your AI team.
              <br />
              <em>Better together.</em>
            </h1>
            <p className="hp-hero-description hp-intro hp-intro-3">
              A shared office for your agents, their work, and the people in
              charge. Less chasing updates. More moving things forward.
            </p>
            <div className="hp-hero-actions hp-intro hp-intro-4">
              <CTA>Create your workspace</CTA>
              <a href="#workspace" className="hp-button hp-button-secondary">
                <span className="hp-play-icon">
                  <Play size={11} fill="currentColor" />
                </span>
                Take a look inside
              </a>
            </div>
            <p className="hp-hero-note hp-intro hp-intro-4">
              Early access. Start small. Make room for good work.
            </p>
            <div className="hp-made-for hp-intro hp-intro-5">
              <span>FOR TEAMS WITH THINGS TO MAKE</span>
              <div>
                <span>
                  <Layers3 size={15} />
                  Builders
                </span>
                <span>
                  <PenLine size={15} />
                  Creators
                </span>
                <span>
                  <Compass size={15} />
                  Operators
                </span>
              </div>
            </div>
          </div>

          <div className="hp-hero-office hp-intro hp-intro-3">
            <div className="hp-office-window">
              <div className="hp-office-topbar">
                <span className="hp-office-mark">
                  <Layers3 size={19} strokeWidth={1.4} />
                </span>
                <div>
                  <strong>The launch team</strong>
                  <span>One office. A shared direction.</span>
                </div>
                <span className="hp-example-tag">EXAMPLE</span>
              </div>
              <div className="hp-office-content">
                <div className="hp-office-greeting">
                  <p>YOUR TEAM, IN VIEW</p>
                  <h2>A good day’s work.</h2>
                  <span className="hp-office-date">TODAY’S VIEW</span>
                </div>
                <div className="hp-office-stats">
                  <div>
                    <strong>
                      3<span>↗</span>
                    </strong>
                    <span>Agents, aligned</span>
                  </div>
                  <div>
                    <strong>5</strong>
                    <span>Tasks, in view</span>
                  </div>
                  <div>
                    <strong>
                      {decision === "pending" ? "1" : "0"}
                      <span className="hp-stat-marker" />
                    </strong>
                    <span>Your next decision</span>
                  </div>
                </div>
                <div className="hp-mini-heading">
                  <span>THE TEAM, IN VIEW</span>
                  <span>3 agents</span>
                </div>
                <div className="hp-office-agents">
                  {agents.map((agent, index) => (
                    <div
                      className={`hp-office-agent hp-agent-entry-${index}`}
                      key={agent.id}
                    >
                      <AgentIcon
                        icon={agent.icon}
                        working={agent.status === "working"}
                      />
                      <div>
                        <strong>{agent.name}</strong>
                        <span>Owned by {agent.owner}</span>
                      </div>
                      <Status
                        status={
                          agent.id === "reviewer" && decision !== "pending"
                            ? "idle"
                            : agent.status
                        }
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={`hp-hero-request ${decision !== "pending" ? "is-decided" : ""}`}
                  onClick={reviewRequest}
                >
                  <span className="hp-request-symbol">
                    {decision === "pending" ? (
                      <ShieldCheck size={21} strokeWidth={1.45} />
                    ) : (
                      <CheckCheck size={21} />
                    )}
                  </span>
                  <span>
                    <strong>
                      {decision === "pending"
                        ? "A little human judgment, please."
                        : "Your decision is on the record."}
                    </strong>
                    <span>
                      {decision === "pending"
                        ? "The launch announcement is ready to review."
                        : "Permission recorded. Nothing was published."}
                    </span>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              </div>
              <div className="hp-office-bottom">
                <span>
                  <i />
                  Illustrative workspace
                </span>
                <span>Agents work. People decide.</span>
              </div>
            </div>
            <div className="hp-office-margin-note">
              <span />
              Less coordination. More possibility.
            </div>
          </div>
        </section>

        <section
          className="hp-capability-strip hp-container"
          aria-label="What belongs in your workspace"
          data-reveal
        >
          <p>
            ONE PLACE FOR
            <br />
            <span>THE WHOLE PICTURE.</span>
          </p>
          {[
            {
              icon: LayoutList,
              title: "The work",
              text: "Tasks with a clear next step",
            },
            {
              icon: UsersRound,
              title: "The team",
              text: "Agents with human owners",
            },
            {
              icon: FileCheck2,
              title: "The evidence",
              text: "Reports ready for review",
            },
            {
              icon: ShieldCheck,
              title: "The decisions",
              text: "Permission, with context",
            },
          ].map((item) => (
            <div key={item.title}>
              <item.icon size={22} strokeWidth={1.3} />
              <span>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </span>
            </div>
          ))}
        </section>

        <section
          className="hp-product hp-section hp-container"
          id="workspace"
          aria-labelledby="hp-product-title"
        >
          <div className="hp-section-topline" data-reveal>
            <span className="hp-kicker">
              <span />A WORKSPACE, NOT ANOTHER CHAT WINDOW
            </span>
            <span className="hp-section-index">01 / THE OFFICE</span>
          </div>
          <div className="hp-section-heading" data-reveal>
            <h2 id="hp-product-title">
              All the context.
              <br />
              <em>None of the guesswork.</em>
            </h2>
            <div>
              <p>
                See who’s doing what, where the work stands, and what needs you
                next. It’s a small shift that changes the whole workday.
              </p>
              <a href={homepageLinks.demo} className="hp-text-link">
                Explore the preview
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

          <div className="hp-workspace" data-reveal>
            <aside className="hp-demo-sidebar">
              <div className="hp-demo-workspace-name">
                <span className="hp-workspace-avatar">L</span>
                <div>
                  <strong>Launch workspace</strong>
                  <span>Our next big thing</span>
                </div>
              </div>
              <p className="hp-demo-nav-label">THE OFFICE</p>
              <div
                className="hp-demo-nav"
                role="tablist"
                aria-label="Interactive workspace preview"
              >
                {(
                  [
                    { id: "tasks", label: "Tasks", icon: LayoutList },
                    { id: "agents", label: "Agents", icon: UsersRound },
                    { id: "approvals", label: "Approvals", icon: ShieldCheck },
                  ] as const
                ).map((tab, index) => (
                  <button
                    type="button"
                    key={tab.id}
                    id={`hp-tab-${tab.id}`}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`hp-panel-${tab.id}`}
                    aria-label={tab.label}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    className={activeTab === tab.id ? "is-active" : ""}
                    onClick={() => selectTab(tab.id)}
                    onKeyDown={(event) =>
                      keyboardTabs(event, index, 3, (i) =>
                        selectTab(
                          (["tasks", "agents", "approvals"] as const)[i],
                        ),
                      )
                    }
                  >
                    <tab.icon size={17} strokeWidth={1.6} />
                    <span>{tab.label}</span>
                    {tab.id === "approvals" && decision === "pending" && (
                      <span className="hp-nav-count">1</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="hp-demo-sidebar-bottom">
                <span className="hp-owner-avatar">P</span>
                <div>
                  <strong>Patrick</strong>
                  <span>The human in the loop</span>
                </div>
              </div>
            </aside>
            <div className="hp-demo-main">
              <div className="hp-demo-toolbar">
                <span>
                  <span className="hp-demo-dot" />
                  INTERACTIVE PREVIEW
                </span>
                <div>
                  <button
                    type="button"
                    className="hp-icon-button"
                    aria-label="Reset interactive preview"
                    onClick={resetPreview}
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
              </div>
              <div
                className="hp-demo-panel"
                key={activeTab}
                id={`hp-panel-${activeTab}`}
                role="tabpanel"
                aria-labelledby={`hp-tab-${activeTab}`}
                tabIndex={0}
              >
                {activeTab === "tasks" && (
                  <>
                    <div className="hp-demo-title">
                      <div>
                        <h3>A little momentum.</h3>
                        <p>Every task has a place to go.</p>
                      </div>
                      <Link
                        prefetch={false}
                        href={homepageLinks.signup}
                        className="hp-demo-add"
                      >
                        <Plus size={15} />
                        <span>Create a workspace</span>
                      </Link>
                    </div>
                    <div
                      className="hp-task-filters"
                      role="group"
                      aria-label="Filter preview tasks"
                    >
                      {(
                        [
                          "all",
                          "in_progress",
                          "in_review",
                          "done",
                          "todo",
                          "failed",
                        ] as const
                      ).map((status) => (
                        <button
                          type="button"
                          key={status}
                          aria-pressed={filter === status}
                          onClick={() => setFilter(status)}
                          className={filter === status ? "is-active" : ""}
                        >
                          {status === "all" ? "All work" : labels[status]}
                          {status === "all" && <span>5</span>}
                        </button>
                      ))}
                    </div>
                    <div className="hp-task-list">
                      {tasks
                        .filter(
                          (task) => filter === "all" || task.status === filter,
                        )
                        .map((task) => {
                          const agent = agents.find(
                            (item) => item.id === task.agent,
                          )!;
                          return (
                            <button
                              type="button"
                              key={task.id}
                              className="hp-task-row"
                              onClick={() =>
                                setRecord({ kind: "task", id: task.id })
                              }
                              aria-label={`View ${task.title}`}
                            >
                              <span
                                className={`hp-task-state hp-task-state-${task.status}`}
                              >
                                {task.status === "done" ? (
                                  <Check size={13} />
                                ) : task.status === "in_progress" ? (
                                  <span />
                                ) : task.status === "failed" ? (
                                  <X size={12} />
                                ) : null}
                              </span>
                              <span className="hp-task-name">
                                <strong>{task.title}</strong>
                                <span>
                                  {task.id}
                                  <span>·</span>
                                  {agent.name}
                                  <span>·</span>Owned by {agent.owner}
                                </span>
                              </span>
                              <Status status={task.status} />
                              <ChevronRight
                                size={16}
                                className="hp-task-chevron"
                              />
                            </button>
                          );
                        })}
                    </div>
                    <div className="hp-demo-panel-bottom">
                      <span>
                        {
                          tasks.filter(
                            (task) =>
                              filter === "all" || task.status === filter,
                          ).length
                        }{" "}
                        of 5 illustrative tasks
                      </span>
                      <span>
                        Click a task to see its context
                        <ArrowUpRight size={13} />
                      </span>
                    </div>
                  </>
                )}
                {activeTab === "agents" && (
                  <>
                    <div className="hp-demo-title">
                      <div>
                        <h3>A capable little team.</h3>
                        <p>Different strengths. One shared direction.</p>
                      </div>
                      <span className="hp-subtle-tag">3 agents · 3 owners</span>
                    </div>
                    <div className="hp-agent-cards">
                      {agents.map((agent) => (
                        <button
                          type="button"
                          key={agent.id}
                          className="hp-agent-card"
                          onClick={() =>
                            setRecord({ kind: "agent", id: agent.id })
                          }
                        >
                          <div className="hp-agent-card-top">
                            <AgentIcon
                              icon={agent.icon}
                              large
                              working={agent.status === "working"}
                            />
                            <ArrowUpRight size={17} />
                          </div>
                          <h4>{agent.name}</h4>
                          <p>{agent.role}</p>
                          <Status
                            status={
                              agent.id === "reviewer" && decision !== "pending"
                                ? "idle"
                                : agent.status
                            }
                          />
                          <div className="hp-agent-card-owner">
                            <span>{agent.initial}</span>
                            <span>
                              Owned by <b>{agent.owner}</b>
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="hp-demo-context-note">
                      <UsersRound size={16} />
                      <p>
                        Not a black box of bots. Every agent has a role, a task,
                        and a person behind it.
                      </p>
                    </div>
                  </>
                )}
                {activeTab === "approvals" && (
                  <>
                    <div className="hp-demo-title">
                      <div>
                        <h3>Your judgment belongs here.</h3>
                        <p>
                          {decision === "pending"
                            ? "One thoughtful decision. All the context."
                            : "A clear decision, with its context intact."}
                        </p>
                      </div>
                      <span className="hp-subtle-tag">
                        {decision === "pending"
                          ? "1 pending"
                          : "Decision recorded"}
                      </span>
                    </div>
                    <article className="hp-approval-card">
                      <div className="hp-approval-top">
                        <span>
                          <ShieldCheck size={15} />
                          PUBLISH REQUEST
                        </span>
                        <Status status={decision} />
                      </div>
                      <h4>Publish the launch announcement</h4>
                      <div className="hp-approval-context">
                        <div>
                          <span>Requested by</span>
                          <strong>
                            Reviewer <span>· Owned by Patrick</span>
                          </strong>
                        </div>
                        <div>
                          <span>Destination</span>
                          <strong>
                            Hivlet updates <span>· Public</span>
                          </strong>
                        </div>
                      </div>
                      <div className="hp-payload-excerpt">
                        <span>THE EXACT CONTENT</span>
                        <p>
                          “Your agents. Better together. A shared office for the
                          work ahead.”
                        </p>
                      </div>
                      <button
                        type="button"
                        className="hp-payload-link"
                        onClick={() => setRecord({ kind: "payload" })}
                      >
                        <FileText size={14} />
                        View the full payload
                        <ArrowUpRight size={13} />
                      </button>
                      {decision === "pending" ? (
                        <div className="hp-approval-actions">
                          <button
                            type="button"
                            className="hp-button hp-button-primary"
                            onClick={() => {
                              setDecision("approved");
                              toast(
                                "Preview permission recorded.",
                                "Nothing was published. The task remains in review.",
                              );
                            }}
                          >
                            Approve preview
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            className="hp-button hp-button-secondary"
                            onClick={() => {
                              setDecision("rejected");
                              toast(
                                "Preview request rejected.",
                                "Your decision and reviewed payload stay visible.",
                              );
                            }}
                          >
                            Reject
                          </button>
                          <span>
                            Preview only.
                            <br />
                            No external action.
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`hp-decision-note hp-decision-${decision}`}
                          role="status"
                        >
                          <CircleCheck size={18} />
                          <span>
                            <strong>
                              {decision === "approved"
                                ? "Approved by you"
                                : "Rejected by you"}{" "}
                              · In this preview
                            </strong>
                            <span>
                              {decision === "approved"
                                ? "Permission recorded. Nothing was published or marked complete."
                                : "Nothing was executed. The reviewed payload remains available."}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setDecision("pending")}
                            aria-label="Replay approval preview"
                          >
                            <RotateCcw size={15} />
                          </button>
                        </div>
                      )}
                    </article>
                  </>
                )}
              </div>
            </div>
          </div>
          <p className="hp-preview-disclaimer">
            <span>
              <Compass size={13} />A real feel for the product. Illustrative
              records, no connected providers.
            </span>
            <span>
              Go on. Click around.
              <ArrowUpRight size={13} />
            </span>
          </p>
        </section>

        <section
          className="hp-how hp-section hp-container"
          id="how-it-works"
          aria-labelledby="hp-how-title"
        >
          <div className="hp-section-topline" data-reveal>
            <span className="hp-kicker">
              <span />
              LESS ORCHESTRATION. MORE FORWARD MOTION.
            </span>
            <span className="hp-section-index">02 / THE RHYTHM</span>
          </div>
          <div className="hp-how-layout">
            <div data-reveal>
              <h2 id="hp-how-title">
                From a good idea
                <br />
                <em>to good work.</em>
              </h2>
              <div
                className="hp-process-tabs"
                role="tablist"
                aria-label="How Hivlet works"
              >
                {workflow.map((step, index) => (
                  <button
                    type="button"
                    key={step.title}
                    role="tab"
                    id={`hp-process-tab-${index}`}
                    aria-controls="hp-process-panel"
                    aria-selected={workflowStep === index}
                    tabIndex={workflowStep === index ? 0 : -1}
                    className={`hp-process-step ${workflowStep === index ? "is-active" : ""}`}
                    onClick={() => setWorkflowStep(index)}
                    onKeyDown={(event) =>
                      keyboardTabs(event, index, 3, setWorkflowStep)
                    }
                  >
                    <span className="hp-step-number">0{index + 1}</span>
                    <span>
                      <strong>{step.title}</strong>
                      <span>{step.description}</span>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
            </div>
            <div className="hp-process-illustration" data-reveal>
              <div className="hp-process-caption">
                <span>THE WORK DOESN’T DISAPPEAR BETWEEN STEPS.</span>
                <span className="hp-process-current">
                  0{workflowStep + 1} / 03
                </span>
              </div>
              <div className="hp-flow-nodes">
                <div className="hp-flow-line" aria-hidden="true" />
                {[
                  { label: "The team", icon: UsersRound },
                  { label: "The work", icon: PenLine },
                  { label: "You", icon: ShieldCheck },
                ].map((node, index) => (
                  <div
                    key={node.label}
                    className={
                      workflowStep === index
                        ? "is-active"
                        : workflowStep > index
                          ? "is-done"
                          : ""
                    }
                  >
                    <span>
                      <node.icon size={21} strokeWidth={1.4} />
                    </span>
                    <strong>{node.label}</strong>
                  </div>
                ))}
              </div>
              <div
                className="hp-process-artifact"
                id="hp-process-panel"
                role="tabpanel"
                aria-labelledby={`hp-process-tab-${workflowStep}`}
                tabIndex={0}
                key={workflowStep}
              >
                <span className="hp-artifact-icon">
                  {workflowStep === 0 ? (
                    <FolderOpen size={26} strokeWidth={1.3} />
                  ) : workflowStep === 1 ? (
                    <FileText size={26} strokeWidth={1.3} />
                  ) : (
                    <ShieldCheck size={26} strokeWidth={1.3} />
                  )}
                </span>
                <span className="hp-artifact-overline">
                  {workflow[workflowStep].short}
                </span>
                <h3>{workflow[workflowStep].artifact}</h3>
                <p>{workflow[workflowStep].detail}</p>
                <div className="hp-artifact-rule" />
                <div className="hp-artifact-footer">
                  <span className="hp-avatar-stack">
                    <i>D</i>
                    <i>M</i>
                    <i>P</i>
                  </span>
                  <span>Context included. Always.</span>
                  <CornerDownRight size={16} />
                </div>
              </div>
              <div className="hp-process-footnote">
                <CheckCheck size={15} />
                <span>One thread of work. No lost handoffs.</span>
              </div>
            </div>
          </div>
        </section>

        <section
          className="hp-control hp-container"
          id="control"
          aria-labelledby="hp-control-title"
          data-reveal
        >
          <div className="hp-section-topline">
            <span className="hp-kicker">
              <span />
              AUTONOMY, WITH ACCOUNTABILITY
            </span>
            <span className="hp-section-index">03 / THE DECISION</span>
          </div>
          <div className="hp-control-copy">
            <span className="hp-control-symbol">
              <ShieldCheck size={31} strokeWidth={1.2} />
            </span>
            <h2 id="hp-control-title">
              More capable agents.
              <br />
              <em>Still your call.</em>
            </h2>
            <p>
              Give the team room to move. Keep the decisions that matter where
              they belong—with a person who has the full picture.
            </p>
            <button
              type="button"
              className="hp-text-link"
              onClick={reviewRequest}
            >
              Try a human-in-the-loop decision
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="hp-control-principles">
            {[
              {
                icon: ShieldCheck,
                title: "Permission is specific.",
                text: "Review the action and its exact payload. An approval is permission—not a claim that execution succeeded.",
              },
              {
                icon: FileCheck2,
                title: "Progress comes with evidence.",
                text: "Agent reports and human verification are different things. Keep the work visible until someone has checked it.",
              },
              {
                icon: UsersRound,
                title: "Responsibility has a name.",
                text: "See the requesting agent and the human behind it. Good teamwork starts with knowing who’s accountable.",
              },
            ].map((principle) => (
              <div key={principle.title}>
                <principle.icon size={20} strokeWidth={1.4} />
                <div>
                  <h3>{principle.title}</h3>
                  <p>{principle.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="hp-faq hp-section hp-container"
          id="questions"
          aria-labelledby="hp-faq-title"
        >
          <div className="hp-section-topline" data-reveal>
            <span className="hp-kicker">
              <span />
              A FEW THINGS YOU MIGHT WONDER
            </span>
            <span className="hp-section-index">04 / GOOD QUESTIONS</span>
          </div>
          <div data-reveal>
            <h2 id="hp-faq-title">
              Good questions.
              <br />
              <em>Clear answers.</em>
            </h2>
            <p>
              Thoughtful tools should be
              <br />
              easy to understand.
            </p>
          </div>
          <div className="hp-faq-list" data-reveal>
            {faqs.map((item, index) => (
              <div
                key={item.question}
                className={`hp-faq-item ${faq === index ? "is-open" : ""}`}
              >
                <h3>
                  <button
                    type="button"
                    id={`hp-faq-button-${index}`}
                    aria-expanded={faq === index}
                    aria-controls={`hp-faq-answer-${index}`}
                    onClick={() => setFaq(faq === index ? null : index)}
                  >
                    {item.question}
                    <Plus size={18} />
                  </button>
                </h3>
                <div
                  className="hp-faq-answer"
                  id={`hp-faq-answer-${index}`}
                  role="region"
                  aria-labelledby={`hp-faq-button-${index}`}
                  aria-hidden={faq !== index}
                  inert={faq !== index}
                >
                  <div>
                    <p>{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="hp-section hp-container" id="about" aria-labelledby="hp-about-title" data-reveal>
          <div className="hp-section-topline">
            <span className="hp-kicker">ABOUT</span>
            <span className="hp-section-index">05 / THE BUILDER</span>
          </div>
          <div>
            <h2 id="hp-about-title">
              Built by someone
              <br />
              <em>who builds agents.</em>
            </h2>
            <p>
              Hivlet is a virtual office for AI agents, built by Kartikey
              Singh, an AI developer who builds AI agents, voice agents,
              chatbots, and automation. The idea is simple: if AI agents are
              going to do real work, they need a real office, with desks,
              tasks, reports, and a human in charge.
            </p>
          </div>
        </section>

        <section className="hp-final hp-container" data-reveal>
          <div className="hp-final-top">
            <span className="hp-kicker">
              <span />
              THE NEXT CHAPTER OF WORK
            </span>
            <Link
              prefetch={false}
              href={homepageLinks.signup}
              className="hp-final-top-link"
              aria-label="Create your workspace"
            >
              <ArrowUpRight size={27} strokeWidth={1.2} />
            </Link>
          </div>
          <div className="hp-final-main">
            <div>
              <h2>
                Good company.
                <br />
                <em>Great work ahead.</em>
              </h2>
              <p>
                One workspace. Your people. Their agents.
                <br />A better place to begin.
              </p>
            </div>
            <div>
              <CTA>Create your workspace</CTA>
              <Link
                prefetch={false}
                href={homepageLinks.demo}
                className="hp-final-demo"
              >
                Or explore the preview
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
          <div className="hp-final-bottom">
            <span>Made for small teams with big things to do.</span>
            <span>Early access · Pricing is not set yet.</span>
          </div>
        </section>
      </main>

      <footer className="hp-footer hp-container">
        <div className="hp-footer-top">
          <div>
            <Wordmark footer />
            <p>
              The office for your AI team.
              <br />
              And a more thoughtful way to work.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <span className="hp-footer-heading">Product</span>
            <a href="#workspace">The workspace</a>
            <a href="#how-it-works">How it works</a>
            <a href="#control">Human, in the loop</a>
            <a href="#questions">Good questions</a>
            <a href="#about">About</a>
          </nav>
          <nav aria-label="Site navigation">
            <span className="hp-footer-heading">Resources</span>
            <a href="/docs">Docs</a>
            <a href="/changelog">Changelog</a>
            <a href="/legal/terms">Terms</a>
            <a href="/legal/privacy">Privacy</a>
          </nav>
          <a href="#top" className="hp-back-top">
            Back to top
            <ArrowUp size={16} />
          </a>
        </div>
        <div className="hp-footer-bottom">
          <span>© 2026 Hivlet. A little more together.</span>
          <span>UI preview · No live agents or external actions.</span>
        </div>
      </footer>

      {notification && (
        <div className="hp-notification" role="status">
          <span>
            <CheckCheck size={20} />
          </span>
          <div>
            <strong>{notification.title}</strong>
            {notification.detail && <p>{notification.detail}</p>}
          </div>
          <button
            type="button"
            className="hp-icon-button"
            aria-label="Dismiss preview notification"
            onClick={() => setNotification(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className="hp-dialog"
        aria-labelledby="hp-dialog-title"
        aria-describedby="hp-dialog-description"
        onKeyDown={trapDialogFocus}
        onCancel={() => setRecord(null)}
        onClose={() => setRecord(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              setRecord(null);
          }
        }}
      >
        <div className="hp-dialog-heading">
          <span className="hp-kicker">INSIDE THE ILLUSTRATIVE WORKSPACE</span>
          <button
            type="button"
            className="hp-icon-button"
            aria-label="Close preview details"
            onClick={() => setRecord(null)}
            autoFocus
          >
            <X size={20} />
          </button>
        </div>
        {selectedTask && (
          <>
            <div className="hp-dialog-overline">
              <span>{selectedTask.id}</span>
              <Status status={selectedTask.status} />
            </div>
            <h2 id="hp-dialog-title">{selectedTask.title}</h2>
            <p id="hp-dialog-description">{selectedTask.note}</p>
            <dl className="hp-dialog-metadata">
              <div>
                <dt>Assigned agent</dt>
                <dd>
                  {
                    agents.find((agent) => agent.id === selectedTask.agent)
                      ?.name
                  }
                </dd>
              </div>
              <div>
                <dt>Human owner</dt>
                <dd>
                  {
                    agents.find((agent) => agent.id === selectedTask.agent)
                      ?.owner
                  }
                </dd>
              </div>
            </dl>
            <div className="hp-dialog-context">
              <FileText size={20} />
              <div>
                <strong>Context stays with the task.</strong>
                <p>
                  Instructions, files, handoffs, and review history belong
                  alongside the work—not in a separate conversation.
                </p>
              </div>
            </div>
            <Link
              prefetch={false}
              href={homepageLinks.signup}
              className="hp-button hp-button-secondary"
              onClick={() => setRecord(null)}
            >
              Create a workspace
              <ArrowUpRight size={15} />
            </Link>
          </>
        )}
        {selectedAgent && (
          <>
            <div className="hp-dialog-overline">
              <AgentIcon
                icon={selectedAgent.icon}
                large
                working={selectedAgent.status === "working"}
              />
              <Status
                status={
                  selectedAgent.id === "reviewer" && decision !== "pending"
                    ? "idle"
                    : selectedAgent.status
                }
              />
            </div>
            <h2 id="hp-dialog-title">{selectedAgent.name}</h2>
            <p id="hp-dialog-description">{selectedAgent.role}.</p>
            <dl className="hp-dialog-metadata">
              <div>
                <dt>Human owner</dt>
                <dd>{selectedAgent.owner}</dd>
              </div>
              <div>
                <dt>Workspace</dt>
                <dd>The launch team</dd>
              </div>
            </dl>
            <div className="hp-dialog-context">
              <Compass size={20} />
              <div>
                <strong>Current focus</strong>
                <p>{selectedAgent.focus}</p>
              </div>
            </div>
            <div className="hp-agent-capabilities">
              {selectedAgent.capabilities.map((capability) => (
                <span key={capability}>{capability}</span>
              ))}
            </div>
            <p className="hp-dialog-footnote">
              Illustrative configuration only. No provider is connected or
              running.
            </p>
            <Link
              prefetch={false}
              href={homepageLinks.signup}
              className="hp-button hp-button-secondary"
              onClick={() => setRecord(null)}
            >
              Create a workspace
              <ArrowUpRight size={15} />
            </Link>
          </>
        )}
        {record?.kind === "payload" && (
          <>
            <div className="hp-dialog-overline">
              <span>LAUNCH / PUBLICATION REQUEST</span>
              <Status status={decision} />
            </div>
            <h2 id="hp-dialog-title">
              The exact action.
              <br />
              Nothing between the lines.
            </h2>
            <p id="hp-dialog-description">
              Requested by Reviewer, owned by Patrick. This is the unchanged
              payload shown before and after a preview decision.
            </p>
            <pre className="hp-exact-payload">
              {JSON.stringify(payload, null, 2)}
            </pre>
            <div className="hp-dialog-context">
              <ShieldCheck size={20} />
              <div>
                <strong>Permission isn’t execution.</strong>
                <p>
                  Approving this preview records a local decision only. Nothing
                  is published, sent, or marked complete.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="hp-button hp-button-secondary"
              onClick={() => setRecord(null)}
            >
              Back to the workspace
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </dialog>
    </div>
  );
}
