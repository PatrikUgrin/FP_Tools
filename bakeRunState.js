const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(__dirname, ".bake-run.json");
const ACTIVE = new Set(["baking", "packing", "converting"]);
const STALE_MS = 15000;

/**
 * @typedef {object} BakeRunState
 * @property {"idle"|"baking"|"packing"|"converting"|"done"|"error"} phase
 * @property {string|null} ownerId
 * @property {string} label
 * @property {number} current
 * @property {number} total
 * @property {number|null} startedAt
 * @property {number|null} lastHeartbeat
 * @property {number|null} lastBakeDurationMs
 * @property {number|null} lastPackDurationMs
 * @property {number|null} lastConvertDurationMs
 * @property {number|null} lastAllDurationMs
 * @property {string|null} lastCrashAt
 * @property {string|null} lastCrashMessage
 * @property {string} message
 * @property {number} updatedAt
 */

/** @type {BakeRunState} */
let state;

function idleState(extra) {
	return Object.assign({
		phase: "idle",
		ownerId: null,
		label: "",
		current: 0,
		total: 0,
		startedAt: null,
		lastHeartbeat: null,
		lastBakeDurationMs: null,
		lastPackDurationMs: null,
		lastConvertDurationMs: null,
		lastAllDurationMs: null,
		lastCrashAt: null,
		lastCrashMessage: null,
		message: "",
		updatedAt: Date.now()
	}, extra || {});
}

function loadOrRecover() {
	let raw = null;
	try {
		if (fs.existsSync(STATE_FILE)) {
			raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
		}
	} catch (err) {
		console.error("[baker-run] failed to read .bake-run.json:", err.message || err);
	}

	const base = idleState({
		lastBakeDurationMs: numberOrNull(raw && raw.lastBakeDurationMs),
		lastPackDurationMs: numberOrNull(raw && raw.lastPackDurationMs),
		lastConvertDurationMs: numberOrNull(raw && raw.lastConvertDurationMs),
		lastAllDurationMs: numberOrNull(raw && raw.lastAllDurationMs)
	});

	if (raw && ACTIVE.has(raw.phase)) {
		const crashAt = new Date().toISOString();
		const message = "Previous " + raw.phase + " run was interrupted (server restarted while phase was active"
			+ (raw.label ? ": " + raw.label : "") + "). Lock cleared.";
		console.error("[baker-run] CRASH RECOVERY: " + message);
		const recovered = idleState(Object.assign({}, base, {
			lastCrashAt: crashAt,
			lastCrashMessage: message,
			message: message,
			phase: "idle"
		}));
		hydrateDurationsFromManifest(recovered);
		persist(recovered);
		return recovered;
	}

	if (raw && typeof raw === "object") {
		const merged = Object.assign(base, {
			phase: "idle",
			ownerId: null,
			label: "",
			current: 0,
			total: 0,
			startedAt: null,
			lastHeartbeat: null,
			lastCrashAt: raw.lastCrashAt || null,
			lastCrashMessage: raw.lastCrashMessage || null,
			message: "",
			updatedAt: Date.now()
		});
		hydrateDurationsFromManifest(merged);
		persist(merged);
		return merged;
	}

	hydrateDurationsFromManifest(base);
	persist(base);
	return base;
}

function hydrateDurationsFromManifest(target) {
	try {
		const { loadBakerPaths } = require("./bakerPaths");
		const cfg = loadBakerPaths();
		if (!cfg.exportResolved) {
			return;
		}
		const manifestPath = path.join(cfg.exportResolved, "manifest.json");
		if (!fs.existsSync(manifestPath)) {
			return;
		}
		const man = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
		if (!target.lastBakeDurationMs) {
			target.lastBakeDurationMs = numberOrNull(man.lastBakeDurationMs) || numberOrNull(man.durationMs);
		}
		if (!target.lastPackDurationMs) {
			target.lastPackDurationMs = numberOrNull(man.lastPackDurationMs);
		}
		if (!target.lastConvertDurationMs) {
			target.lastConvertDurationMs = numberOrNull(man.lastConvertDurationMs);
		}
		if (!target.lastAllDurationMs) {
			target.lastAllDurationMs = numberOrNull(man.lastAllDurationMs);
		}
	} catch (err) {
		console.error("[baker-run] could not hydrate durations from manifest.json:", err.message || err);
	}
}

