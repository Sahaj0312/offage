import { query } from '@anthropic-ai/claude-agent-sdk';
import type { OffageConfig } from './config';

export const MAX_AGENTS = 6; // matches the desk slots in the scene layout

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

const PLANNER_SYSTEM = `You are the orchestration planner for "Offage", a 3D virtual office where each desk is an autonomous AI coding agent that works in the user's current project directory.

Given a GOAL, design the smallest effective team of 1 to ${MAX_AGENTS} agents to accomplish it. Use ONE agent for simple or inherently sequential goals; use multiple ONLY when the work genuinely parallelizes (e.g. research vs. implementation vs. testing, or independent modules).

For each agent provide:
- "name": a short, single-word handle (e.g. "Scout", "Drafter", "Tester")
- "role": a 2-4 word description
- "systemPrompt": focused instructions defining this agent's responsibility and how it should behave
- "task": the concrete first task this agent should start working on RIGHT NOW, phrased as a direct instruction to the agent

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

/** Ask Claude to design a team of agents for the goal. */
export async function planTeam(goal: string, config: OffageConfig): Promise<TeamPlan> {
  const stream = query({
    prompt: `GOAL: ${goal}`,
    options: {
      systemPrompt: PLANNER_SYSTEM,
      allowedTools: [],
      maxTurns: 1,
      ...(config.model ? { model: config.model } : {}),
    },
  });

  let text = '';
  for await (const msg of stream) {
    if (msg.type === 'assistant') {
      for (const block of msg.message.content) if (block.type === 'text') text += block.text;
    } else if (msg.type === 'result' && msg.subtype === 'success' && msg.result) {
      text = msg.result;
    }
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
