/**
 * Screen Wake Lock — keeps the device display on while the game is visible.
 * Requires a secure context (HTTPS). The lock is released when the tab is
 * hidden; call requestScreenWakeLock() again on TAB_FOCUS / visibility.
 */

interface ScreenWakeLockSentinel extends EventTarget {
	released: boolean;
	type: "screen";
	release(): Promise<void>;
}

interface ScreenWakeLock {
	request(type: "screen"): Promise<ScreenWakeLockSentinel>;
}

let wakeLock: ScreenWakeLockSentinel | null = null;
/** True once we have asked to keep the screen awake for this session. */
let enabled = false;

function getWakeLockApi(): ScreenWakeLock | null {
	if (typeof navigator === "undefined") {
		return null;
	}
	const api = (navigator as Navigator & { wakeLock?: ScreenWakeLock }).wakeLock;
	return api ?? null;
}

/**
 * Enable wake lock for the session and request it now.
 * Prefer calling from a user gesture (splash dismiss / touch).
 */
export function enableScreenWakeLock(): void {
	enabled = true;
	void requestScreenWakeLock();
}

/** Re-acquire if enabled and the page is visible (e.g. after TAB_FOCUS). */
export function requestScreenWakeLock(): Promise<void> {
	return acquireWakeLock();
}

export async function releaseScreenWakeLock(): Promise<void> {
	enabled = false;
	if (!wakeLock) {
		return;
	}
	try {
		await wakeLock.release();
	} catch {
		// already released or unsupported
	}
	wakeLock = null;
}

async function acquireWakeLock(): Promise<void> {
	const api = getWakeLockApi();
	if (!enabled || !api) {
		return;
	}
	if (document.visibilityState !== "visible") {
		return;
	}
	if (wakeLock !== null) {
		return;
	}

	try {
		wakeLock = await api.request("screen");
		wakeLock.addEventListener("release", () => {
			wakeLock = null;
		});
	} catch {
		// NotAllowedError if not visible / permission denied — ignore
		wakeLock = null;
	}
}
