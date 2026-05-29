import { query } from '@anthropic-ai/claude-agent-sdk';
import type { OffageConfig } from './config';

export interface Assignment {
  agent: string; // an existing team member's name
  task: string;
}

export interface ManagerReply {
  reply: string;
  assignments: Assignment[];
}

export interface RoundResult {
  name: string;
  status: string;
  summary: string;
}

interface TeamMember {
  name: string;
  role: string;
}

function parseReply(text: string): ManagerReply {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1));
      return {
        reply: typeof obj.reply === 'string' ? obj.reply : '',
        assignments: Array.isArray(obj.assignments) ? obj.assignments : [],
      };
    } catch {
      /* fall through */
    }
  }
  // If the model didn't emit JSON, treat the whole text as a plain reply.
  return { reply: cleaned || 'Done.', assignments: [] };
}

/**
 * The lead agent. It talks to the operator and delegates work to the team. It is
 * stateful (keeps a conversation transcript) so follow-ups have context. It does
 * NOT use tools — it reasons over the goal, the roster, and what the workers
 * reported, and returns a reply + any new task assignments as JSON.
 */
export class Manager {
  private history: { who: 'OPERATOR' | 'MANAGER'; text: string }[] = [];

  constructor(
    private cfg: OffageConfig,
    private goal: string,
    private team: TeamMember[],
  ) {}

  private system(): string {
    const roster = this.team.map((m) => `- ${m.name}: ${m.role}`).join('\n');
    const names = this.team.map((m) => m.name).join(', ');
    return `You are the Manager — the lead agent of "Offage", an AI agent office. Workers sit at desks and do the hands-on work; you coordinate them and talk to the operator (the human).

Original goal: ${this.goal}

Your team:
${roster}

Respond with ONLY a JSON object, no prose, no code fences:
{"reply": "<a concise, conversational message to the operator, first person>", "assignments": [{"agent": "<one of: ${names}>", "task": "<concrete instruction for that worker>"}]}

Rules:
- To get work done, dispatch tasks to workers by name. Use "assignments": [] when no work is needed (you're answering a question, or the goal is already satisfied).
- Only assign to existing workers: ${names}.
- "reply" is what the operator reads — speak like a lead engineer giving a crisp update. Keep it short.`;
  }

  private prompt(instruction: string): string {
    const transcript = this.history.map((h) => `${h.who}: ${h.text}`).join('\n');
    return (transcript ? transcript + '\n\n' : '') + instruction;
  }

  private async ask(instruction: string, recordOperator: string): Promise<ManagerReply> {
    const stream = query({
      prompt: this.prompt(instruction),
      options: {
        systemPrompt: this.system(),
        allowedTools: [],
        maxTurns: 1,
        ...(this.cfg.model ? { model: this.cfg.model } : {}),
      },
    });
    let text = '';
    for await (const msg of stream) {
      if (msg.type === 'assistant') {
        for (const b of msg.message.content) if (b.type === 'text') text += b.text;
      } else if (msg.type === 'result' && msg.subtype === 'success' && msg.result) {
        text = msg.result;
      }
    }
    const parsed = parseReply(text);
    this.history.push({ who: 'OPERATOR', text: recordOperator });
    this.history.push({ who: 'MANAGER', text: parsed.reply });
    return parsed;
  }

  /** Handle a message from the operator: answer and/or delegate to the team. */
  userTurn(text: string): Promise<ManagerReply> {
    return this.ask(`The operator says: "${text}"\nDecide how to handle it.`, text);
  }

  /** Summarize a finished round for the operator. */
  synthesize(results: RoundResult[]): Promise<ManagerReply> {
    const body = results
      .map((r) => `- ${r.name} (${r.status}): ${r.summary || '(no summary)'}`)
      .join('\n');
    return this.ask(
      `The team just finished this round:\n${body}\n\nSummarize for the operator what was accomplished and how to use or verify it. Set "assignments" to [] unless follow-up work is clearly required to meet the goal.`,
      `[team finished: ${results.map((r) => `${r.name}=${r.status}`).join(', ')}]`,
    );
  }
}
