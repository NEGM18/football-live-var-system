import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Detection, GoalSide, ReviewClip, TeamCentroid, TeamKey } from '../types';
import { useObjectDetector } from '../hooks/useObjectDetector';
import { useInstantReplay } from '../hooks/useInstantReplay';
import { assignTeams, rgbToCss } from '../utils/teamClustering';
import { computeOffsideLine, type OffsideResult } from '../utils/offside';

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

  return (
    <div className="camera-view" ref={wrapperRef}>
      <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
      <canvas ref={overlayRef} className="camera-overlay" />
      <canvas ref={sampleCanvasRef} className="camera-sample-canvas" aria-hidden />
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
