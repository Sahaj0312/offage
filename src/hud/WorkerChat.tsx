import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { archetypeFor, workerFace } from '../lib/personalities';

/**
 * The worker easter egg. You CAN walk up to a worker and "chat" — but they only
 * give canned, escalating brush-offs (per personality archetype) that nudge you
 * to the Manager. Pure client-side comedy; no real tasking.
 */
export function WorkerChat({ onClose }: { onClose: () => void }) {
  const worker = useStore((s) => s.agentById(s.selectedAgentId));
  const id = worker?.id ?? '';
  const messages = useStore((s) => (id ? s.workerChats[id] : undefined)) ?? [];
  const annoyance = useStore((s) => (id ? s.workerAnnoyance[id] ?? 0 : 0));
  const pester = useStore((s) => s.pesterWorker);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!worker) return null;
  const face = workerFace(id, annoyance);
  const archetype = archetypeFor(id);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    pester(id, t);
    setText('');
  };

  return (
    <div className="console-backdrop" onMouseDown={onClose}>
      <div className="console worker-chat" onMouseDown={(e) => e.stopPropagation()}>
        <div className="console-head">
          <span className="worker-face">{face}</span>
          <div className="console-title">{worker.name}</div>
          <div className="console-sub">{worker.role}</div>
          <button className="console-x" onClick={onClose} aria-label="Close">
            esc
          </button>
        </div>

        <div className="console-scroll" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="console-empty">
              {worker.name} is busy working. You can try talking to them… but they'd really rather
              you took it to the Manager (<kbd>⌘K</kbd>).
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`msg ${m.role === 'user' ? 'user' : 'worker'}`}>
                {m.role !== 'user' && <div className="msg-who">{worker.name}</div>}
                <div className="msg-body">{m.text}</div>
              </div>
            ))
          )}
        </div>

        <div className="console-input">
          <input
            ref={inputRef}
            value={text}
            placeholder={`Bother ${worker.name}…`}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button onClick={send} disabled={!text.trim()}>
            Send
          </button>
        </div>
        <div className="console-foot">
          {annoyance >= 3
            ? `${worker.name} is fully done with you. (${archetype.name})`
            : `Real work goes through the Manager — ⌘K`}
        </div>
      </div>
    </div>
  );
}
