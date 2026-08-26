import { BakerConfig } from "./exportClient";
import { RunStatus } from "./runSession";

export type LogKind = "info" | "ok" | "skip" | "error";
export type BakeStatus = "idle" | "baking" | "packing" | "converting" | "done" | "error";

export class BakeOverlay {
	private readonly hudCurrent: HTMLElement;
	private readonly progressFill: HTMLElement;
	private readonly progressLabel: HTMLElement;
	private readonly rendererPill: HTMLElement;
	private readonly statusPill: HTMLElement;
	private readonly previewImg: HTMLImageElement;
	private readonly logEl: HTMLElement;
	private readonly errorLogEl: HTMLElement;
	private readonly errorsCount: HTMLElement;
	private readonly clearErrorsButton: HTMLButtonElement;
	private readonly bakeButton: HTMLButtonElement;
	private readonly packButton: HTMLButtonElement;
	private readonly convertButton: HTMLButtonElement;
	private readonly allButton: HTMLButtonElement;
	private readonly savePathsButton: HTMLButtonElement;
	private readonly exportPath: HTMLElement;
	private readonly spineInput: HTMLInputElement;
	private readonly exportInput: HTMLInputElement;
	private readonly spritesheetInput: HTMLInputElement;
	private readonly tpsInput: HTMLInputElement;
	private readonly spineExportInput: HTMLInputElement;
	private readonly spineConvertedInput: HTMLInputElement;
	private readonly lanUrls: HTMLElement;
	private readonly pathFileLabel: HTMLElement;
	private readonly pathError: HTMLElement;
	private readonly etaLabel: HTMLElement;
	private readonly sharedRun: HTMLElement;
	private localBusy = false;
	private remoteBlocked = false;
	private mirroringRemote = false;
	private bakeAllowed = true;
	private crashAckHandler: (() => void) | null = null;

	public constructor() {
		this.hudCurrent = this.mustGet("hud-current");
		this.progressFill = this.mustGet("progress-fill");
		this.progressLabel = this.mustGet("progress-label");
		this.rendererPill = this.mustGet("renderer-pill");
		this.statusPill = this.mustGet("status-pill");
		this.previewImg = this.mustGet("preview-img") as HTMLImageElement;
		this.logEl = this.mustGet("log");
		this.errorLogEl = this.mustGet("error-log");
		this.errorsCount = this.mustGet("errors-count");
		this.clearErrorsButton = this.mustGet("clear-errors-button") as HTMLButtonElement;
		this.bakeButton = this.mustGet("bake-button") as HTMLButtonElement;
		this.packButton = this.mustGet("pack-button") as HTMLButtonElement;
		this.convertButton = this.mustGet("convert-button") as HTMLButtonElement;
		this.allButton = this.mustGet("all-button") as HTMLButtonElement;
		this.savePathsButton = this.mustGet("save-paths-button") as HTMLButtonElement;
		this.exportPath = this.mustGet("export-path");
		this.spineInput = this.mustGet("spine-folder") as HTMLInputElement;
		this.exportInput = this.mustGet("export-folder") as HTMLInputElement;
		this.spritesheetInput = this.mustGet("spritesheet-folder") as HTMLInputElement;
		this.tpsInput = this.mustGet("tps-folder") as HTMLInputElement;
		this.spineExportInput = this.mustGet("spine-export-folder") as HTMLInputElement;
		this.spineConvertedInput = this.mustGet("spine-converted-folder") as HTMLInputElement;
		this.lanUrls = this.mustGet("lan-urls");
		this.pathFileLabel = this.mustGet("path-file-label");
		this.pathError = this.mustGet("path-error");
		this.etaLabel = this.mustGet("eta-label");
		this.sharedRun = this.mustGet("shared-run");
		this.setStatus("idle", "Idle — press Bake PNGs");
		const saveOnEnter = (event: KeyboardEvent): void => {
			if (event.key === "Enter") {
				this.savePathsButton.click();
			}
		};
		this.spineInput.addEventListener("keydown", saveOnEnter);
		this.exportInput.addEventListener("keydown", saveOnEnter);
		this.spritesheetInput.addEventListener("keydown", saveOnEnter);
		this.tpsInput.addEventListener("keydown", saveOnEnter);
		this.spineExportInput.addEventListener("keydown", saveOnEnter);
		this.spineConvertedInput.addEventListener("keydown", saveOnEnter);
		this.clearErrorsButton.addEventListener("click", () => this.clearErrors());
		this.sharedRun.addEventListener("click", () => {
			if (this.sharedRun.classList.contains("crash") && this.crashAckHandler) {
				this.crashAckHandler();
			}
		});
		this.updateErrorsCount();
	}

