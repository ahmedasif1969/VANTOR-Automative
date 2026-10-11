import { useSyncExternalStore } from "react";

let version = 0;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Rebuild section contexts when late hero pin/font layout changes their positions. */
export function notifyMotionLayoutChange() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function useMotionLayoutVersion() {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}
