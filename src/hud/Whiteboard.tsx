import { useStore } from '../store/useStore';
import { statusVisual } from '../lib/statusVisuals';

export function Whiteboard({ onClose }: { onClose: () => void }) {
  const agents = useStore((s) => s.agents);
  const counts = agents.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="whiteboard">
      <button className="btn ghost wb-close" onClick={onClose}>
        ✕
      </button>
      <h2>Orchestration</h2>
      <div className="wb-sub">
        {agents.length} agents ·{' '}
        {Object.entries(counts)
          .map(([s, n]) => `${n} ${statusVisual(s as never).label.toLowerCase()}`)
          .join(' · ')}
      </div>

      <div className="wb-grid">
        {agents.map((a) => {
          const v = statusVisual(a.status);
          return (
            <div key={a.id} className="wb-card">
              <div className="wb-top">
                <span className="wb-dot" style={{ background: v.color }} />
                <span className="wb-name">{a.name}</span>
                <span
                  className="badge"
                  style={{ marginLeft: 'auto', background: `${v.color}22`, color: v.color }}
                >
                  {v.label}
                </span>
              </div>
              <div className="wb-task">{a.task ?? a.role}</div>
              <div className="progress">
                <div style={{ width: `${Math.round(a.progress * 100)}%`, background: v.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
