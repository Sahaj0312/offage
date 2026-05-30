import { create } from 'zustand';
import type { Agent, AgentSource, ChatRole } from '../agents/types';
import { workerReply } from '../lib/personalities';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

// How long without pestering before a worker simmers down one annoyance tier.
const ANNOY_DECAY_MS = 25_000;

interface StoreState {
  source: AgentSource | null;
  agents: Agent[];
  /** agent the player is standing near / aiming at (in-world focus) */
  focusedAgentId: string | null;
  /** worker whose easter-egg chat is open (workers only) */
  selectedAgentId: string | null;
  whiteboardOpen: boolean;
  /** the Spotlight Manager console is open */
  consoleOpen: boolean;
  /** the console has been opened at least once (gates the first-message auto-open) */
  consoleEverOpened: boolean;
  started: boolean;
  chat: ChatMessage[];
  /** the Manager has something for you and you haven't opened the console yet */
  managerAttention: boolean;
  /** per-worker easter-egg state */
  workerAnnoyance: Record<string, number>;
  workerChats: Record<string, ChatMessage[]>;
  lastPester: Record<string, number>;

  setSource: (s: AgentSource) => void;
  setAgents: (a: Agent[]) => void;
  setFocused: (id: string | null) => void;
  select: (id: string | null) => void;
  toggleWhiteboard: () => void;
  openConsole: () => void;
  closeConsole: () => void;
  toggleConsole: () => void;
  setStarted: (v: boolean) => void;
  sendMessage: (text: string) => void;
  pushChat: (role: ChatRole, text: string) => void;
  /** Pester a worker; appends your line + their canned, escalating reply. */
  pesterWorker: (id: string, text: string) => void;

  agentById: (id: string | null) => Agent | undefined;
  manager: () => Agent | undefined;
}

export const useStore = create<StoreState>((set, get) => ({
  source: null,
  agents: [],
  focusedAgentId: null,
  selectedAgentId: null,
  whiteboardOpen: false,
  consoleOpen: false,
  consoleEverOpened: false,
  started: false,
  chat: [],
  managerAttention: false,
  workerAnnoyance: {},
  workerChats: {},
  lastPester: {},

  setSource: (s) => set({ source: s }),
  setAgents: (a) => set({ agents: a }),
  setFocused: (id) => {
    if (get().focusedAgentId !== id) set({ focusedAgentId: id });
  },
  select: (id) => set({ selectedAgentId: id }),
  toggleWhiteboard: () => set((s) => ({ whiteboardOpen: !s.whiteboardOpen })),

  openConsole: () =>
    set({ consoleOpen: true, consoleEverOpened: true, managerAttention: false, selectedAgentId: null }),
  closeConsole: () => set({ consoleOpen: false }),
  toggleConsole: () => (get().consoleOpen ? get().closeConsole() : get().openConsole()),

  setStarted: (v) => set({ started: v }),
  sendMessage: (text) => get().source?.sendMessage(text),

  pushChat: (role, text) =>
    set((s) => {
      // A Manager message that you haven't seen raises its hand; and the very
      // first one auto-opens the console so you land in the conversation.
      const unseen = role === 'manager' && !s.consoleOpen;
      const autoOpen = role === 'manager' && !s.consoleEverOpened;
      return {
        chat: [...s.chat, { role, text }].slice(-100),
        managerAttention: unseen && !autoOpen ? true : s.managerAttention,
        ...(autoOpen ? { consoleOpen: true, consoleEverOpened: true } : {}),
      };
    }),

  pesterWorker: (id, text) =>
    set((s) => {
      const now = Date.now();
      const last = s.lastPester[id] ?? 0;
      const decay = last ? Math.floor((now - last) / ANNOY_DECAY_MS) : 0;
      const annoyance = Math.max(0, (s.workerAnnoyance[id] ?? 0) - decay);
      const reply = workerReply(id, annoyance);
      const prev = s.workerChats[id] ?? [];
      return {
        workerAnnoyance: { ...s.workerAnnoyance, [id]: annoyance + 1 },
        lastPester: { ...s.lastPester, [id]: now },
        workerChats: {
          ...s.workerChats,
          [id]: [
            ...prev,
            { role: 'user' as ChatRole, text },
            { role: 'manager' as ChatRole, text: reply },
          ].slice(-40),
        },
      };
    }),

  agentById: (id) => (id ? get().agents.find((a) => a.id === id) : undefined),
  manager: () => get().agents.find((a) => a.kind === 'manager'),
}));
