import * as PIXI from "pixi.js";
import "pixi-spine";
import { BakeOverlay } from "./bake/overlay";
import { runBake } from "./bake/baker";
import { runPack } from "./bake/packer";
import { runConvert } from "./bake/convert";
import { loadConfig, saveConfig } from "./bake/exportClient";

PIXI.settings.PREFER_ENV = PIXI.ENV.WEBGL2;
PIXI.settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = true;
PIXI.settings.SORTABLE_CHILDREN = false;
PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.OFF;
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR;
PIXI.settings.ROUND_PIXELS = false;
PIXI.settings.RESOLUTION = 1;

const SIDEBAR_WIDTH = 400;

const canvas = document.getElementById("pixi-canvas") as HTMLCanvasElement;
const overlay = new BakeOverlay();
let bakeInFlight = false;

const app = new PIXI.Application({
	view: canvas,
	width: Math.max(window.innerWidth - SIDEBAR_WIDTH, 320),
	height: Math.max(window.innerHeight, 320),
	backgroundAlpha: 0,
	antialias: true,
	autoDensity: true,
	resolution: 1,
	powerPreference: "high-performance",
	forceCanvas: false
});

const rendererType = describeRenderer(app);
const isWebGl = app.renderer.type === PIXI.RENDERER_TYPE.WEBGL;
overlay.setRenderer(rendererType, isWebGl);
overlay.onSavePaths(savePathsFromUi);

void boot();

