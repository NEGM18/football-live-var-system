import { useCallback, useEffect, useRef, useState } from 'react';

export interface MatchClock {
  running: boolean;
  minute: number;
  second: number;
  totalSeconds: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export function useMatchClock(): MatchClock {
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const tick = useCallback((now: number) => {
    const deltaMs = now - lastTickRef.current;
    if (deltaMs >= 1000) {
      const wholeSeconds = Math.floor(deltaMs / 1000);
      lastTickRef.current += wholeSeconds * 1000;
      setTotalSeconds((s) => s + wholeSeconds);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!running) return;
    lastTickRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [running, tick]);

  return {
    running,
    minute: Math.floor(totalSeconds / 60),
    second: totalSeconds % 60,
    totalSeconds,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: () => {
      setRunning(false);
      setTotalSeconds(0);
    },
  };
}
