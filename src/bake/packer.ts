import { BakeOverlay } from "./overlay";
import { listTpsProjects, packTpsProject } from "./exportClient";

export interface PackSummary {
	ok: boolean;
	packed: number;
	failed: number;
	skipped: boolean;
}

export async function runPack(overlay: BakeOverlay, required: boolean): Promise<PackSummary> {
	overlay.setHud("Finding .tps projects…");
	const listing = await listTpsProjects();
	if (listing.folderError) {
		if (required) {
			throw new Error(listing.folderError);
		}
		overlay.log("Skipping pack — " + listing.folderError, "skip");
		return { ok: true, packed: 0, failed: 0, skipped: true };
	}
	if (listing.cliError) {
		throw new Error(listing.cliError);
	}
	if (!listing.files.length) {
		const message = "No .tps files in " + (listing.folder || "the TPS folder");
		if (required) {
			throw new Error(message);
		}
		overlay.log(message, "skip");
		return { ok: true, packed: 0, failed: 0, skipped: true };
	}

	overlay.log("TexturePacker: " + listing.cli);
	overlay.log("Packing " + listing.files.length + " project(s) from " + listing.folder);
	overlay.setProgress(0, listing.files.length);

	let packed = 0;
	let failed = 0;
	for (let i = 0; i < listing.files.length; i++) {
		const file = listing.files[i];
		overlay.setHud("Pack " + file.relative);
		overlay.log("Packing " + file.relative + "…");
		const result = await packTpsProject(file.relative);
		if (result.ok) {
			packed += 1;
			overlay.log("Packed " + file.relative, "ok");
			logCliOutput(overlay, result.stdout, "ok");
		} else {
			failed += 1;
			const detail = result.stderr || result.stdout || ("exit " + result.code);
			overlay.log("Failed " + file.relative + ": " + detail, "error");
		}
		overlay.setProgress(i + 1, listing.files.length);
	}

	return {
		ok: failed === 0,
		packed,
		failed,
		skipped: false
	};
}

function logCliOutput(overlay: BakeOverlay, text: string, kind: "ok" | "error"): void {
	const trimmed = String(text || "").trim();
	if (!trimmed) {
		return;
	}
	const clipped = trimmed.length > 2000 ? trimmed.slice(0, 2000) + "…" : trimmed;
	clipped.split(/\r?\n/).forEach((line) => {
		if (line.trim()) {
			overlay.log(line, kind);
		}
	});
}
