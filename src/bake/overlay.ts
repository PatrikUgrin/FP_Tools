import { BakerConfig } from "./exportClient";

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
		this.bakeButton.disabled = busy;
		this.packButton.disabled = busy;
		this.convertButton.disabled = busy;
		this.allButton.disabled = busy;
		this.savePathsButton.disabled = busy;
		this.clearErrorsButton.disabled = busy;
		this.spineInput.disabled = busy;
		this.exportInput.disabled = busy;
		this.spritesheetInput.disabled = busy;
		this.tpsInput.disabled = busy;
		this.spineExportInput.disabled = busy;
		this.spineConvertedInput.disabled = busy;
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
	}

	public setBakeEnabled(enabled: boolean): void {
		this.bakeButton.disabled = !enabled;
		this.allButton.disabled = !enabled;
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
