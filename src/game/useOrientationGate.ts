import { useEffect, useState } from "react";

interface OrientationState {
  blocked: boolean;
  isPortrait: boolean;
  isMobile: boolean;
}

function compute(): OrientationState {
  if (typeof window === "undefined") {
    return { blocked: false, isPortrait: false, isMobile: false };
  }
  const portraitMQ = window.matchMedia("(orientation: portrait)");
  const coarseMQ = window.matchMedia("(pointer: coarse)");
  const isPortrait = portraitMQ.matches || window.innerHeight > window.innerWidth;
  const isMobile = coarseMQ.matches || window.innerWidth < 900;
  return { blocked: isMobile && isPortrait, isPortrait, isMobile };
}

/**
 * Tracks whether a mobile/portrait viewer should be blocked from starting the game.
 * Recomputed on resize and orientationchange.
 */
export function useOrientationGate(): OrientationState {
  const [state, setState] = useState<OrientationState>(() => compute());

  useEffect(() => {
    const update = () => setState(compute());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const portraitMQ = window.matchMedia("(orientation: portrait)");
    portraitMQ.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      portraitMQ.removeEventListener?.("change", update);
    };
  }, []);

  return state;
}
