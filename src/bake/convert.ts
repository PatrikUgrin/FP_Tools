import { BakeOverlay } from "./overlay";
import { convertPng, prepareConvert } from "./exportClient";

export interface ConvertSummary {
	ok: boolean;
	converted: number;
	failed: number;
	skipped: boolean;
}

export async function runConvert(overlay: BakeOverlay, required: boolean): Promise<ConvertSummary> {
	overlay.setHud("Copying spine export…");
	let listing;
	try {
		listing = await prepareConvert();
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (required) {
			throw err;
		}
		overlay.log("Skipping convert — " + message, "skip");
		return { ok: true, converted: 0, failed: 0, skipped: true };
	}

	overlay.log("Copied spine export to " + listing.folder, "ok");
	if (listing.skipped && listing.skipped.length) {
		overlay.log("Could not clear " + listing.skipped.length + " old item(s); they will be overwritten.", "skip");
	}
	if (!listing.files.length) {
		const message = "No PNG files in " + listing.folder;
		if (required) {
			throw new Error(message);
		}
		overlay.log(message, "skip");
		return { ok: true, converted: 0, failed: 0, skipped: true };
	}

	overlay.log("Converting " + listing.files.length + " PNG(s) to RGBA5555");
	overlay.setProgress(0, listing.files.length);

	let converted = 0;
	let failed = 0;
	for (let i = 0; i < listing.files.length; i++) {
		const file = listing.files[i];
		overlay.setHud("Convert " + file.relative);
		overlay.log("Converting " + file.relative + "…");
		const result = await convertWithHeartbeat(overlay, file.relative);
		if (result.ok) {
			converted += 1;
			overlay.log("Converted " + file.relative, "ok");
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
		converted,
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

async function convertWithHeartbeat(overlay: BakeOverlay, relative: string) {
	let seconds = 0;
	const beat = window.setInterval(() => {
		seconds += 5;
		overlay.log("  still converting " + relative + " (" + seconds + "s)…");
	}, 5000);
	try {
		return await convertPng(relative);
	} finally {
		window.clearInterval(beat);
	}
}
