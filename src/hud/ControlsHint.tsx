import { useStore } from '../store/useStore';

export function ControlsHint() {
  const focused = useStore((s) => s.agentById(s.focusedAgentId));
  const eHint = focused
    ? focused.kind === 'manager'
      ? 'talk to Manager'
      : `bug ${focused.name}`
    : 'interact';
  return (
    <div className="controls-hint">
      <div>
        <kbd>⌘K</kbd> talk to your Manager &nbsp;·&nbsp; <kbd>M</kbd> orchestration board
      </div>
      <div>
        <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd> move &nbsp;·&nbsp; <kbd>mouse</kbd> look &nbsp;·&nbsp; <kbd>E</kbd> {eHint}{' '}
        &nbsp;·&nbsp; <kbd>Esc</kbd> release
      </div>
    </div>
  );
}