function numberOrNull(value) {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function persist(next) {
	state = next;
	try {
		fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
	} catch (err) {
		console.error("[baker-run] failed to write .bake-run.json:", err.message || err);
	}
}

function expireStaleOwner() {
	if (!ACTIVE.has(state.phase) || !state.lastHeartbeat) {
		return false;
	}
	if (Date.now() - state.lastHeartbeat <= STALE_MS) {
		return false;
	}
	const message = "Lost connection to the machine that was " + state.phase
		+ (state.label ? " (" + state.label + ")" : "")
		+ ". Lock cleared after " + Math.round(STALE_MS / 1000) + "s without heartbeat.";
	console.error("[baker-run] STALE OWNER: " + message);
	persist(idleState({
		lastBakeDurationMs: state.lastBakeDurationMs,
		lastPackDurationMs: state.lastPackDurationMs,
		lastConvertDurationMs: state.lastConvertDurationMs,
		lastAllDurationMs: state.lastAllDurationMs,
		lastCrashAt: new Date().toISOString(),
		lastCrashMessage: message,
		message: message
	}));
	return true;
}

function publicStatus(viewerId) {
	expireStaleOwner();
	const mine = Boolean(viewerId && state.ownerId && viewerId === state.ownerId);
	const busy = ACTIVE.has(state.phase);
	const durationHint = durationForPhase(state.phase, state);
	const etaMs = estimateEtaMs(state, durationHint);
	return {
		phase: state.phase,
		busy: busy,
		mine: mine,
		blocked: busy && !mine,
		ownerId: state.ownerId,
		label: state.label || "",
		current: state.current || 0,
		total: state.total || 0,
		startedAt: state.startedAt,
		lastHeartbeat: state.lastHeartbeat,
		message: state.message || "",
		lastCrashAt: state.lastCrashAt,
		lastCrashMessage: state.lastCrashMessage,
		lastBakeDurationMs: state.lastBakeDurationMs,
		lastPackDurationMs: state.lastPackDurationMs,
		lastConvertDurationMs: state.lastConvertDurationMs,
		lastAllDurationMs: state.lastAllDurationMs,
		durationHintMs: durationHint,
		etaMs: etaMs,
		etaLabel: formatEta(etaMs, durationHint),
		elapsedMs: state.startedAt ? Math.max(0, Date.now() - state.startedAt) : 0,
		staleAfterMs: STALE_MS,
		updatedAt: state.updatedAt
	};
}

function durationForPhase(phase, src) {
	if (phase === "baking") {
		return src.lastBakeDurationMs;
	}
	if (phase === "packing") {
		return src.lastPackDurationMs;
	}
	if (phase === "converting") {
		return src.lastConvertDurationMs;
	}
	return src.lastAllDurationMs || src.lastBakeDurationMs;
}

function estimateEtaMs(src, hintMs) {
	if (!ACTIVE.has(src.phase) || !src.startedAt) {
		return null;
	}
	const current = Math.max(0, src.current || 0);
	const total = Math.max(0, src.total || 0);
	const elapsed = Math.max(0, Date.now() - src.startedAt);
	if (total > 0 && current > 0) {
		const rate = elapsed / current;
		return Math.max(0, Math.round(rate * (total - current)));
	}
	if (hintMs && total > 0) {
		const fraction = current / total;
		return Math.max(0, Math.round(hintMs * (1 - fraction)));
	}
	if (hintMs) {
		return Math.max(0, Math.round(hintMs - elapsed));
	}
	return null;
}

function formatEta(etaMs, hintMs) {
	if (etaMs == null) {
		return hintMs ? "estimating…" : "unknown estimate";
	}
	return "≈ " + formatDuration(etaMs) + " left";
}

function formatDuration(ms) {
	const totalSec = Math.max(0, Math.round(ms / 1000));
	const min = Math.floor(totalSec / 60);
	const sec = totalSec % 60;
	if (min <= 0) {
		return sec + "s";
	}
	return min + "m " + String(sec).padStart(2, "0") + "s";
}

function claim(ownerId, phase, label, total) {
	expireStaleOwner();
	if (!ownerId) {
		throw Object.assign(new Error("ownerId is required"), { status: 400 });
	}
	if (!ACTIVE.has(phase)) {
		throw Object.assign(new Error("Invalid phase"), { status: 400 });
	}
	if (ACTIVE.has(state.phase) && state.ownerId && state.ownerId !== ownerId) {
		const err = new Error("Another session is already " + state.phase
			+ (state.label ? " (" + state.label + ")" : ""));
		err.status = 409;
		err.statusBody = publicStatus(ownerId);
		throw err;
	}
	const now = Date.now();
	persist(Object.assign({}, state, {
		phase: phase,
		ownerId: ownerId,
		label: String(label || ""),
		current: 0,
		total: Math.max(0, Number(total) || 0),
		startedAt: now,
		lastHeartbeat: now,
		message: "",
		updatedAt: now
	}));
	return publicStatus(ownerId);
}

function progress(ownerId, patch) {
	expireStaleOwner();
	requireOwner(ownerId);
	const now = Date.now();
	persist(Object.assign({}, state, {
		phase: ACTIVE.has(patch.phase) ? patch.phase : state.phase,
		label: patch.label != null ? String(patch.label) : state.label,
		current: patch.current != null ? Math.max(0, Number(patch.current) || 0) : state.current,
		total: patch.total != null ? Math.max(0, Number(patch.total) || 0) : state.total,
		lastHeartbeat: now,
		message: patch.message != null ? String(patch.message) : state.message,
		updatedAt: now
	}));
	return publicStatus(ownerId);
}

function heartbeat(ownerId) {
	expireStaleOwner();
	requireOwner(ownerId);
	const now = Date.now();
	persist(Object.assign({}, state, {
		lastHeartbeat: now,
		updatedAt: now
	}));
	return publicStatus(ownerId);
}

function finish(ownerId, result) {
	expireStaleOwner();
	requireOwner(ownerId);
	const now = Date.now();
	const durationMs = numberOrNull(result && result.durationMs);
	const kind = String((result && result.kind) || state.phase || "");
	const next = idleState({
		lastBakeDurationMs: state.lastBakeDurationMs,
		lastPackDurationMs: state.lastPackDurationMs,
		lastConvertDurationMs: state.lastConvertDurationMs,
		lastAllDurationMs: state.lastAllDurationMs,
		lastCrashAt: null,
		lastCrashMessage: null,
		phase: result && result.ok === false ? "error" : "done",
		message: String((result && result.message) || ""),
		label: String((result && result.label) || state.label || ""),
		current: state.current,
		total: state.total,
		updatedAt: now
	});
	if (durationMs) {
		if (kind === "baking" || kind === "bake") {
			next.lastBakeDurationMs = durationMs;
		} else if (kind === "packing" || kind === "pack") {
			next.lastPackDurationMs = durationMs;
		} else if (kind === "converting" || kind === "convert") {
			next.lastConvertDurationMs = durationMs;
		} else if (kind === "all") {
			next.lastAllDurationMs = durationMs;
		}
	}
	persist(next);
	syncDurationsToManifest(next);
	// After a short while, flip done/error back to idle for new claims while keeping durations.
	return publicStatus(ownerId);
}

function syncDurationsToManifest(src) {
	try {
		const { loadBakerPaths } = require("./bakerPaths");
		const cfg = loadBakerPaths();
		if (!cfg.exportResolved) {
			return;
		}
		const manifestPath = path.join(cfg.exportResolved, "manifest.json");
		let man = {};
		if (fs.existsSync(manifestPath)) {
			man = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
		}
		const next = Object.assign({}, man, {
			lastBakeDurationMs: src.lastBakeDurationMs,
			lastPackDurationMs: src.lastPackDurationMs,
			lastConvertDurationMs: src.lastConvertDurationMs,
			lastAllDurationMs: src.lastAllDurationMs
		});
		if (src.lastBakeDurationMs && !next.durationMs) {
			next.durationMs = src.lastBakeDurationMs;
		}
		fs.mkdirSync(cfg.exportResolved, { recursive: true });
		fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2));
	} catch (err) {
		console.error("[baker-run] could not sync durations to manifest.json:", err.message || err);
	}
}

