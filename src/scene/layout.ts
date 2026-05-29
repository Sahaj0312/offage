/** Static floor plan: desk slots and room bounds. Shared by the scene and collision. */

export interface DeskSlot {
  id: string;
  /** world position of the desk group [x, y, z] */
  position: [number, number, number];
  /** y-rotation in radians (group faces -z at rotation 0) */
  rotation: number;
}

// Room is centered at origin, ~28 x 28 units, walls at +/- HALF.
export const ROOM_HALF = 14;
export const WALL_HEIGHT = 4;
export const EYE_HEIGHT = 1.65;

// Six desks in a 2 x 3 grid, all facing -z (toward the back wall).
export const DESK_SLOTS: DeskSlot[] = [
  { id: 'd1', position: [-7, 0, -8], rotation: 0 },
  { id: 'd2', position: [7, 0, -8], rotation: 0 },
  { id: 'd3', position: [-7, 0, 1], rotation: 0 },
  { id: 'd4', position: [7, 0, 1], rotation: 0 },
  { id: 'd5', position: [-7, 0, 10], rotation: 0 },
  { id: 'd6', position: [7, 0, 10], rotation: 0 },
];

export function deskSlot(id: string): DeskSlot | undefined {
  return DESK_SLOTS.find((d) => d.id === id);
}

/** Player spawn: near the entrance, looking into the room (-z). */
export const PLAYER_SPAWN: [number, number, number] = [0, EYE_HEIGHT, 12.5];
