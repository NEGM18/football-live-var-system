import type { MatchEvent, MatchEventType } from '../types';

interface EventLogProps {
  events: MatchEvent[];
  teamNames: { A: string; B: string };
}

const LABELS: Record<MatchEventType, string> = {
  kickoff: 'Kickoff',
  goal: 'Goal',
  'card-yellow': 'Yellow card',
  'card-red': 'Red card',
  foul: 'Foul',
  'potential-foul': 'Potential foul (reviewed)',
  'offside-flag': 'Offside flag',
  'var-review': 'VAR review',
  'half-time': 'Half-time',
  'full-time': 'Full-time',
};

const ICONS: Record<MatchEventType, string> = {
  kickoff: '🏁',
  goal: '⚽',
  'card-yellow': '🟨',
  'card-red': '🟥',
  foul: '⚠️',
  'potential-foul': '🔎',
  'offside-flag': '🚩',
  'var-review': '📺',
  'half-time': '⏸️',
  'full-time': '⏹️',
};

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export default function EventLog({ events, teamNames }: EventLogProps) {
  if (events.length === 0) {
    return <p className="event-log-empty">No events logged yet.</p>;
  }

  return (
    <ul className="event-log">
      {[...events].reverse().map((event) => (
        <li key={event.id} className={`event-log-item event-log-item--${event.type}`}>
          <span className="event-log-time">
            {pad(event.minute)}:{pad(event.second)}
          </span>
          <span className="event-log-icon">{ICONS[event.type]}</span>
          <span className="event-log-label">
            {LABELS[event.type]}
            {event.team ? ` — ${teamNames[event.team]}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}
