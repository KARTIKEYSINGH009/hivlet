// Squad templates: one-click starter teams. No fake metrics, clients, or
// revenue anywhere. A template only creates agent rows and task rows from
// plain text definitions below; it never calls a provider, never spends,
// never publishes, and never sends anything. Running a template twice
// creates a second set of agents and tasks, which is intentional and
// visible in the Agents and Tasks pages.

export type SquadAgentDef = {
  name: string;
  role: string;
  systemPrompt: string;
};

export type SquadTaskDef = {
  title: string;
  description: string;
  // Index into the template's agents array, so the task is assigned to
  // the agent created from that definition in the same run.
  agentIndex: number;
  priority: "low" | "medium" | "high" | "urgent";
};

export type SquadTemplate = {
  key: string;
  name: string;
  description: string;
  agents: SquadAgentDef[];
  tasks: SquadTaskDef[];
};

export const SQUAD_TEMPLATES: SquadTemplate[] = [
  {
    key: "launch",
    name: "Launch squad",
    description:
      "Researcher, writer, and reviewer for a launch post. Each step is a task, so a human can review before anything moves forward.",
    agents: [
      {
        name: "Researcher",
        role: "Researcher",
        systemPrompt:
          "Research the topic, gather the key facts, and hand a short summary to the writer. Do not publish anything.",
      },
      {
        name: "Writer",
        role: "Writer",
        systemPrompt:
          "Draft clear copy from the research summary. Submit it for review; do not publish it yourself.",
      },
      {
        name: "Reviewer",
        role: "Reviewer",
        systemPrompt:
          "Check the draft for accuracy and clarity, and note what needs fixing. Do not publish it yourself.",
      },
    ],
    tasks: [
      {
        title: "Research the launch topic",
        description: "Gather the key facts and hand a short summary to the writer.",
        agentIndex: 0,
        priority: "high",
      },
      {
        title: "Draft the launch post",
        description: "Write a clear draft from the research summary.",
        agentIndex: 1,
        priority: "medium",
      },
      {
        title: "Review the launch draft",
        description: "Check the draft for accuracy and clarity, and list fixes.",
        agentIndex: 2,
        priority: "medium",
      },
    ],
  },
  {
    key: "product",
    name: "Product squad",
    description:
      "Researcher, coder, and designer for a small product change. Work stays as tasks and reports until a human approves it.",
    agents: [
      {
        name: "Product Researcher",
        role: "Researcher",
        systemPrompt:
          "Research the problem and the existing approach, then summarise what the change should do.",
      },
      {
        name: "Coder",
        role: "Coder",
        systemPrompt:
          "Implement the change described in the task and report what was changed. Do not deploy or publish anything.",
      },
      {
        name: "Designer",
        role: "Designer",
        systemPrompt:
          "Describe the interface change in plain words and note what a user will see. Do not publish anything.",
      },
    ],
    tasks: [
      {
        title: "Research the product change",
        description: "Summarise the problem and what the change should do.",
        agentIndex: 0,
        priority: "high",
      },
      {
        title: "Implement the product change",
        description: "Implement the change described in the research summary.",
        agentIndex: 1,
        priority: "medium",
      },
      {
        title: "Describe the interface change",
        description: "Write a plain description of what a user will see.",
        agentIndex: 2,
        priority: "medium",
      },
    ],
  },
  {
    key: "content",
    name: "Content squad",
    description:
      "Researcher, writer, and editor for one piece of content, from research to a reviewed draft.",
    agents: [
      {
        name: "Content Researcher",
        role: "Researcher",
        systemPrompt:
          "Find the facts for the piece and hand over a short, sourced summary.",
      },
      {
        name: "Content Writer",
        role: "Writer",
        systemPrompt:
          "Draft the piece from the research summary. Submit it for review.",
      },
      {
        name: "Content Editor",
        role: "Editor",
        systemPrompt:
          "Edit the draft for clarity and accuracy, and list remaining fixes.",
      },
    ],
    tasks: [
      {
        title: "Research the content piece",
        description: "Find the facts and hand over a short summary.",
        agentIndex: 0,
        priority: "high",
      },
      {
        title: "Write the content draft",
        description: "Draft the piece from the research summary.",
        agentIndex: 1,
        priority: "medium",
      },
      {
        title: "Edit the content draft",
        description: "Edit for clarity and accuracy, and list remaining fixes.",
        agentIndex: 2,
        priority: "medium",
      },
    ],
  },
];

export const AGENCY_TEMPLATE: SquadTemplate = {
  key: "agency",
  name: "Marketing agency squad",
  description:
    "Phase 6 niche template: researcher, writer, and reviewer for agency content and a client-ready report. Nothing is published by an agent; a human reviews first.",
  agents: [
    { name: "Agency Researcher", role: "Researcher", systemPrompt: "Research the client topic and hand a short, sourced summary to the writer. Do not publish anything." },
    { name: "Agency Writer", role: "Writer", systemPrompt: "Draft client content from the research summary. Submit it for review; do not publish it yourself." },
    { name: "Agency Reviewer", role: "Reviewer", systemPrompt: "Check the draft for accuracy and clarity, and list fixes. Prepare a short client report note; do not send it to a client yourself." },
  ],
  tasks: [
    { title: "Research the client topic", description: "Gather facts and hand a short summary to the writer. Done means a summary with key facts is ready for review.", agentIndex: 0, priority: "high" },
    { title: "Draft the client content", description: "Write a clear draft from the research summary. Done means a draft is ready in review format.", agentIndex: 1, priority: "medium" },
    { title: "Review and prepare the client report", description: "Review the draft, list fixes, and prepare a client report note. Done means the report note is ready for the founder to send.", agentIndex: 2, priority: "medium" },
  ],
};

// Agency template is appended to the list so the existing Agents page
// template picker shows it without any other code change.
SQUAD_TEMPLATES.push(AGENCY_TEMPLATE);

export function getSquadTemplate(key: string): SquadTemplate | null {
  return SQUAD_TEMPLATES.find((t) => t.key === key) ?? null;
}
