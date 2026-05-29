import { DESK_SLOTS, ROOM_HALF } from '../scene/layout';

/** Axis-aligned box in the XZ plane. */
export interface Box2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Build static obstacle boxes: desk footprints (incl. chair area). */
export function buildObstacles(): Box2D[] {
  return DESK_SLOTS.map((d) => {
    const [x, , z] = d.position;
    // desk is ~3 wide (x) and the workstation incl. chair spans ~3 deep (z)
    return { minX: x - 1.7, maxX: x + 1.7, minZ: z - 1.4, maxZ: z + 1.8 };
  });
}

/**
 * Resolve a desired XZ position against the room walls and obstacle boxes,
 * treating the player as a circle of `radius`. Returns a clamped [x, z].
 */
export function resolvePosition(
  x: number,
  z: number,
  radius: number,
  obstacles: Box2D[],
): [number, number] {
  const limit = ROOM_HALF - radius - 0.1;
  let nx = Math.max(-limit, Math.min(limit, x));
  let nz = Math.max(-limit, Math.min(limit, z));

  for (const b of obstacles) {
    const exMinX = b.minX - radius;
    const exMaxX = b.maxX + radius;
    const exMinZ = b.minZ - radius;
    const exMaxZ = b.maxZ + radius;
    if (nx > exMinX && nx < exMaxX && nz > exMinZ && nz < exMaxZ) {
      // inside expanded box -> push out along the shallowest axis
      const dLeft = nx - exMinX;
      const dRight = exMaxX - nx;
      const dBack = nz - exMinZ;
      const dFront = exMaxZ - nz;
      const m = Math.min(dLeft, dRight, dBack, dFront);
      if (m === dLeft) nx = exMinX;
      else if (m === dRight) nx = exMaxX;
      else if (m === dBack) nz = exMinZ;
      else nz = exMaxZ;
    }
  }
  return [nx, nz];
}
