export async function loadConfig(): Promise<BakerConfig> {
	const response = await fetch("/api/config");
	if (!response.ok) {
		throw new Error("Failed to load baker-paths.txt (" + response.status + ")");
	}
	return await response.json() as BakerConfig;
}

export async function saveConfig(spine: string, exportDir: string, spritesheet: string, tps: string): Promise<BakerConfig> {
	const response = await fetch("/api/config", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			spine,
			export: exportDir,
			spritesheet,
			tps
		})
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(configError(text, response.status));
	}
	return await response.json() as BakerConfig;
}

export async function resetExport(): Promise<{ exportRoot: string; skipped: string[] }> {
	const response = await fetch("/api/reset", { method: "POST" });
	if (!response.ok) {
		const text = await response.text();
		throw new Error(apiError(text, response.status, "Failed to clear export folder"));
	}
	const body = await response.json() as { exportRoot?: string; skipped?: string[] };
	return {
		exportRoot: body.exportRoot || "",
		skipped: Array.isArray(body.skipped) ? body.skipped : []
	};
}

export async function savePng(group: string, texName: string, pngBase64: string): Promise<string> {
	const response = await fetch("/api/png", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			group,
			texName,
			pngBase64
		})
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error("Save failed for " + group + "/" + texName + ": " + text);
	}
	const body = await response.json() as { path: string };
	return body.path;
}

export async function saveManifest(entries: Array<{ group: string; texName: string; path: string }>): Promise<void> {
	const response = await fetch("/api/manifest", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ entries })
	});
	if (!response.ok) {
		throw new Error("Failed to write manifest (" + response.status + ")");
	}
}

function apiError(text: string, status: number, fallback: string): string {
	try {
		const body = JSON.parse(text) as { error?: string };
		if (body && body.error) {
			return body.error;
		}
	} catch (_err) {
		// fall through
	}
	if (text) {
		return fallback + ": " + text;
	}
	return fallback + " (" + status + ")";
}

function configError(text: string, status: number): string {
	return apiError(text, status, "Failed to save baker-paths.txt");
}

export async function listTpsProjects(): Promise<TpsListing> {
	const response = await fetch("/api/tps");
	if (!response.ok) {
		const text = await response.text();
		throw new Error(apiError(text, response.status, "Failed to list .tps projects"));
	}
	return await response.json() as TpsListing;
}

export async function packTpsProject(relative: string): Promise<TpsPackResult> {
	const controller = new AbortController();
	const timer = window.setTimeout(() => controller.abort(), 100000);
	try {
		const response = await fetch("/api/pack", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ relative }),
			signal: controller.signal
		});
		if (!response.ok) {
			const text = await response.text();
			throw new Error(apiError(text, response.status, "Failed to pack " + relative));
		}
		return await response.json() as TpsPackResult;
	} catch (err) {
		if (err instanceof DOMException && err.name === "AbortError") {
			throw new Error("Pack timed out waiting for TexturePacker on " + relative);
		}
		throw err;
	} finally {
		window.clearTimeout(timer);
	}
}

export interface BakerConfig {
	spine: string;
	export: string;
	spritesheet: string;
	tps: string;
	spineResolved: string;
	exportResolved: string;
	spritesheetResolved: string;
	tpsResolved: string;
	spineExists: boolean;
	exportExists: boolean;
	spritesheetExists: boolean;
	tpsExists: boolean;
	spineError: string | null;
	exportError: string | null;
	spritesheetError: string | null;
	tpsError: string | null;
	saveError?: string;
	file: string;
	port: number;
	localhost: string;
	lanUrls: string[];
}

export interface TpsListing {
	cli: string;
	cliError: string | null;
	folder: string;
	folderError: string | null;
	files: Array<{ name: string; relative: string }>;
}

export interface TpsPackResult {
	ok: boolean;
	relative: string;
	file: string;
	code: number;
	stdout: string;
	stderr: string;
}
