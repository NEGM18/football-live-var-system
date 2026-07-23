import { useEffect, useRef } from 'react';
import type { MatchEvent, ReviewClip, TeamKey } from '../types';

interface ReviewModalProps {
  clip: ReviewClip;
  events: MatchEvent[];
  teamNames: { A: string; B: string };
  onClose: () => void;
}

const ICONS: Partial<Record<MatchEvent['type'], string>> = {
  goal: '⚽',
  'card-yellow': '🟨',
  'card-red': '🟥',
  foul: '⚠️',
  'potential-foul': '🔎',
  'offside-flag': '🚩',
  'var-review': '📺',
};

export default function ReviewModal({ clip, events, teamNames, onClose }: ReviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationMs = Math.max(1000, clip.endedAt - clip.startedAt);

  useEffect(() => {
    // Chrome-recorded webm blobs often report duration=Infinity until you seek
    // once, which breaks native scrubbing. This forces the browser to compute it.
    const video = videoRef.current;
    if (!video) return;
    const fix = () => {
      if (video.duration === Infinity || Number.isNaN(video.duration)) {
        video.currentTime = 1e9;
        const reset = () => {
          video.currentTime = 0;
          video.removeEventListener('timeupdate', reset);
        };
        video.addEventListener('timeupdate', reset);
      }
    };
    video.addEventListener('loadedmetadata', fix);
    return () => video.removeEventListener('loadedmetadata', fix);
  }, [clip.url]);

  useEffect(() => {
    return () => URL.revokeObjectURL(clip.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markers = events
    .filter((e) => e.createdAt >= clip.startedAt && e.createdAt <= clip.endedAt)
    .map((e) => ({
      event: e,
      positionPct: ((e.createdAt - clip.startedAt) / durationMs) * 100,
    }));

  function seekTo(positionPct: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = (positionPct / 100) * (durationMs / 1000);
    video.play().catch(() => {});
  }

  return (
    <div className="review-modal-backdrop" role="dialog" aria-modal="true">
      <div className="review-modal">
        <div className="review-modal-header">
          <h3>📺 VAR Review — last {Math.round(durationMs / 1000)}s</h3>
          <button className="review-modal-close" onClick={onClose} aria-label="Close review">
            ✕
          </button>
        </div>

        <video
          ref={videoRef}
          src={clip.url}
          className="review-video"
          controls
          autoPlay
          playsInline
        />

        <div className="review-timeline">
          <div className="review-timeline-track">
            {markers.map(({ event, positionPct }) => (
              <button
                key={event.id}
                className={`review-marker review-marker--${event.type}`}
                style={{ left: `${Math.min(98, Math.max(0, positionPct))}%` }}
                onClick={() => seekTo(positionPct)}
                title={`${event.type}${event.team ? ` — ${teamNames[event.team as TeamKey]}` : ''}`}
              >
                {ICONS[event.type] ?? '•'}
              </button>
            ))}
          </div>
          <div className="review-timeline-labels">
            <span>-{Math.round(durationMs / 1000)}s</span>
            <span>now</span>
          </div>
        </div>

        {markers.length === 0 && (
          <p className="review-empty-hint">No logged events fall inside this clip window.</p>
        )}
      </div>
    </div>
  );
}