	public applyConfig(config: BakerConfig): void {
		this.spineInput.value = config.spine || "";
		this.exportInput.value = config.export || "";
		this.spritesheetInput.value = config.spritesheet || "";
		this.tpsInput.value = config.tps || "";
		this.spineExportInput.value = config.spineexport || "";
		this.spineConvertedInput.value = config.spineconverted || "";
		this.spineInput.classList.toggle("invalid", !config.spineExists);
		this.exportInput.classList.toggle("invalid", !config.exportExists);
		this.spritesheetInput.classList.toggle("invalid", !config.spritesheetExists);
		this.tpsInput.classList.toggle("invalid", Boolean(config.tps) && !config.tpsExists);
		this.spineExportInput.classList.toggle("invalid", Boolean(config.spineexport) && !config.spineExportExists);
		this.spineConvertedInput.classList.toggle("invalid", Boolean(config.spineconverted) && !config.spineConvertedExists);
		this.setExportPath(config.exportResolved || config.export);
		this.pathFileLabel.textContent = config.usingUserFile
			? "Saved in " + config.file
			: "Using project defaults. Save writes to " + config.file;
		const lines = [config.localhost].concat(config.lanUrls);
		this.lanUrls.textContent = lines.join("\n");
		this.setPathError(pathMessage(config));
	}

	public setPathError(message: string): void {
		this.pathError.textContent = message;
	}

	public readPathInputs(): {
		spine: string;
		export: string;
		spritesheet: string;
		tps: string;
		spineexport: string;
		spineconverted: string;
	} {
		return {
			spine: this.spineInput.value.trim(),
			export: this.exportInput.value.trim(),
			spritesheet: this.spritesheetInput.value.trim(),
			tps: this.tpsInput.value.trim(),
			spineexport: this.spineExportInput.value.trim(),
			spineconverted: this.spineConvertedInput.value.trim()
		};
	}

	public setRenderer(label: string, ok: boolean): void {
		this.rendererPill.textContent = "Renderer: " + label;
		this.rendererPill.classList.toggle("error", !ok);
	}

	public setExportPath(folder: string): void {
		this.exportPath.textContent = "Writing to " + folder;
	}

	public setStatus(state: BakeStatus, label: string): void {
		this.statusPill.className = state;
		this.statusPill.textContent = "Status: " + label;
	}

	public setBusy(busy: boolean, kind: "bake" | "pack" | "convert" | "all" = "bake"): void {
		this.localBusy = busy;
		this.bakeButton.textContent = busy && kind === "bake" ? "Baking…" : "Bake PNGs";
		this.packButton.textContent = busy && kind === "pack" ? "Packing…" : "Pack spritesheets";
		this.convertButton.textContent = busy && kind === "convert" ? "Converting…" : "Convert spine PNGs";
		this.allButton.textContent = busy && kind === "all" ? "Running all…" : "Run all — bake, pack, convert";
		if (busy && kind === "bake") {
			this.setStatus("baking", "Baking");
		}
		if (busy && kind === "all") {
			this.setStatus("baking", "Running all");
		}
		this.applyActionLock();
	}

