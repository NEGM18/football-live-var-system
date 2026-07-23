import type { GoalSide, MatchEventType, TeamCentroid, TeamKey } from '../types';
import { rgbToCss } from '../utils/teamClustering';

interface ControlPanelProps {
  teamNames: { A: string; B: string };
  centroids: TeamCentroid[];
  defendingTeam: TeamKey;
  onDefendingTeamChange: (team: TeamKey) => void;
  goalSide: GoalSide;
  onGoalSideChange: (side: GoalSide) => void;
  onEvent: (type: MatchEventType, team?: TeamKey) => void;
}

export default function ControlPanel({
  teamNames,
  centroids,
  defendingTeam,
  onDefendingTeamChange,
  goalSide,
  onGoalSideChange,
  onEvent,
}: ControlPanelProps) {
  const swatch = (team: TeamKey) => {
    const c = centroids.find((x) => x.team === team)?.color;
    return c ? rgbToCss(c) : '#555';
  };

  return (
    <div className="control-panel">
      <section className="control-section">
        <h3>Offside line calibration</h3>
        <p className="control-hint">
          Tap which detected kit colour is the defending team, and which side of the frame their
          goal is on. The line is an approximation from a single camera — not a broadcast-accurate
          decision.
        </p>
        <div className="team-toggle">
          {(['A', 'B'] as TeamKey[]).map((team) => (
            <button
              key={team}
              className={`team-swatch-btn ${defendingTeam === team ? 'active' : ''}`}
              style={{ borderColor: swatch(team) }}
              onClick={() => onDefendingTeamChange(team)}
            >
              <span className="swatch" style={{ background: swatch(team) }} />
              Defending: {teamNames[team]}
            </button>
          ))}
        </div>
        <div className="goal-side-toggle">
          <button
            className={goalSide === 'left' ? 'active' : ''}
            onClick={() => onGoalSideChange('left')}
          >
            Goal is on Left
          </button>
          <button
            className={goalSide === 'right' ? 'active' : ''}
            onClick={() => onGoalSideChange('right')}
          >
            Goal is on Right
          </button>
        </div>
      </section>

      <section className="control-section">
        <h3>Match events</h3>
        <div className="event-grid">
          <button className="event-btn goal" onClick={() => onEvent('goal', 'A')}>
            ⚽ Goal {teamNames.A}
          </button>
          <button className="event-btn goal" onClick={() => onEvent('goal', 'B')}>
            ⚽ Goal {teamNames.B}
          </button>

          <button className="event-btn yellow" onClick={() => onEvent('card-yellow', 'A')}>
            🟨 {teamNames.A}
          </button>
          <button className="event-btn yellow" onClick={() => onEvent('card-yellow', 'B')}>
            🟨 {teamNames.B}
          </button>

          <button className="event-btn red" onClick={() => onEvent('card-red', 'A')}>
            🟥 {teamNames.A}
          </button>
          <button className="event-btn red" onClick={() => onEvent('card-red', 'B')}>
            🟥 {teamNames.B}
          </button>

          <button className="event-btn foul" onClick={() => onEvent('foul', 'A')}>
            Foul {teamNames.A}
          </button>
          <button className="event-btn foul" onClick={() => onEvent('foul', 'B')}>
            Foul {teamNames.B}
          </button>

          <button className="event-btn offside" onClick={() => onEvent('offside-flag', 'A')}>
            🚩 Offside {teamNames.A}
          </button>
          <button className="event-btn offside" onClick={() => onEvent('offside-flag', 'B')}>
            🚩 Offside {teamNames.B}
          </button>

          <button className="event-btn var" onClick={() => onEvent('var-review')}>
            📺 VAR Review
          </button>
          <button className="event-btn" onClick={() => onEvent('kickoff')}>
            Kickoff
          </button>
          <button className="event-btn" onClick={() => onEvent('half-time')}>
            Half-time
          </button>
          <button className="event-btn" onClick={() => onEvent('full-time')}>
            Full-time
          </button>
        </div>
      </section>
    </div>
  );
}
