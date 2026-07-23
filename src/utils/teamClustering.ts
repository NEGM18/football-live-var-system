import type { Detection, RGB, TeamCentroid, TeamKey } from '../types';

/** Average the RGB pixels in the torso region of a bounding box, skipping the pitch-green fringe. */
export function sampleJerseyColor(
  ctx: CanvasRenderingContext2D,
  bbox: [number, number, number, number],
): RGB | null {
  const [x, y, w, h] = bbox;
  const sx = Math.round(x + w * 0.3);
  const sy = Math.round(y + h * 0.15);
  const sw = Math.max(1, Math.round(w * 0.4));
  const sh = Math.max(1, Math.round(h * 0.3));

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(sx, sy, sw, sh).data;
  } catch {
    return null;
  }

  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const px = data[i];
    const py = data[i + 1];
    const pz = data[i + 2];
    // Skip pixels dominated by pitch green.
    if (py > px * 1.15 && py > pz * 1.15) continue;
    r += px;
    g += py;
    b += pz;
    n += 1;
  }
  if (n === 0) return null;
  return { r: r / n, g: g / n, b: b / n };
}

function colorDistance(a: RGB, b: RGB): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

const EMA_ALPHA = 0.25;

/**
 * Assigns each person detection to one of two running colour centroids, updating the
 * centroids as an exponential moving average so team labels stay stable across frames.
 */
export function assignTeams(
  persons: Detection[],
  centroidsRef: { current: TeamCentroid[] },
): void {
  const withColor = persons.filter((p): p is Detection & { color: RGB } => !!p.color);
  if (withColor.length === 0) return;

  if (centroidsRef.current.length < 2) {
    // Bootstrap the two centroids from the two most different colours seen so far.
    const pool = [...withColor];
    if (pool.length < 2) return;
    let best: [number, number] = [0, 1];
    let bestDist = -1;
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const d = colorDistance(pool[i].color, pool[j].color);
        if (d > bestDist) {
          bestDist = d;
          best = [i, j];
        }
      }
    }
    centroidsRef.current = [
      { team: 'A', color: pool[best[0]].color },
      { team: 'B', color: pool[best[1]].color },
    ];
  }

  const centroids = centroidsRef.current;
  for (const person of withColor) {
    let nearest: TeamCentroid = centroids[0];
    let nearestDist = colorDistance(person.color, centroids[0].color);
    for (const c of centroids.slice(1)) {
      const d = colorDistance(person.color, c.color);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = c;
      }
    }
    person.team = nearest.team;
    nearest.color = {
      r: nearest.color.r + (person.color.r - nearest.color.r) * EMA_ALPHA,
      g: nearest.color.g + (person.color.g - nearest.color.g) * EMA_ALPHA,
      b: nearest.color.b + (person.color.b - nearest.color.b) * EMA_ALPHA,
    };
  }
}

export function rgbToCss(color: RGB): string {
  return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
}

export function centroidFor(centroids: TeamCentroid[], team: TeamKey): RGB | undefined {
  return centroids.find((c) => c.team === team)?.color;
}
