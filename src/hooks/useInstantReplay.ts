import { useEffect, useRef } from 'react';
import type { ReviewClip } from '../types';

const WINDOW_SECONDS = 30;
const CHUNK_MS = 1000;
const MAX_CHUNKS = Math.ceil((WINDOW_SECONDS * 1000) / CHUNK_MS) + 2;

interface ChunkRecord {
  blob: Blob;
  /** Date.now() when this chunk's data became available (≈ its end time). */
  timestamp: number;
}

const CANDIDATE_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];

/**
 * Continuously records a rolling ~30s buffer from a MediaStream so a "VAR
 * review" can instantly play back what just happened, with no pre-recording
 * step required by the user.
 */
export function useInstantReplay(stream: MediaStream | null) {
  const chunksRef = useRef<ChunkRecord[]>([]);
  const mimeTypeRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!stream || typeof MediaRecorder === 'undefined') return;

    const mimeType = CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) return;
    mimeTypeRef.current = mimeType;

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_000_000 });
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push({ blob: event.data, timestamp: Date.now() });
        if (chunksRef.current.length > MAX_CHUNKS) {
          chunksRef.current.splice(0, chunksRef.current.length - MAX_CHUNKS);
        }
      }
    };
    recorder.start(CHUNK_MS);
    recorderRef.current = recorder;

    return () => {
      recorder.ondataavailable = null;
      if (recorder.state !== 'inactive') recorder.stop();
      recorderRef.current = null;
      chunksRef.current = [];
    };
  }, [stream]);

  function getClip(): ReviewClip | null {
    const mimeType = mimeTypeRef.current;
    const chunks = chunksRef.current;
    if (!mimeType || chunks.length === 0) return null;

    const cutoff = Date.now() - WINDOW_SECONDS * 1000;
    const recent = chunks.filter((c) => c.timestamp >= cutoff);
    const use = recent.length > 0 ? recent : chunks.slice(-1);
    const blob = new Blob(
      use.map((c) => c.blob),
      { type: mimeType },
    );
    return {
      url: URL.createObjectURL(blob),
      blob,
      startedAt: use[0].timestamp - CHUNK_MS,
      endedAt: use[use.length - 1].timestamp,
    };
  }

  return { getClip };
}
