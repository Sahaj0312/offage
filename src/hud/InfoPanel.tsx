import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { statusVisual } from '../lib/statusVisuals';

export function InfoPanel({ onClose }: { onClose: () => void }) {
  const agent = useStore((s) => s.agentById(s.selectedAgentId));
  const sendTask = useStore((s) => s.sendTask);
  const [task, setTask] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [agent?.output]);

  if (!agent) return null;
  const v = statusVisual(agent.status);

  const submit = () => {
    const t = task.trim();
    if (!t) return;
    sendTask(agent.id, t);
    setTask('');
  };

  return (
    <div className="info-panel">
      <div className="ip-head">
        <span className="ip-dot" style={{ background: v.color }} />
        <div style={{ flex: 1 }}>
          <h2>{agent.name}</h2>
          <div className="ip-role">{agent.role}</div>
        </div>
        <button className="btn ghost" onClick={onClose}>
          ✕
        </button>
      </div>

      <span className="ip-status" style={{ background: `${v.color}22`, color: v.color }}>
        {v.label}
      </span>

      <div>
        <div className="ip-label">Current task</div>
        <div className="ip-task">{agent.task ?? '—'}</div>
      </div>

      <div>
        <div className="ip-label">Progress · {Math.round(agent.progress * 100)}%</div>
        <div className="progress">
          <div style={{ width: `${Math.round(agent.progress * 100)}%`, background: v.color }} />
        </div>
      </div>

      <div>
        <div className="ip-label">Output</div>
        <div className="logs" ref={logRef}>
          {agent.output.length ? agent.output.join('\n') : 'idle…'}
        </div>
      </div>

      <div>
        <div className="ip-label">Assign a task</div>
        <div className="assign">
          <input
            value={task}
            placeholder="e.g. summarize the design thread"
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button onClick={submit}>Send</button>
        </div>
      </div>
    </div>
  );
}
