import { useEffect, useRef, useState } from 'react';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { Detection } from '../types';
import { sampleJerseyColor } from '../utils/teamClustering';

export type DetectorStatus = 'loading' | 'ready' | 'error';

interface UseObjectDetectorOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Scratch canvas used to sample pixel colours; not rendered to the page. */
  sampleCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  active: boolean;
  onDetections: (persons: Detection[], ball: Detection | null) => void;
  /** Minimum ms between inference passes; the model itself is the real bottleneck. */
  intervalMs?: number;
}

export function useObjectDetector({
  videoRef,
  sampleCanvasRef,
  active,
  onDetections,
  intervalMs = 150,
}: UseObjectDetectorOptions) {
  const [status, setStatus] = useState<DetectorStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRunRef = useRef(0);
  const runningRef = useRef(false);
  const onDetectionsRef = useRef(onDetections);
  onDetectionsRef.current = onDetections;

  useEffect(() => {
    let cancelled = false;
    cocoSsd
      .load({ base: 'lite_mobilenet_v2' })
      .then((model) => {
        if (cancelled) return;
        modelRef.current = model;
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!active || status !== 'ready') return;

    const loop = async (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (runningRef.current) return;
      if (now - lastRunRef.current < intervalMs) return;
      const video = videoRef.current;
      const model = modelRef.current;
      const sampleCanvas = sampleCanvasRef.current;
      if (!video || !model || !sampleCanvas || video.readyState < 2) return;

      lastRunRef.current = now;
      runningRef.current = true;
      try {
        const predictions = await model.detect(video);

        sampleCanvas.width = video.videoWidth;
        sampleCanvas.height = video.videoHeight;
        const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
        if (ctx) ctx.drawImage(video, 0, 0);

        const persons: Detection[] = [];
        let ball: Detection | null = null;

        predictions.forEach((pred, idx) => {
          const bbox = pred.bbox as [number, number, number, number];
          if (pred.class === 'person' && pred.score >= 0.5) {
            const color = ctx ? (sampleJerseyColor(ctx, bbox) ?? undefined) : undefined;
            persons.push({ id: `p${idx}`, class: pred.class, score: pred.score, bbox, color });
          } else if (pred.class === 'sports ball' && pred.score >= 0.35) {
            if (!ball || pred.score > ball.score) {
              ball = { id: 'ball', class: pred.class, score: pred.score, bbox };
            }
          }
        });

        onDetectionsRef.current(persons, ball);
      } finally {
        runningRef.current = false;
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, status, intervalMs, videoRef, sampleCanvasRef]);

  return { status, error };
}
