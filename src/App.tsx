import { useCallback, useRef, useState } from 'react';
import CameraView, { type CameraAnalysis, type CameraViewHandle } from './components/CameraView';
import Scoreboard from './components/Scoreboard';
import ControlPanel from './components/ControlPanel';
import EventLog from './components/EventLog';
import ReviewModal from './components/ReviewModal';
import { useMatchClock } from './hooks/useMatchClock';
import type {
  GoalSide,
  MatchEvent,
  MatchEventType,
  ReviewClip,
  Score,
  TeamCentroid,
  TeamKey,
} from './types';
import './App.css';

const REVIEW_TRIGGER_TYPES: MatchEventType[] = ['potential-foul', 'var-review'];

export default function App() {
  const clock = useMatchClock();
  const [teamNames, setTeamNames] = useState({ A: 'Team A', B: 'Team B' });
  const [score, setScore] = useState<Score>({ A: 0, B: 0 });
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [defendingTeam, setDefendingTeam] = useState<TeamKey>('B');
  const [goalSide, setGoalSide] = useState<GoalSide>('right');
  const [centroids, setCentroids] = useState<TeamCentroid[]>([]);
  const [detectedCount, setDetectedCount] = useState(0);
  const [reviewClip, setReviewClip] = useState<ReviewClip | null>(null);
  const [reviewUnavailable, setReviewUnavailable] = useState(false);

  const clockRef = useRef(clock);
  clockRef.current = clock;
  const cameraRef = useRef<CameraViewHandle>(null);

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
    if (REVIEW_TRIGGER_TYPES.includes(type)) {
      const clip = cameraRef.current?.getReviewClip() ?? null;
      if (clip) {
        setReviewClip(clip);
        setReviewUnavailable(false);
      } else {
        setReviewUnavailable(true);
      }
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
        ref={cameraRef}
        active
        defendingTeam={defendingTeam}
        goalSide={goalSide}
        onAnalysis={handleAnalysis}
      />
      <p className="detection-status">{detectedCount} player(s) detected</p>
      {reviewUnavailable && (
        <p className="detection-status detection-status--warn">
          Instant replay isn't available yet — wait a moment after the camera starts, or your
          browser may not support in-browser clip recording.
        </p>
      )}

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

      {reviewClip && (
        <ReviewModal
          clip={reviewClip}
          events={events}
          teamNames={teamNames}
          onClose={() => {
            setReviewClip(null);
          }}
        />
      )}
    </div>
  );
}
