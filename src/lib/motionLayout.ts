import { useSyncExternalStore } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let version = 0;
const listeners = new Set<() => void>();
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let startupPending = false;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!version && !startupPending) {
    startupPending = true;
    // Let the opening content paint before measuring all scroll animations.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      version = 1;
      listeners.forEach((notify) => notify());
    }));
  }
  return () => {
    listeners.delete(listener);
  };
};

/** Refresh existing triggers once after a burst of pin/font/content changes. */
export function notifyMotionLayoutChange() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  }, 80);
}

export function useMotionLayoutVersion() {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}
