export type RunPhase = "idle" | "baking" | "packing" | "converting" | "done" | "error";

export interface RunStatus {
	phase: RunPhase;
	busy: boolean;
	mine: boolean;
	blocked: boolean;
	ownerId: string | null;
	label: string;
	current: number;
	total: number;
	startedAt: number | null;
	lastHeartbeat: number | null;
	message: string;
	lastCrashAt: string | null;
	lastCrashMessage: string | null;
	lastBakeDurationMs: number | null;
	lastPackDurationMs: number | null;
	lastConvertDurationMs: number | null;
	lastAllDurationMs: number | null;
	durationHintMs: number | null;
	etaMs: number | null;
	etaLabel: string;
	elapsedMs: number;
	staleAfterMs: number;
	updatedAt: number;
	error?: string;
}

const OWNER_KEY = "fp-tools-run-owner-id";

export function getOwnerId(): string {
	try {
		const existing = window.sessionStorage.getItem(OWNER_KEY);
		if (existing) {
			return existing;
		}
		const created = "web-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
		window.sessionStorage.setItem(OWNER_KEY, created);
		return created;
	} catch (_err) {
		return "web-temp-" + Date.now().toString(36);
	}
}

export async function fetchRunStatus(): Promise<RunStatus> {
	const response = await fetch("/api/run?ownerId=" + encodeURIComponent(getOwnerId()));
	if (!response.ok) {
		throw new Error("Failed to read run status (" + response.status + ")");
	}
	return await response.json() as RunStatus;
}

export async function claimRun(phase: RunPhase, label: string, total = 0): Promise<RunStatus> {
	const response = await fetch("/api/run/claim", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			ownerId: getOwnerId(),
			phase,
			label,
			total
		})
	});
	const body = await response.json() as RunStatus & { error?: string };
	if (!response.ok) {
		const err = new Error(body.error || "Could not claim run lock");
		(err as Error & { status?: number; statusBody?: RunStatus }).status = response.status;
		(err as Error & { status?: number; statusBody?: RunStatus }).statusBody = body;
		throw err;
	}
	return body;
}

export async function reportRunProgress(patch: {
	phase?: RunPhase;
	label?: string;
	current?: number;
	total?: number;
	message?: string;
}): Promise<RunStatus> {
	const response = await fetch("/api/run/progress", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(Object.assign({ ownerId: getOwnerId() }, patch))
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || "Failed to update run progress");
	}
	return await response.json() as RunStatus;
}

export async function heartbeatRun(): Promise<RunStatus> {
	const response = await fetch("/api/run/heartbeat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ ownerId: getOwnerId() })
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || "Heartbeat failed");
	}
	return await response.json() as RunStatus;
}

export async function finishRun(result: {
	ok: boolean;
	kind: "bake" | "pack" | "convert" | "all";
	label?: string;
	message?: string;
	durationMs?: number;
}): Promise<RunStatus> {
	const response = await fetch("/api/run/finish", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(Object.assign({ ownerId: getOwnerId() }, result))
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || "Failed to finish run");
	}
	return await response.json() as RunStatus;
}

export async function ackCrashNotice(): Promise<RunStatus> {
	const response = await fetch("/api/run/ack-crash", { method: "POST" });
	if (!response.ok) {
		throw new Error("Failed to acknowledge crash notice");
	}
	return await response.json() as RunStatus;
}

export async function forceReleaseRun(reason: string): Promise<RunStatus> {
	const response = await fetch("/api/run/force-release", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ reason })
	});
	if (!response.ok) {
		throw new Error("Failed to force-release run lock");
	}
	return await response.json() as RunStatus;
}

export class RunWatchdog {
	private timer: number | null = null;
	private heartbeatTimer: number | null = null;
	private owning = false;
	private readonly onStatus: (status: RunStatus) => void;

	public constructor(onStatus: (status: RunStatus) => void) {
		this.onStatus = onStatus;
	}

	public start(): void {
		void this.pollOnce();
		this.timer = window.setInterval(() => {
			void this.pollOnce();
		}, 1000);
		window.addEventListener("pagehide", this.onPageHide);
		window.addEventListener("beforeunload", this.onPageHide);
	}

	public stop(): void {
		if (this.timer != null) {
			window.clearInterval(this.timer);
			this.timer = null;
		}
		this.stopHeartbeat();
		window.removeEventListener("pagehide", this.onPageHide);
		window.removeEventListener("beforeunload", this.onPageHide);
	}

	public setOwning(owning: boolean): void {
		this.owning = owning;
		if (owning) {
			this.startHeartbeat();
		} else {
			this.stopHeartbeat();
		}
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeatTimer = window.setInterval(() => {
			void heartbeatRun().catch(() => {
				// poll will surface stale/blocked state
			});
		}, 3000);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer != null) {
			window.clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}

	private readonly onPageHide = (): void => {
		if (!this.owning) {
			return;
		}
		const body = JSON.stringify({
			ownerId: getOwnerId(),
			ok: false,
			kind: "bake",
			message: "Browser tab closed or navigated away during an active run"
		});
		try {
			if (navigator.sendBeacon) {
				navigator.sendBeacon("/api/run/finish", new Blob([body], { type: "application/json" }));
			}
		} catch (_err) {
			// best effort
		}
	};

	private async pollOnce(): Promise<void> {
		try {
			const status = await fetchRunStatus();
			this.onStatus(status);
		} catch (_err) {
			this.onStatus({
				phase: "error",
				busy: false,
				mine: false,
				blocked: false,
				ownerId: null,
				label: "",
				current: 0,
				total: 0,
				startedAt: null,
				lastHeartbeat: null,
				message: "Missing connection to baker server",
				lastCrashAt: null,
				lastCrashMessage: null,
				lastBakeDurationMs: null,
				lastPackDurationMs: null,
				lastConvertDurationMs: null,
				lastAllDurationMs: null,
				durationHintMs: null,
				etaMs: null,
				etaLabel: "unknown estimate",
				elapsedMs: 0,
				staleAfterMs: 15000,
				updatedAt: Date.now(),
				error: "Missing connection to baker server"
			});
		}
	}
}
