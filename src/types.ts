export type TeamKey = 'A' | 'B';

export type GoalSide = 'left' | 'right';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Detection {
  id: string;
  class: string;
  score: number;
  /** [x, y, width, height] in video pixel space */
  bbox: [number, number, number, number];
  color?: RGB;
  team?: TeamKey;
}

export type MatchEventType =
  | 'kickoff'
  | 'goal'
  | 'card-yellow'
  | 'card-red'
  | 'foul'
  | 'potential-foul'
  | 'offside-flag'
  | 'var-review'
  | 'half-time'
  | 'full-time';

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  minute: number;
  second: number;
  team?: TeamKey;
  note?: string;
  createdAt: number;
}

export interface Score {
  A: number;
  B: number;
}

export interface TeamCentroid {
  team: TeamKey;
  color: RGB;
}

export interface ReviewClip {
  url: string;
  blob: Blob;
  /** Date.now() ms marking the start/end of the buffered window this clip covers. */
  startedAt: number;
  endedAt: number;
}
