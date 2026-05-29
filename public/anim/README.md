# Animations

Mixamo clips (idle, typing, talking) retargeted to `models/agent.glb`, exported
as glTF. Map `AgentStatus` -> clip name in `lib/statusVisuals.ts` and play via
drei's `useAnimations` inside `scene/Agent.tsx`.
