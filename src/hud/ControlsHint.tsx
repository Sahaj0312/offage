import { useStore } from '../store/useStore';

export function ControlsHint() {
  const focused = useStore((s) => s.agentById(s.focusedAgentId));
  return (
    <div className="controls-hint">
      <div>
        <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd> move &nbsp;·&nbsp; <kbd>mouse</kbd> look
      </div>
      <div>
        <kbd>E</kbd> {focused ? `inspect ${focused.name}` : 'inspect agent'} &nbsp;·&nbsp;{' '}
        <kbd>M</kbd> orchestration &nbsp;·&nbsp; <kbd>Esc</kbd> release cursor
      </div>
    </div>
  );
}
