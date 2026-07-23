import { useCallback, useRef, useState } from 'react';
import CameraView, { type CameraAnalysis } from './components/CameraView';
import Scoreboard from './components/Scoreboard';
import ControlPanel from './components/ControlPanel';
import EventLog from './components/EventLog';
import { useMatchClock } from './hooks/useMatchClock';
import type { GoalSide, MatchEvent, MatchEventType, Score, TeamCentroid, TeamKey } from './types';
import './App.css';

export default function App() {
  const clock = useMatchClock();
  const [teamNames, setTeamNames] = useState({ A: 'Team A', B: 'Team B' });
  const [score, setScore] = useState<Score>({ A: 0, B: 0 });
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [defendingTeam, setDefendingTeam] = useState<TeamKey>('B');
  const [goalSide, setGoalSide] = useState<GoalSide>('right');
  const [centroids, setCentroids] = useState<TeamCentroid[]>([]);
  const [detectedCount, setDetectedCount] = useState(0);

  const clockRef = useRef(clock);
  clockRef.current = clock;

  const handleAnalysis = useCallback((analysis: CameraAnalysis) => {
    setCentroids(analysis.centroids);
    setDetectedCount(analysis.persons.length);
  }, []);

  const logEvent = useCallback((type: MatchEventType, team?: TeamKey) => {
    const { minute, second } = clockRef.current;
    setEvents((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        team,
        minute,
        second,
        createdAt: Date.now(),
      },
    ]);
    if (type === 'goal' && team) {
      setScore((prev) => ({ ...prev, [team]: prev[team] + 1 }));
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Live VAR Assistant</h1>
        <p className="app-subtitle">
          On-device player detection &amp; offside-line overlay — runs fully in your browser, no
          server.
        </p>
      </header>

      <Scoreboard
        teamNames={teamNames}
        onRenameTeam={(team, name) => setTeamNames((prev) => ({ ...prev, [team]: name }))}
        score={score}
        clock={clock}
      />

      <CameraView
        active
        defendingTeam={defendingTeam}
        goalSide={goalSide}
        onAnalysis={handleAnalysis}
      />
      <p className="detection-status">{detectedCount} player(s) detected</p>

      <ControlPanel
        teamNames={teamNames}
        centroids={centroids}
        defendingTeam={defendingTeam}
        onDefendingTeamChange={setDefendingTeam}
        goalSide={goalSide}
        onGoalSideChange={setGoalSide}
        onEvent={logEvent}
      />

      <section className="control-section">
        <h3>Event timeline</h3>
        <EventLog events={events} teamNames={teamNames} />
      </section>

      <footer className="app-footer">
        <p>
          ⚠️ The offside line is a heuristic based on the last two detected defenders from a
          single, uncalibrated camera. It is a decision-support aid, not an official VAR ruling.
        </p>
      </footer>
    </div>
  );
}
