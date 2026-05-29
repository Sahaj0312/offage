import type { AgentSource } from './types';
import { MockAgentSource } from './MockAgentSource';
import { WebSocketAgentSource } from './WebSocketAgentSource';

/**
 * The single place that decides where agent data comes from.
 *   - `?mock` in the URL  -> pure offline mock
 *   - otherwise           -> live orchestrator over WebSocket, falling back to
 *                            the mock automatically if no server is reachable.
 */
export function createAgentSource(): AgentSource {
  if (new URLSearchParams(location.search).has('mock')) return new MockAgentSource();
  return new WebSocketAgentSource(new MockAgentSource());
}
