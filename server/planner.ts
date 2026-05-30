import type { Brain } from './brain/types';

export const MAX_AGENTS = 6; // matches the desk slots in the scene layout

// Strict JSON schema for the plan (Codex requires additionalProperties:false and
// every key listed in `required`; Claude ignores it and parses the text).
export const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    agents: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          systemPrompt: { type: 'string' },
          task: { type: 'string' },
        },
        required: ['name', 'role', 'systemPrompt', 'task'],
      },
    },
  },
  required: ['summary', 'agents'],
};

export interface PlannedAgent {
  name: string;
  role: string;
  systemPrompt: string;
  task: string;
}

export interface TeamPlan {
  summary: string;
  agents: PlannedAgent[];
}

export interface Capabilities {
  write: boolean;
  bash: boolean;
}

/** A guidance line describing what agents can/can't do, for the planner & Manager. */
export function capabilityNote(caps: Capabilities): string {
  if (!caps.write) {
    return 'Agents are READ-ONLY: they can read files and search the web, but CANNOT create or edit files, run shell commands, run/test code, install packages, or use git. Only assign research, analysis, or planning tasks — never tasks that produce or change files.';
  }
  if (!caps.bash) {
    return 'Agents can read and CREATE/EDIT files, but CANNOT run shell commands, run or test code, install packages, start servers, or use git. Do NOT instruct them to run, build, test, install, serve, or commit/push — only to create and edit files. (To verify, they can re-read the files they wrote.)';
  }
  return 'Agents can read/write files AND run shell commands (build, test, install, git). They may run and verify their work.';
}

const PLANNER_SYSTEM = `You are the orchestration planner for "Offage", a 3D virtual office where each desk is an autonomous AI coding agent that works in the user's current project directory.

CONSTRAINTS: {{CAPABILITIES}}
Design tasks that fit strictly within these constraints — never ask an agent to do something it cannot do.

Given a GOAL, design the smallest effective team of 1 to ${MAX_AGENTS} agents to accomplish it. Use ONE agent for simple or inherently sequential goals; use multiple ONLY when the work genuinely parallelizes (e.g. research vs. implementation vs. testing, or independent modules). Agents work in SEPARATE isolated copies and cannot see each other's files mid-round, so don't make one agent depend on another's output within the same plan.

For each agent provide:
- "name": a short, single-word handle (e.g. "Scout", "Drafter", "Tester")
- "role": a 2-4 word description
- "systemPrompt": focused instructions defining this agent's responsibility and how it should behave
- "task": the concrete first task this agent should start working on RIGHT NOW, phrased as a direct instruction to the agent

You have NO tools — do not read files or run commands. Design the plan from the GOAL alone and reply in a SINGLE message.

Respond with ONLY a JSON object, no prose, no code fences:
{"summary":"one sentence describing the plan","agents":[{"name":"...","role":"...","systemPrompt":"...","task":"..."}]}`;

function parsePlan(text: string, goal: string): TeamPlan {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1));
      if (Array.isArray(obj.agents) && obj.agents.length > 0) {
        return {
          summary: typeof obj.summary === 'string' ? obj.summary : 'Team plan',
          agents: obj.agents,
        };
      }
    } catch {
      /* fall through to fallback */
    }
  }
  // Fallback: a single generalist agent that tackles the whole goal.
  return {
    summary: 'Single agent on the full goal (planner output was unparseable).',
    agents: [
      {
        name: 'Solo',
        role: 'Generalist agent',
        systemPrompt: 'You are a capable generalist. Accomplish the goal end to end.',
        task: goal,
      },
    ],
  };
}

/** Ask the brain to design a team of agents for the goal. */
export async function planTeam(brain: Brain, goal: string, caps: Capabilities): Promise<TeamPlan> {
  let text = '';
  try {
    text = await brain.complete(
      PLANNER_SYSTEM.replace('{{CAPABILITIES}}', capabilityNote(caps)),
      `GOAL: ${goal}`,
      PLAN_SCHEMA,
    );
  } catch {
    text = ''; // fall back to a single-agent plan below
  }

  const plan = parsePlan(text, goal);
  plan.agents = plan.agents.slice(0, MAX_AGENTS).map((a, i) => ({
    name: a.name?.trim() || `Agent${i + 1}`,
    role: a.role?.trim() || 'Agent',
    systemPrompt: a.systemPrompt?.trim() || 'Accomplish your assigned task.',
    task: a.task?.trim() || goal,
  }));
  return plan;
}
