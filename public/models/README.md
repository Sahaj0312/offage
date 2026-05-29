# Models

Drop glTF/GLB assets here when ready to replace the primitive placeholders.

- `office.glb` — environment (Kenney Furniture Kit, CC0)
- `agent.glb` — a single rigged low-poly character (Quaternius, CC0)

The scene runs entirely on primitives until these exist; load them in
`scene/Agent.tsx` / `scene/Office.tsx` via drei's `useGLTF` behind the same
component API, with no other changes required.
