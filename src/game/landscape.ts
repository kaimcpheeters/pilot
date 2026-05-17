/**
 * Best-effort landscape orientation lock for mobile browsers.
 *
 * This is intentionally separate from `fullscreen.ts`: orientation handling
 * is its own concern (the `OrientationGate` / `useOrientationGate` pair is
 * what actually enforces landscape in-app). This helper exists for the one
 * extra trick mobile Chromium offers -- `screen.orientation.lock` -- which
 * can rotate the page for the user when called inside a fullscreen context.
 *
 * Platform notes:
 *  - Android Chromium: works, but only while the page is fullscreen. Calling
 *    it outside fullscreen throws `SecurityError`, which we swallow.
 *  - iOS Safari: does not expose `screen.orientation.lock`. We rely on the
 *    in-app `OrientationGate` to prompt rotation instead.
 *  - Desktop: no-ops; the gate is a no-op there too.
 */

// `OrientationLockType` lives in newer TS lib snapshots; spell out just the
// values we actually pass to keep this self-contained.
type OrientationLock =
  | "landscape"
  | "landscape-primary"
  | "landscape-secondary";

interface LockableOrientation {
  lock?: (orientation: OrientationLock) => Promise<void>;
}

/**
 * Fire-and-forget. Safe to call from anywhere; on platforms that don't
 * support orientation lock (or aren't in a context where the call is
 * allowed) this resolves without doing anything.
 */
export async function lockLandscape(): Promise<void> {
  if (typeof screen === "undefined") return;
  const orientation = screen.orientation as
    | (ScreenOrientation & LockableOrientation)
    | undefined;
  if (!orientation?.lock) return;
  try {
    await orientation.lock("landscape");
  } catch {
    // iOS Safari throws NotSupportedError; some Androids throw SecurityError
    // outside of fullscreen. Either way there's nothing actionable here.
  }
}
