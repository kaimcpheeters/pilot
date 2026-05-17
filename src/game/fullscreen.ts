/**
 * Pure Fullscreen API wrapper -- no orientation logic, no React state.
 *
 * Called from a user-gesture handler (the cover screen's fullscreen icon, or
 * the Start / Training buttons on mobile). Anything unsupported silently
 * no-ops: desktop browsers without `requestFullscreen`, iOS Safari before
 * 16.4, and embeddings where the API is disabled all fall through cleanly.
 *
 * Landscape orientation handling lives in `landscape.ts`. Callers compose
 * the two when they want both, so e.g. a "go fullscreen" icon click doesn't
 * also try to grab the orientation lock.
 */

import { useEffect, useState } from "react";

/** Coarse-pointer / narrow-viewport devices we want to expose fullscreen on. */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return coarse || window.innerWidth < 900;
}

interface FullscreenableElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface FullscreenableDocument extends Document {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

function getDoc(): FullscreenableDocument | null {
  return typeof document === "undefined"
    ? null
    : (document as FullscreenableDocument);
}

/**
 * True when the current document is allowed to enter fullscreen. iOS Safari
 * on iPhone returns false here even when the prefixed API exists, which is
 * exactly what we want -- callers can use this to hide the fullscreen button
 * on platforms where pressing it would no-op.
 */
export function isFullscreenSupported(): boolean {
  const doc = getDoc();
  if (!doc) return false;
  if (doc.fullscreenEnabled) return true;
  if (doc.webkitFullscreenEnabled) return true;
  const root = doc.documentElement as FullscreenableElement;
  return typeof root.webkitRequestFullscreen === "function";
}

function getFullscreenElement(): Element | null {
  const doc = getDoc();
  if (!doc) return null;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/**
 * Enter document-level fullscreen. Resolves to whether we ended up in
 * fullscreen (true when we entered or were already in it, false on
 * unsupported / refused).
 */
export async function enterFullscreen(): Promise<boolean> {
  const doc = getDoc();
  if (!doc) return false;
  if (getFullscreenElement()) return true;
  const root = doc.documentElement as FullscreenableElement;
  try {
    if (root.requestFullscreen) {
      await root.requestFullscreen({ navigationUI: "hide" });
      return true;
    }
    if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen();
      return true;
    }
  } catch {
    // User dismissed, browser refused, or already-fullscreen race -- ignore.
  }
  return false;
}

/** Exit fullscreen if currently in it. Best-effort, never throws. */
export async function exitFullscreen(): Promise<void> {
  const doc = getDoc();
  if (!doc || !getFullscreenElement()) return;
  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    }
  } catch {
    // Ignore -- nothing actionable from a failed exit.
  }
}

interface FullscreenState {
  /** True when the document is currently in fullscreen. */
  isFullscreen: boolean;
  /** True when the platform actually supports the API on a mobile viewport. */
  isAvailable: boolean;
}

/**
 * Reactive view of the Fullscreen API. `isAvailable` is the "should we show
 * a fullscreen affordance?" flag -- it's only true on mobile-shaped viewports
 * where the API is actually allowed (so iPhone Safari, which silently fails,
 * returns false here).
 */
export function useFullscreen(): FullscreenState {
  const [state, setState] = useState<FullscreenState>(() => ({
    isFullscreen: !!getFullscreenElement(),
    isAvailable: isMobileViewport() && isFullscreenSupported(),
  }));

  useEffect(() => {
    const update = () => {
      setState({
        isFullscreen: !!getFullscreenElement(),
        isAvailable: isMobileViewport() && isFullscreenSupported(),
      });
    };
    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return state;
}