function clearCrashNotice() {
	if (!state.lastCrashMessage && !state.lastCrashAt) {
		return publicStatus(null);
	}
	persist(Object.assign({}, state, {
		lastCrashAt: null,
		lastCrashMessage: null,
		message: state.phase === "idle" ? "" : state.message,
		updatedAt: Date.now()
	}));
	return publicStatus(null);
}

function requireOwner(ownerId) {
	if (!ownerId) {
		throw Object.assign(new Error("ownerId is required"), { status: 400 });
	}
	if (!state.ownerId || state.ownerId !== ownerId) {
		throw Object.assign(new Error("You do not own the active run"), { status: 409 });
	}
	if (!ACTIVE.has(state.phase)) {
		throw Object.assign(new Error("No active run to update"), { status: 409 });
	}
}

function forceRelease(reason) {
	const message = reason || "Run lock force-cleared.";
	console.error("[baker-run] FORCE RELEASE: " + message);
	persist(idleState({
		lastBakeDurationMs: state.lastBakeDurationMs,
		lastPackDurationMs: state.lastPackDurationMs,
		lastConvertDurationMs: state.lastConvertDurationMs,
		lastAllDurationMs: state.lastAllDurationMs,
		lastCrashAt: new Date().toISOString(),
		lastCrashMessage: message,
		message: message
	}));
	return publicStatus(null);
}

/** Persist a known phase duration without changing lock ownership (e.g. mid-bake manifest write). */
function noteDuration(kind, durationMs) {
	const ms = numberOrNull(durationMs);
	if (!ms) {
		return publicStatus(null);
	}
	const next = Object.assign({}, state, { updatedAt: Date.now() });
	if (kind === "baking" || kind === "bake") {
		next.lastBakeDurationMs = ms;
	} else if (kind === "packing" || kind === "pack") {
		next.lastPackDurationMs = ms;
	} else if (kind === "converting" || kind === "convert") {
		next.lastConvertDurationMs = ms;
	} else if (kind === "all") {
		next.lastAllDurationMs = ms;
	}
	persist(next);
	return publicStatus(null);
}

state = loadOrRecover();

module.exports = {
	publicStatus,
	claim,
	progress,
	heartbeat,
	finish,
	clearCrashNotice,
	forceRelease,
	noteDuration,
	STALE_MS,
	STATE_FILE
};
