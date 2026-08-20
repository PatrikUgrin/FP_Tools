export type LogKind = "info" | "ok" | "skip" | "error";

export class BakeOverlay {
	private readonly hudCurrent: HTMLElement;
	private readonly progressFill: HTMLElement;
	private readonly progressLabel: HTMLElement;
	private readonly rendererPill: HTMLElement;
	private readonly previewImg: HTMLImageElement;
	private readonly logEl: HTMLElement;
	private readonly bakeButton: HTMLButtonElement;
	private readonly exportPath: HTMLElement;

	public constructor() {
		this.hudCurrent = this.mustGet("hud-current");
		this.progressFill = this.mustGet("progress-fill");
		this.progressLabel = this.mustGet("progress-label");
		this.rendererPill = this.mustGet("renderer-pill");
		this.previewImg = this.mustGet("preview-img") as HTMLImageElement;
		this.logEl = this.mustGet("log");
		this.bakeButton = this.mustGet("bake-button") as HTMLButtonElement;
		this.exportPath = this.mustGet("export-path");
	}

	public setRenderer(label: string, ok: boolean): void {
		this.rendererPill.textContent = "Renderer: " + label;
		this.rendererPill.classList.toggle("error", !ok);
	}

	public setExportPath(folder: string): void {
		this.exportPath.textContent = "Writing to " + folder;
	}

	public setBusy(busy: boolean): void {
		this.bakeButton.disabled = busy;
		this.bakeButton.textContent = busy ? "Baking…" : "Bake PNGs";
	}

	public onBake(handler: () => void): void {
		this.bakeButton.addEventListener("click", handler);
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
	}

	public clearLog(): void {
		this.logEl.textContent = "";
	}

	private mustGet(id: string): HTMLElement {
		const el = document.getElementById(id);
		if (!el) {
			throw new Error("Missing overlay element: #" + id);
		}
		return el;
	}
}
