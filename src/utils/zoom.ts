// The camera "zoom" constraint is a real, shipping capability on Chrome/Android
// (and some other Chromium browsers) but isn't part of the standard DOM types.

export interface ZoomRange {
  min: number;
  max: number;
  step: number;
  /** True if this maps to the device's real optical/sensor zoom, not a CSS scale fallback. */
  hardware: boolean;
}

interface ZoomCapabilities extends MediaTrackCapabilities {
  zoom?: { min: number; max: number; step: number };
}

interface ZoomSettings extends MediaTrackSettings {
  zoom?: number;
}

interface ZoomConstraintSet extends MediaTrackConstraintSet {
  zoom?: number;
}

const DIGITAL_ZOOM_RANGE: ZoomRange = { min: 1, max: 4, step: 0.1, hardware: false };

export function readZoomRange(track: MediaStreamTrack): { range: ZoomRange; initial: number } {
  const caps = track.getCapabilities?.() as ZoomCapabilities | undefined;
  if (caps?.zoom) {
    const settings = track.getSettings?.() as ZoomSettings | undefined;
    return {
      range: { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1, hardware: true },
      initial: settings?.zoom ?? caps.zoom.min,
    };
  }
  return { range: DIGITAL_ZOOM_RANGE, initial: 1 };
}

export function applyHardwareZoom(track: MediaStreamTrack, value: number): void {
  track.applyConstraints({ advanced: [{ zoom: value } as ZoomConstraintSet] }).catch(() => {});
}
