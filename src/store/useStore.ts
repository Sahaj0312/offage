import { create } from 'zustand';
import type { Agent, AgentSource } from '../agents/types';

interface StoreState {
  source: AgentSource | null;
  agents: Agent[];
  /** agent the player is standing near / aiming at (in-world focus) */
  focusedAgentId: string | null;
  /** agent whose info panel is open */
  selectedAgentId: string | null;
  whiteboardOpen: boolean;
  started: boolean;

  setSource: (s: AgentSource) => void;
  setAgents: (a: Agent[]) => void;
  setFocused: (id: string | null) => void;
  select: (id: string | null) => void;
  toggleWhiteboard: () => void;
  setStarted: (v: boolean) => void;
  sendTask: (agentId: string, task: string) => void;

  agentById: (id: string | null) => Agent | undefined;
}

export const useStore = create<StoreState>((set, get) => ({
  source: null,
  agents: [],
  focusedAgentId: null,
  selectedAgentId: null,
  whiteboardOpen: false,
  started: false,

  setSource: (s) => set({ source: s }),
  setAgents: (a) => set({ agents: a }),
  setFocused: (id) => {
    if (get().focusedAgentId !== id) set({ focusedAgentId: id });
  },
  select: (id) => set({ selectedAgentId: id }),
  toggleWhiteboard: () => set((s) => ({ whiteboardOpen: !s.whiteboardOpen })),
  setStarted: (v) => set({ started: v }),
  sendTask: (agentId, task) => get().source?.sendTask(agentId, task),

  agentById: (id) => (id ? get().agents.find((a) => a.id === id) : undefined),
}));
