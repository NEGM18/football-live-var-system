import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Detection, GoalSide, ReviewClip, TeamCentroid, TeamKey } from '../types';
import { useObjectDetector } from '../hooks/useObjectDetector';
import { useInstantReplay } from '../hooks/useInstantReplay';
import { assignTeams, rgbToCss } from '../utils/teamClustering';
import { computeOffsideLine, type OffsideResult } from '../utils/offside';
import { exitFullscreen, isFullscreenActive, requestFullscreen } from '../utils/fullscreen';
import { applyHardwareZoom, readZoomRange, type ZoomRange } from '../utils/zoom';

export interface CameraAnalysis {
  persons: Detection[];
  ball: Detection | null;
  centroids: TeamCentroid[];
  offside: OffsideResult | null;
}

export interface CameraViewHandle {
  /** Snapshot of the last ~30s of camera footage for a VAR-style review. */
  getReviewClip: () => ReviewClip | null;
}

interface CameraViewProps {
  active: boolean;
  defendingTeam: TeamKey;
  goalSide: GoalSide;
  onAnalysis: (analysis: CameraAnalysis) => void;
}

const DEFAULT_ZOOM_RANGE: ZoomRange = { min: 1, max: 4, step: 0.1, hardware: false };

function touchDistance(touches: React.TouchList): number {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

const CameraView = forwardRef<CameraViewHandle, CameraViewProps>(function CameraView(
  { active, defendingTeam, goalSide, onAnalysis },
  ref,
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  const centroidsRef = useRef<TeamCentroid[]>([]);
  const defendingTeamRef = useRef(defendingTeam);
  const goalSideRef = useRef(goalSide);
  defendingTeamRef.current = defendingTeam;
  goalSideRef.current = goalSide;

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [zoomRange, setZoomRange] = useState<ZoomRange>(DEFAULT_ZOOM_RANGE);
  const zoomRangeRef = useRef(zoomRange);
  zoomRangeRef.current = zoomRange;
  const [zoom, setZoom] = useState(1);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        activeStream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        const track = s.getVideoTracks()[0];
        trackRef.current = track ?? null;
        if (track) {
          const { range, initial } = readZoomRange(track);
          setZoomRange(range);
          setZoom(initial);
        }
        setStream(s);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCameraError(err instanceof Error ? err.message : 'Camera access was denied.');
      });

    return () => {
      cancelled = true;
      activeStream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Fullscreen for the live camera view (separate from the VAR review modal).
  useEffect(() => {
    const video = videoRef.current;
    const syncState = () => setFullscreen(isFullscreenActive(video));
    document.addEventListener('fullscreenchange', syncState);
    document.addEventListener('webkitfullscreenchange', syncState);
    video?.addEventListener('webkitendfullscreen', syncState);
    return () => {
      document.removeEventListener('fullscreenchange', syncState);
      document.removeEventListener('webkitfullscreenchange', syncState);
      video?.removeEventListener('webkitendfullscreen', syncState);
      if (isFullscreenActive(video)) exitFullscreen(video);
    };
  }, []);

  function toggleFullscreen() {
    if (isFullscreenActive(videoRef.current)) {
      exitFullscreen(videoRef.current);
    } else {
      requestFullscreen(wrapperRef.current, videoRef.current);
    }
  }

  function applyZoom(value: number) {
    const range = zoomRangeRef.current;
    const clamped = Math.min(range.max, Math.max(range.min, value));
    setZoom(clamped);
    if (range.hardware && trackRef.current) {
      applyHardwareZoom(trackRef.current, clamped);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchRef.current = { startDist: touchDistance(e.touches), startZoom: zoom };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const ratio = touchDistance(e.touches) / pinchRef.current.startDist;
      applyZoom(pinchRef.current.startZoom * ratio);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
  }

  const { getClip } = useInstantReplay(stream);

  useImperativeHandle(ref, () => ({ getReviewClip: getClip }), [getClip]);

  const { status: detectorStatus, error: detectorError } = useObjectDetector({
    videoRef,
    sampleCanvasRef,
    active: active && !cameraError,
    onDetections: (persons, ball) => {
      assignTeams(persons, centroidsRef);
      const offside = computeOffsideLine(persons, defendingTeamRef.current, goalSideRef.current);
      draw(persons, ball, offside);
      onAnalysis({ persons, ball, centroids: centroidsRef.current, offside });
    },
  });

  function draw(persons: Detection[], ball: Detection | null, offside: OffsideResult | null) {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !video || !wrapper || video.videoWidth === 0) return;

    const boxW = wrapper.clientWidth;
    const boxH = wrapper.clientHeight;
    canvas.width = boxW;
    canvas.height = boxH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // object-fit: contain mapping from native video pixels -> displayed box
    const scale = Math.min(boxW / video.videoWidth, boxH / video.videoHeight);
    const offsetX = (boxW - video.videoWidth * scale) / 2;
    const offsetY = (boxH - video.videoHeight * scale) / 2;
    const toBox = (x: number, y: number): [number, number] => [
      offsetX + x * scale,
      offsetY + y * scale,
    ];

    ctx.clearRect(0, 0, boxW, boxH);

    for (const person of persons) {
      const [x, y, w, h] = person.bbox;
      const [bx, by] = toBox(x, y);
      const bw = w * scale;
      const bh = h * scale;
      const color = person.team
        ? rgbToCss(
            person.team === 'A'
              ? { r: 255, g: 209, b: 0 }
              : { r: 0, g: 178, b: 255 },
          )
        : 'rgba(255,255,255,0.6)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);
      if (person.team) {
        ctx.fillStyle = color;
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(`Team ${person.team}`, bx, by - 4);
      }
    }

    if (ball) {
      const [x, y, w, h] = ball.bbox;
      const [bx, by] = toBox(x + w / 2, y + h / 2);
      ctx.strokeStyle = '#ff3b30';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(6, (w * scale) / 2), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (offside) {
      const [lx] = toBox(offside.lineX, 0);
      ctx.strokeStyle = '#ff9500';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, boxH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff9500';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('OFFSIDE LINE (approx.)', Math.min(Math.max(lx - 70, 4), boxW - 150), 16);
    }
  }

  const digitalZoomStyle = !zoomRange.hardware ? { transform: `scale(${zoom})` } : undefined;
  const cameraReady = !cameraError && !!stream;

  return (
    <div
      className="camera-view"
      ref={wrapperRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-video"
        style={digitalZoomStyle}
      />
      <canvas ref={overlayRef} className="camera-overlay" style={digitalZoomStyle} />
      <canvas ref={sampleCanvasRef} className="camera-sample-canvas" aria-hidden />

      {cameraReady && (
        <button
          className="camera-fullscreen-btn"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {fullscreen ? '⤢' : '⛶'}
        </button>
      )}

      {cameraReady && (
        <div className="camera-zoom-controls">
          <span className="camera-zoom-label">{zoom.toFixed(1)}x</span>
          <input
            type="range"
            min={zoomRange.min}
            max={zoomRange.max}
            step={zoomRange.step}
            value={zoom}
            onChange={(e) => applyZoom(Number(e.target.value))}
            aria-label="Camera zoom"
          />
          {!zoomRange.hardware && <span className="camera-zoom-hint">digital</span>}
        </div>
      )}

      {cameraError && (
        <div className="camera-message camera-message--error">
          Camera unavailable: {cameraError}. Allow camera access and reload.
        </div>
      )}
      {!cameraError && detectorStatus === 'loading' && (
        <div className="camera-message">Loading on-device detection model…</div>
      )}
      {!cameraError && detectorStatus === 'error' && (
        <div className="camera-message camera-message--error">
          Detector failed to load: {detectorError}
        </div>
      )}
    </div>
  );
});

export default CameraView;
