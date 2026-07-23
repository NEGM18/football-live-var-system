import type { Detection, GoalSide, TeamKey } from '../types';

export interface OffsideResult {
  /** x coordinate in video pixel space of the last-outfield-defender line */
  lineX: number;
  defenderCount: number;
}

/**
 * Approximates the "second-last defender" offside line for a single, roughly
 * side-on, uncalibrated camera. This is a heuristic for a live overlay aid,
 * not a broadcast-accurate offside decision — it has no pitch homography or
 * lens calibration behind it.
 */
export function computeOffsideLine(
  persons: Detection[],
  defendingTeam: TeamKey,
  goalSide: GoalSide,
): OffsideResult | null {
  const defenders = persons.filter((p) => p.team === defendingTeam);
  if (defenders.length < 2) return null;

  const xOf = (d: Detection) => d.bbox[0] + d.bbox[2] / 2;

  // Sort by distance from the defending goal, nearest first.
  const sorted = [...defenders].sort((a, b) =>
    goalSide === 'left' ? xOf(a) - xOf(b) : xOf(b) - xOf(a),
  );

  // Index 0 is assumed to be the goalkeeper (closest to goal); index 1 is the
  // last outfield defender, which sets the offside line.
  const lastOutfieldDefender = sorted[1];
  return {
    lineX: xOf(lastOutfieldDefender),
    defenderCount: defenders.length,
  };
}