	public setBakeEnabled(enabled: boolean): void {
		this.bakeAllowed = enabled;
		this.applyActionLock();
	}

	public onCrashAck(handler: () => void): void {
		this.crashAckHandler = handler;
	}

	/** Mirror shared server run state for other WebUI tabs / LAN clients. */
	public applySharedRun(status: RunStatus, options?: { localOwning?: boolean }): void {
		const localOwning = Boolean(options && options.localOwning);
		this.remoteBlocked = status.blocked;
		this.applyActionLock();

		const etaBits = ["Estimate: " + (status.etaLabel || "unknown estimate")];
		if (status.durationHintMs) {
			etaBits.push("last similar ≈ " + formatMs(status.durationHintMs));
		} else if (!status.busy) {
			const last = status.lastAllDurationMs || status.lastBakeDurationMs || status.lastPackDurationMs;
			etaBits.push(last ? "last similar ≈ " + formatMs(last) : "no prior timing");
		}
		this.etaLabel.textContent = etaBits.join(" · ");

		if (status.error === "Missing connection to baker server") {
			this.sharedRun.className = "crash";
			this.sharedRun.textContent = "Missing connection to baker server.\nActions are paused until the baker process is reachable again.";
			return;
		}

		if (status.lastCrashMessage) {
			this.sharedRun.className = "crash";
			this.sharedRun.textContent = "Crash recovery: " + status.lastCrashMessage
				+ "\nClick this banner to dismiss.";
			return;
		}

		const watchingRemote = status.blocked || (status.busy && !localOwning);
		if (watchingRemote) {
			this.mirroringRemote = true;
			const progress = status.total > 0
				? status.current + " / " + status.total
				: "in progress";
			this.sharedRun.className = "blocked";
			this.sharedRun.textContent = "Another WebUI session is "
				+ status.phase
				+ (status.label ? " — " + status.label : "")
				+ "\nProgress: " + progress
				+ "\n" + (status.etaLabel || "unknown estimate")
				+ (status.message ? "\n" + status.message : "");
			this.setHud(status.label || ("Remote " + status.phase));
			this.setProgress(status.current, status.total);
			this.setStatus(status.phase as BakeStatus, "Waiting — remote " + status.phase);
			return;
		}

		if (status.busy && localOwning) {
			this.mirroringRemote = false;
			this.sharedRun.className = "meta";
			this.sharedRun.textContent = "You own the shared run lock (" + status.phase + ").\n"
				+ (status.etaLabel || "unknown estimate");
			return;
		}

		if (this.mirroringRemote) {
			this.clearRemoteMirror(status);
		}

		this.sharedRun.className = "meta";
		this.sharedRun.textContent = status.phase === "done" || status.phase === "error"
			? "Last shared result: " + status.phase + (status.message ? " — " + status.message : "")
			: "No shared run — ready for a new step.";
	}

	private clearRemoteMirror(status: RunStatus): void {
		this.mirroringRemote = false;
		if (this.localBusy) {
			return;
		}
		if (status.phase === "done") {
			const total = Math.max(status.total || 0, status.current || 0);
			if (total > 0) {
				this.setProgress(total, total);
			}
			this.setHud(status.label || status.message || "Remote run finished");
			this.setStatus("done", "Done — remote finished");
			return;
		}
		if (status.phase === "error") {
			this.setHud(status.label || status.message || "Remote run failed");
			this.setStatus("error", "Remote failed");
			return;
		}
		this.setProgress(0, 0);
		this.setHud("Idle");
		this.setStatus("idle", "Idle — pick a step");
	}

	private applyActionLock(): void {
		const locked = this.localBusy || this.remoteBlocked;
		this.bakeButton.disabled = locked || !this.bakeAllowed;
		this.packButton.disabled = locked;
		this.convertButton.disabled = locked;
		this.allButton.disabled = locked || !this.bakeAllowed;
		this.savePathsButton.disabled = locked;
		this.clearErrorsButton.disabled = locked;
		this.spineInput.disabled = locked;
		this.exportInput.disabled = locked;
		this.spritesheetInput.disabled = locked;
		this.tpsInput.disabled = locked;
		this.spineExportInput.disabled = locked;
		this.spineConvertedInput.disabled = locked;
	}

