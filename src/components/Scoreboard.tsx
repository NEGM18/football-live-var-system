import type { MatchClock } from '../hooks/useMatchClock';
import type { Score } from '../types';

interface ScoreboardProps {
  teamNames: { A: string; B: string };
  onRenameTeam: (team: 'A' | 'B', name: string) => void;
  score: Score;
  clock: MatchClock;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export default function Scoreboard({ teamNames, onRenameTeam, score, clock }: ScoreboardProps) {
  return (
    <div className="scoreboard">
      <div className="scoreboard-team">
        <input
          className="team-name-input team-name-input--a"
          value={teamNames.A}
          onChange={(e) => onRenameTeam('A', e.target.value)}
          maxLength={16}
        />
        <span className="score">{score.A}</span>
      </div>

      <div className="scoreboard-clock">
        <span className="clock-time">
          {pad(clock.minute)}:{pad(clock.second)}
        </span>
        <div className="clock-controls">
          {clock.running ? (
            <button onClick={clock.pause}>Pause</button>
          ) : (
            <button onClick={clock.start}>Start</button>
          )}
          <button onClick={clock.reset}>Reset</button>
        </div>
      </div>

      <div className="scoreboard-team">
        <span className="score">{score.B}</span>
        <input
          className="team-name-input team-name-input--b"
          value={teamNames.B}
          onChange={(e) => onRenameTeam('B', e.target.value)}
          maxLength={16}
        />
      </div>
    </div>
  );
}
