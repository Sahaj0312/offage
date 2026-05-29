import type { AgentStatus } from '../agents/types';

export interface StatusVisual {
  /** hex color string for UI dots/badges */
  color: string;
  /** THREE-friendly numeric color for emissive glow */
  glow: number;
  label: string;
  /** short glyph shown in the floating status bubble */
  icon: string;
  /** how strongly the desk/monitor glows, 0..1 */
  intensity: number;
}

export const STATUS_VISUALS: Record<AgentStatus, StatusVisual> = {
  idle: { color: '#8aa0bd', glow: 0x44516a, label: 'Idle', icon: '💤', intensity: 0.15 },
  thinking: { color: '#c08bff', glow: 0x9a5cff, label: 'Thinking', icon: '…', intensity: 0.7 },
  working: { color: '#5fb0ff', glow: 0x3a9bff, label: 'Working', icon: '⌨', intensity: 0.9 },
  done: { color: '#5ce39a', glow: 0x2fd07a, label: 'Done', icon: '✓', intensity: 0.6 },
  error: { color: '#ff6b6b', glow: 0xff3b3b, label: 'Error', icon: '!', intensity: 1.0 },
};

export function statusVisual(status: AgentStatus): StatusVisual {
  return STATUS_VISUALS[status];
}