async function boot(): Promise<void> {
	let configOk = true;
	try {
		const config = await loadConfig();
		overlay.applyConfig(config);
		if (config.lanUrls.length) {
			overlay.log("LAN: " + config.lanUrls.join("  "));
		}
		if (config.spineError) {
			overlay.log(config.spineError, "error");
			configOk = false;
		}
		if (config.exportError) {
			overlay.log(config.exportError, "error");
			configOk = false;
		}
		if (config.spritesheetError) {
			overlay.log(config.spritesheetError, "error");
		}
		if (config.tpsError && config.tps) {
			overlay.log(config.tpsError, "error");
		}
		if (config.spineExportError && config.spineexport) {
			overlay.log(config.spineExportError, "error");
		}
		if (config.spineConvertedError && config.spineconverted) {
			overlay.log(config.spineConvertedError, "error");
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		overlay.log(message, "error");
		configOk = false;
	}

	if (!isWebGl) {
		overlay.log("WebGL is required to bake. Pack spritesheets still works.", "error");
		overlay.setHud("WebGL unavailable");
		overlay.setStatus("error", "WebGL unavailable");
		overlay.setBakeEnabled(false);
		layoutCanvas();
		window.addEventListener("resize", layoutCanvas);
		overlay.onPack(startPack);
		overlay.onConvert(startConvert);
		return;
	}

	const autobake = shouldAutobake();
	if (autobake && !configOk) {
		overlay.log("Autobake skipped until the folders are valid. Type a path and press Save paths.", "error");
	}
	overlay.log("Using " + rendererType + ". " + (autobake && configOk
		? "Autobake requested — starting now."
		: "Baker is idle until you pick a step or press Run all."));
	overlay.setHud(autobake && configOk ? "Starting bake…" : "Idle");
	overlay.setStatus("idle", autobake && configOk ? "Idle — autobake" : "Idle — pick a step");
	layoutCanvas();
	window.addEventListener("resize", layoutCanvas);
	overlay.onBake(startBake);
	overlay.onPack(startPack);
	overlay.onConvert(startConvert);
	overlay.onRunAll(startAll);
	if (autobake && configOk) {
		startBake();
	}
}

async function savePathsFromUi(): Promise<void> {
	const inputs = overlay.readPathInputs();
	overlay.setSaveBusy(true);
	try {
		const config = await saveConfig(
			inputs.spine,
			inputs.export,
			inputs.spritesheet,
			inputs.tps,
			inputs.spineexport,
			inputs.spineconverted
		);
		overlay.applyConfig(config);
		overlay.log("Saved " + (config.file || "user baker-paths.txt"), "ok");
		overlay.log("Spine: " + (config.spineResolved || config.spine), config.spineError ? "error" : "ok");
		overlay.log("Spritesheet: " + (config.spritesheetResolved || config.spritesheet), config.spritesheetError ? "error" : "ok");
		overlay.log("Export: " + (config.exportResolved || config.export), config.exportError ? "error" : "ok");
		overlay.log("TPS: " + (config.tpsResolved || config.tps || "(not set)"), config.tps && config.tpsError ? "error" : "ok");
		overlay.log("Spine export: " + (config.spineExportResolved || config.spineexport || "(not set)"), config.spineexport && config.spineExportError ? "error" : "ok");
		overlay.log("Converted out: " + (config.spineConvertedResolved || config.spineconverted || "(not set)"), config.spineconverted && config.spineConvertedError ? "error" : "ok");
		if (config.saveError) {
			overlay.log(config.saveError, "error");
		} else if (config.spineError || config.exportError || config.spritesheetError || (config.tps && config.tpsError) || (config.spineexport && config.spineExportError) || (config.spineconverted && config.spineConvertedError)) {
			overlay.log("Path was saved. Fix any missing folder and save again if needed.", "error");
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		overlay.log(message, "error");
	} finally {
		overlay.setSaveBusy(false);
	}
}

function shouldAutobake(): boolean {
	const params = new URLSearchParams(window.location.search);
	if (!params.has("autobake")) {
		return false;
	}
	const url = new URL(window.location.href);
	url.searchParams.delete("autobake");
	const next = url.pathname + url.search + url.hash;
	window.history.replaceState({}, "", next);
	return true;
}

function startBake(): void {
	if (bakeInFlight) {
		return;
	}
	bakeInFlight = true;
	runBake(app, overlay).catch((err) => {
		const message = err instanceof Error ? err.message : String(err);
		overlay.log(message, "error");
		overlay.setBusy(false);
		overlay.setStatus("error", "Failed");
	}).finally(() => {
		bakeInFlight = false;
	});
}

function startPack(): void {
	if (bakeInFlight) {
		return;
	}
	bakeInFlight = true;
	overlay.setBusy(true, "pack");
	overlay.setStatus("packing", "Packing");
	runPack(overlay, true).then((pack) => {
		if (!pack.ok) {
			overlay.setStatus("error", "Pack failed");
			overlay.setHud("Packed " + pack.packed + ", failed " + pack.failed);
			return;
		}
		overlay.log("Packed " + pack.packed + " spritesheet(s).", "ok");
		overlay.setHud("Done — " + pack.packed + " packed");
		overlay.setStatus("done", "Done — packed");
	}).catch((err) => {
		const message = err instanceof Error ? err.message : String(err);
		overlay.log(message, "error");
		overlay.setStatus("error", "Pack failed");
	}).finally(() => {
		overlay.setBusy(false);
		bakeInFlight = false;
	});
}

function startConvert(): void {
	if (bakeInFlight) {
		return;
	}
	bakeInFlight = true;
	overlay.setBusy(true, "convert");
	overlay.setStatus("converting", "Converting");
	runConvert(overlay, true).then((result) => {
		if (!result.ok) {
			overlay.setStatus("error", "Convert failed");
			overlay.setHud("Converted " + result.converted + ", failed " + result.failed);
			return;
		}
		overlay.log("Converted " + result.converted + " PNG(s) to RGBA5555.", "ok");
		overlay.setHud("Done — " + result.converted + " converted");
		overlay.setStatus("done", "Done — converted");
	}).catch((err) => {
		const message = err instanceof Error ? err.message : String(err);
		overlay.log(message, "error");
		overlay.setStatus("error", "Convert failed");
	}).finally(() => {
		overlay.setBusy(false);
		bakeInFlight = false;
	});
}

function startAll(): void {
	if (bakeInFlight) {
		return;
	}
	bakeInFlight = true;
	overlay.setBusy(true, "all");
	void runAllPipeline().catch((err) => {
		const message = err instanceof Error ? err.message : String(err);
		overlay.log(message, "error");
		overlay.setStatus("error", "Failed");
	}).finally(() => {
		overlay.setBusy(false);
		bakeInFlight = false;
	});
}

async function runAllPipeline(): Promise<void> {
	overlay.clearLog();
	overlay.clearErrors();
	overlay.log("Run all: bake, then pack, then convert.");
	overlay.setStatus("baking", "Running all — bake");
	const baked = await runBake(app, overlay, { manageBusy: false });
	overlay.setBusy(true, "all");
	overlay.setStatus("packing", "Running all — pack");
	const pack = await runPack(overlay, false);
	if (!pack.ok) {
		overlay.setStatus("error", "Pack failed");
		overlay.setHud("Packed " + pack.packed + ", failed " + pack.failed);
		return;
	}
	if (!pack.skipped) {
		overlay.log("Packed " + pack.packed + " spritesheet(s).", "ok");
	}
	overlay.setBusy(true, "all");
	overlay.setStatus("converting", "Running all — convert");
	const converted = await runConvert(overlay, false);
	if (!converted.ok) {
		overlay.setStatus("error", "Convert failed");
		overlay.setHud("Converted " + converted.converted + ", failed " + converted.failed);
		return;
	}
	if (!converted.skipped) {
		overlay.log("Converted " + converted.converted + " PNG(s) to RGBA5555.", "ok");
	}
	overlay.setHud("Done — baked " + baked + ", packed, converted");
	overlay.setStatus("done", "Done — all steps");
}

function layoutCanvas(): void {
	const stage = document.getElementById("stage-wrap");
	const width = Math.max(stage ? stage.clientWidth : window.innerWidth - SIDEBAR_WIDTH, 320);
	const height = Math.max(stage ? stage.clientHeight : window.innerHeight, 200);
	app.renderer.resize(width, height);
}

function describeRenderer(application: PIXI.Application): string {
	const renderer = application.renderer as PIXI.Renderer;
	if (application.renderer.type !== PIXI.RENDERER_TYPE.WEBGL) {
		return "Canvas (rejected)";
	}
	const gl = renderer.gl;
	const isWebGl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
	return isWebGl2 ? "WebGL2" : "WebGL1";
}
