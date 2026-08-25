import * as PIXI from "pixi.js";
import "pixi-spine";
import { BakeOverlay } from "./bake/overlay";
import { runBake } from "./bake/baker";
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
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		overlay.log(message, "error");
		configOk = false;
	}

	if (!isWebGl) {
		overlay.log("WebGL is required. Canvas renderer is not used.", "error");
		overlay.setHud("WebGL unavailable");
		overlay.setStatus("error", "WebGL unavailable");
		overlay.setBakeEnabled(false);
		return;
	}

	const autobake = shouldAutobake();
	if (autobake && !configOk) {
		overlay.log("Autobake skipped until the folders are valid. Type a path and press Save paths.", "error");
	}
	overlay.log("Using " + rendererType + ". " + (autobake && configOk
		? "Autobake requested — starting now."
		: "Baker is idle until you press Bake PNGs."));
	overlay.setHud(autobake && configOk ? "Starting bake…" : "Idle");
	overlay.setStatus("idle", autobake && configOk ? "Idle — autobake" : "Idle — press Bake PNGs");
	layoutCanvas();
	window.addEventListener("resize", layoutCanvas);
	overlay.onBake(startBake);
	if (autobake && configOk) {
		startBake();
	}
}

async function savePathsFromUi(): Promise<void> {
	const inputs = overlay.readPathInputs();
	overlay.setSaveBusy(true);
	try {
		const config = await saveConfig(inputs.spine, inputs.export, inputs.spritesheet);
		overlay.applyConfig(config);
		overlay.log("Saved baker-paths.txt", "ok");
		overlay.log("Spine: " + (config.spineResolved || config.spine), config.spineError ? "error" : "ok");
		overlay.log("Spritesheet: " + (config.spritesheetResolved || config.spritesheet), config.spritesheetError ? "error" : "ok");
		overlay.log("Export: " + (config.exportResolved || config.export), config.exportError ? "error" : "ok");
		if (config.saveError) {
			overlay.log(config.saveError, "error");
		} else if (config.spineError || config.exportError || config.spritesheetError) {
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
	runBake(app, overlay).then(() => {
		overlay.setStatus("done", "Done — idle");
	}).catch((err) => {
		const message = err instanceof Error ? err.message : String(err);
		overlay.log(message, "error");
		overlay.setBusy(false);
		overlay.setStatus("error", "Failed");
	}).finally(() => {
		bakeInFlight = false;
	});
}

function layoutCanvas(): void {
	const width = Math.max(window.innerWidth - SIDEBAR_WIDTH, 320);
	const height = Math.max(window.innerHeight, 320);
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
