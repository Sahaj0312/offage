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

  // The Manager is conversational: chat with the lead agent instead of assigning
  // a raw task. It synthesizes the team's work and delegates follow-ups.
  if (agent.kind === 'manager') return <ManagerPanel onClose={onClose} color={v.color} />;

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

function ManagerPanel({ onClose, color }: { onClose: () => void; color: string }) {
  const chat = useStore((s) => s.chat);
  const sendMessage = useStore((s) => s.sendMessage);
  const [msg, setMsg] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [chat]);

  const send = () => {
    const t = msg.trim();
    if (!t) return;
    sendMessage(t);
    setMsg('');
  };

  return (
    <div className="info-panel">
      <div className="ip-head">
        <span className="ip-dot" style={{ background: color }} />
        <div style={{ flex: 1 }}>
          <h2>Manager</h2>
          <div className="ip-role">Lead agent — talk to coordinate the team</div>
        </div>
        <button className="btn ghost" onClick={onClose}>
          ✕
        </button>
      </div>

      <div>
        <div className="ip-label">Conversation</div>
        <div className="logs" ref={logRef} style={{ maxHeight: 260 }}>
          {chat.length === 0
            ? 'No messages yet — the Manager will summarize when the team finishes.'
            : chat.map((m, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <span style={{ color: m.role === 'manager' ? color : '#8aa0bd', fontWeight: 700 }}>
                    {m.role === 'manager' ? 'Manager' : m.role === 'user' ? 'You' : '·'}
                  </span>
                  <br />
                  {m.text}
                </div>
              ))}
        </div>
      </div>

      <div>
        <div className="ip-label">Message the Manager</div>
        <div className="assign">
          <input
            value={msg}
            placeholder="e.g. make the earth bigger and add clouds"
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button onClick={send}>Send</button>
        </div>
      </div>
    </div>
  );
}
