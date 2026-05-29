import { Agent } from './Agent';
import { deskSlot } from './layout';
import { useStore } from '../store/useStore';

/** Renders one workstation per agent, placed at its assigned desk slot. */
export function DeskCluster() {
  const agents = useStore((s) => s.agents);
  return (
    <>
      {agents.map((a) => {
        const slot = deskSlot(a.deskId);
        if (!slot) return null;
        return <Agent key={a.id} data={a} slot={slot} />;
      })}
    </>
  );
}
