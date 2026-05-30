import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store/useStore';

/**
 * The Command Console — a Spotlight-style centered chat with the Manager (the
 * lead agent). Summoned with ⌘K / Ctrl+K from anywhere, or E at the Manager's
 * desk. This is the primary way to drive the whole build; you never need the CLI.
 */
export function CommandConsole({ onClose }: { onClose: () => void }) {
  const chat = useStore((s) => s.chat);
  const sendMessage = useStore((s) => s.sendMessage);
  const manager = useStore((s) => s.manager());
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const thinking = manager?.status === 'thinking' || manager?.status === 'working';
  const noManager = !manager;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, thinking]);

  const send = () => {
    const t = text.trim();
    if (!t || thinking || noManager) return;
    sendMessage(t);
    setText('');
  };

  return (
    <div className="console-backdrop" onMouseDown={onClose}>
      <div className="console" onMouseDown={(e) => e.stopPropagation()}>
        <div className="console-head">
          <span className="console-dot" data-on={thinking} />
          <div className="console-title">Manager</div>
          <div className="console-sub">{thinking ? 'working…' : noManager ? 'offline' : 'ready'}</div>
          <button className="console-x" onClick={onClose} aria-label="Close">
            esc
          </button>
        </div>

        <div className="console-scroll" ref={scrollRef}>
          {noManager ? (
            <div className="console-empty">
              No Manager here yet. Run <code>offage</code> in your terminal to assemble a team, then
              talk to your Manager right here.
            </div>
          ) : chat.length === 0 ? (
            <div className="console-empty">Say hi to your Manager, or tell it what to build next.</div>
          ) : (
            chat.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role !== 'user' && m.role !== 'system' && <div className="msg-who">Manager</div>}
                <div className="msg-body">
                  <Markdown remarkPlugins={[remarkGfm]}>{m.text}</Markdown>
                </div>
              </div>
            ))
          )}
          {thinking && (
            <div className="msg manager">
              <div className="msg-who">Manager</div>
              <div className="msg-body thinking">
                <span /> <span /> <span />
              </div>
            </div>
          )}
        </div>

        <div className="console-input">
          <textarea
            ref={inputRef}
            value={text}
            rows={1}
            placeholder={noManager ? 'Manager is offline…' : 'Message your Manager…'}
            disabled={noManager}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button onClick={send} disabled={!text.trim() || thinking || noManager}>
            {thinking ? '…' : 'Send'}
          </button>
        </div>
        <div className="console-foot">
          <kbd>Enter</kbd> send · <kbd>Shift</kbd>+<kbd>Enter</kbd> newline · <kbd>Esc</kbd> close
        </div>
      </div>
    </div>
  );
}
