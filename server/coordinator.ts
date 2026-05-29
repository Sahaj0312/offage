import type { ChatRole } from '../shared/agent';
import type { Orchestrator } from './orchestrator';
import type { Assignment, Manager, RoundResult } from './manager';

const MANAGER_ID = 'manager';

/** Last non-trivial output line from an agent, for the Manager to summarize. */
function lastSummary(output: string[]): string {
  for (let i = output.length - 1; i >= 0; i--) {
    const line = output[i].replace(/^>\s?/, '').trim();
    if (line && !line.startsWith('tool:') && !line.startsWith('isolated workspace') && line !== 'task complete ✓') {
      return line;
    }
  }
  return output[output.length - 1]?.replace(/^>\s?/, '') ?? '';
}

/**
 * Ties the Manager (lead agent) to the worker team: dispatches the Manager's
 * assignments to the orchestrator, waits for the round to finish, and feeds the
 * results back for synthesis. Emits chat so both the terminal and the in-world
 * Manager desk can show the conversation.
 */
export class Coordinator {
  private chatListeners = new Set<(role: ChatRole, text: string) => void>();
  private busy = false;

  constructor(
    private orch: Orchestrator,
    private manager: Manager,
    /** worker name (lowercased) -> agent id */
    private nameToId: Map<string, string>,
    /** when true, the Manager may auto-dispatch follow-up rounds until done */
    private autonomous = false,
    private maxRounds = 6,
  ) {}

  onChat(cb: (role: ChatRole, text: string) => void) {
    this.chatListeners.add(cb);
    return () => this.chatListeners.delete(cb);
  }

  private emit(role: ChatRole, text: string) {
    // Mirror the conversation onto the Manager's in-world monitor.
    const tag = role === 'user' ? 'You' : role === 'manager' ? 'Manager' : '·';
    this.orch.post(MANAGER_ID, [`${tag}: ${text}`]);
    for (const cb of this.chatListeners) cb(role, text);
  }

  private dispatch(assignments: Assignment[]): string[] {
    const ids: string[] = [];
    for (const a of assignments) {
      const id = this.nameToId.get(a.agent.toLowerCase());
      if (id) {
        this.orch.assign(id, a.task);
        ids.push(id);
      }
    }
    return ids;
  }

  private waitForRound(ids: string[]): Promise<void> {
    if (!ids.length) return Promise.resolve();
    const idset = new Set(ids);
    return new Promise((resolve) => {
      const check = () => {
        const done = this.orch
          .getAgents()
          .filter((a) => idset.has(a.id))
          .every((a) => a.status === 'done' || a.status === 'error' || a.status === 'idle');
        if (done) resolve();
        else setTimeout(check, 500);
      };
      setTimeout(check, 500);
    });
  }

  private collect(ids: string[]): RoundResult[] {
    const agents = this.orch.getAgents();
    return ids
      .map((id) => agents.find((a) => a.id === id))
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a) => ({ name: a.name, status: a.status, summary: lastSummary(a.output) }));
  }

  /**
   * Wait for a round, synthesize it, and — in autonomous mode — keep dispatching
   * follow-up rounds the Manager asks for until the goal is met or the cap is hit.
   */
  private async settle(ids: string[], round: number) {
    await this.waitForRound(ids);
    const synth = await this.manager.synthesize(this.collect(ids));
    this.emit('manager', synth.reply);
    if (this.autonomous && synth.assignments.length && round < this.maxRounds) {
      this.emit('system', `Manager is continuing (round ${round + 1} of up to ${this.maxRounds})…`);
      const next = this.dispatch(synth.assignments);
      if (next.length) await this.settle(next, round + 1);
    } else if (this.autonomous && synth.assignments.length) {
      this.emit('system', `Reached the ${this.maxRounds}-round limit — pausing for you.`);
    }
  }

  /** The initial team round was dispatched by the launcher; wait + synthesize (+ auto-continue). */
  async runInitialRound(ids: string[]) {
    this.busy = true;
    this.orch.post(MANAGER_ID, ['Manager: watching the team…'], 'thinking');
    await this.settle(ids, 1);
    this.orch.post(MANAGER_ID, [], 'idle');
    this.busy = false;
  }

  /** Handle an operator message: plan -> delegate -> wait -> synthesize (+ auto-continue). */
  async userTurn(text: string) {
    if (this.busy) {
      this.emit('system', 'The team is still working — one moment.');
      return;
    }
    this.busy = true;
    try {
      this.emit('user', text);
      this.orch.post(MANAGER_ID, [], 'thinking');
      const plan = await this.manager.userTurn(text);
      if (plan.reply) this.emit('manager', plan.reply);
      if (plan.assignments.length) await this.settle(this.dispatch(plan.assignments), 1);
    } finally {
      this.orch.post(MANAGER_ID, [], 'idle');
      this.busy = false;
    }
  }
}

export { MANAGER_ID };
