import { useStore } from '../store/useStore';

export function Crosshair() {
  const focused = useStore((s) => s.focusedAgentId);
  return (
    <div
      className="crosshair"
      style={focused ? { background: '#5fb0ff', boxShadow: '0 0 8px #5fb0ff' } : undefined}
    />
  );
}
