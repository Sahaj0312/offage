import { create } from 'zustand';
import type { Agent, AgentSource, ChatRole } from '../agents/types';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

interface StoreState {
  source: AgentSource | null;
  agents: Agent[];
  /** agent the player is standing near / aiming at (in-world focus) */
  focusedAgentId: string | null;
  /** agent whose info panel is open */
  selectedAgentId: string | null;
  whiteboardOpen: boolean;
  started: boolean;
  chat: ChatMessage[];

  setSource: (s: AgentSource) => void;
  setAgents: (a: Agent[]) => void;
  setFocused: (id: string | null) => void;
  select: (id: string | null) => void;
  toggleWhiteboard: () => void;
  setStarted: (v: boolean) => void;
  sendTask: (agentId: string, task: string) => void;
  sendMessage: (text: string) => void;
  pushChat: (role: ChatRole, text: string) => void;

  agentById: (id: string | null) => Agent | undefined;
}

export const useStore = create<StoreState>((set, get) => ({
  source: null,
  agents: [],
  focusedAgentId: null,
  selectedAgentId: null,
  whiteboardOpen: false,
  started: false,
  chat: [],

  setSource: (s) => set({ source: s }),
  setAgents: (a) => set({ agents: a }),
  setFocused: (id) => {
    if (get().focusedAgentId !== id) set({ focusedAgentId: id });
  },
  select: (id) => set({ selectedAgentId: id }),
  toggleWhiteboard: () => set((s) => ({ whiteboardOpen: !s.whiteboardOpen })),
  setStarted: (v) => set({ started: v }),
  sendTask: (agentId, task) => get().source?.sendTask(agentId, task),
  sendMessage: (text) => get().source?.sendMessage(text),
  pushChat: (role, text) => set((s) => ({ chat: [...s.chat, { role, text }].slice(-100) })),

  agentById: (id) => (id ? get().agents.find((a) => a.id === id) : undefined),
}));
