// Safari (desktop + iOS) only exposes the vendor-prefixed webkit* names, and iOS
// Safari doesn't support Fullscreen for arbitrary elements at all — only a
// <video>'s own native fullscreen via webkitEnterFullscreen. These types cover
// both paths without `any`.

interface WebkitFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => void;
}

interface WebkitFullscreenVideo extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
}

interface WebkitFullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
}

export function requestFullscreen(container: HTMLElement | null, video: HTMLVideoElement | null): void {
  const el = container as WebkitFullscreenElement | null;
  if (el?.requestFullscreen) {
    el.requestFullscreen().catch(() => enterVideoFullscreen(video));
    return;
  }
  if (el?.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
    return;
  }
  enterVideoFullscreen(video);
}

function enterVideoFullscreen(video: HTMLVideoElement | null): void {
  (video as WebkitFullscreenVideo | null)?.webkitEnterFullscreen?.();
}

export function exitFullscreen(video: HTMLVideoElement | null): void {
  const doc = document as WebkitFullscreenDocument;
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else if (doc.webkitFullscreenElement) {
    doc.webkitExitFullscreen?.();
  }
  (video as WebkitFullscreenVideo | null)?.webkitExitFullscreen?.();
}

export function isFullscreenActive(video: HTMLVideoElement | null): boolean {
  const doc = document as WebkitFullscreenDocument;
  return (
    !!document.fullscreenElement ||
    !!doc.webkitFullscreenElement ||
    !!(video as WebkitFullscreenVideo | null)?.webkitDisplayingFullscreen
  );
}