	public setSaveBusy(busy: boolean): void {
		this.savePathsButton.disabled = busy;
		this.savePathsButton.textContent = busy ? "Saving…" : "Save paths";
	}

	public onBake(handler: () => void): void {
		this.bakeButton.addEventListener("click", handler);
	}

	public onPack(handler: () => void): void {
		this.packButton.addEventListener("click", handler);
	}

	public onConvert(handler: () => void): void {
		this.convertButton.addEventListener("click", handler);
	}

	public onRunAll(handler: () => void): void {
		this.allButton.addEventListener("click", handler);
	}

	public onSavePaths(handler: () => void): void {
		this.savePathsButton.addEventListener("click", handler);
	}

	public setHud(text: string): void {
		this.hudCurrent.textContent = text;
	}

	public setProgress(current: number, total: number): void {
		const safeTotal = Math.max(total, 0);
		const pct = safeTotal === 0 ? 0 : Math.round((current / safeTotal) * 100);
		this.progressFill.style.width = pct + "%";
		this.progressLabel.textContent = current + " / " + safeTotal + "  (" + pct + "%)";
	}

	public setPreview(dataUrl: string): void {
		this.previewImg.src = dataUrl;
	}

	public log(message: string, kind: LogKind = "info"): void {
		const line = document.createElement("div");
		if (kind === "ok") {
			line.className = "log-ok";
		} else if (kind === "skip") {
			line.className = "log-skip";
		} else if (kind === "error") {
			line.className = "log-error";
		}
		line.textContent = message;
		this.logEl.appendChild(line);
		this.logEl.scrollTop = this.logEl.scrollHeight;
		if (kind === "error") {
			this.appendError(message);
		}
	}

	public clearLog(): void {
		this.logEl.textContent = "";
	}

	public clearErrors(): void {
		this.errorLogEl.textContent = "";
		this.updateErrorsCount();
	}

	private appendError(message: string): void {
		const line = document.createElement("div");
		line.textContent = message;
		this.errorLogEl.appendChild(line);
		this.errorLogEl.scrollTop = this.errorLogEl.scrollHeight;
		this.updateErrorsCount();
	}

	private updateErrorsCount(): void {
		const count = this.errorLogEl.childElementCount;
		this.errorsCount.textContent = "(" + count + ")";
	}

	private mustGet(id: string): HTMLElement {
		const el = document.getElementById(id);
		if (!el) {
			throw new Error("Missing overlay element: #" + id);
		}
		return el;
	}
}

function formatMs(ms: number): string {
	const totalSec = Math.max(0, Math.round(ms / 1000));
	const min = Math.floor(totalSec / 60);
	const sec = totalSec % 60;
	if (min <= 0) {
		return sec + "s";
	}
	return min + "m " + String(sec).padStart(2, "0") + "s";
}

function pathMessage(config: BakerConfig): string {
	const parts: string[] = [];
	if (config.saveError) {
		parts.push(config.saveError);
	}
	if (config.spineError) {
		parts.push(config.spineError);
	}
	if (config.exportError) {
		parts.push(config.exportError);
	}
	if (config.spritesheetError) {
		parts.push(config.spritesheetError);
	}
	if (config.tpsError && config.tps) {
		parts.push(config.tpsError);
	}
	if (config.spineExportError && config.spineexport) {
		parts.push(config.spineExportError);
	}
	if (config.spineConvertedError && config.spineconverted) {
		parts.push(config.spineConvertedError);
	}
	if (!parts.length) {
		return "";
	}
	return parts.join("\n") + "\nType a valid folder and press Save paths.";
}
