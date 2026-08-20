import * as PIXI from "pixi.js";
import "pixi-spine";
import { BakeOverlay } from "./bake/overlay";
import { runBake } from "./bake/baker";

PIXI.settings.PREFER_ENV = PIXI.ENV.WEBGL2;
PIXI.settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = true;
PIXI.settings.SORTABLE_CHILDREN = false;
PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.OFF;
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR;
PIXI.settings.ROUND_PIXELS = false;
PIXI.settings.RESOLUTION = 1;

const canvas = document.getElementById("pixi-canvas") as HTMLCanvasElement;
const overlay = new BakeOverlay();

const app = new PIXI.Application({
	view: canvas,
	width: Math.max(window.innerWidth - 360, 320),
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

if (!isWebGl) {
	overlay.log("WebGL is required. Canvas renderer is not used.", "error");
	overlay.setHud("WebGL unavailable");
	overlay.setBusy(true);
} else {
	overlay.log("Using " + rendererType + ".");
	layoutCanvas();
	window.addEventListener("resize", layoutCanvas);
	overlay.onBake(() => {
		runBake(app, overlay).catch((err) => {
			const message = err instanceof Error ? err.message : String(err);
			overlay.log(message, "error");
			overlay.setBusy(false);
		});
	});
	runBake(app, overlay).catch((err) => {
		const message = err instanceof Error ? err.message : String(err);
		overlay.log(message, "error");
		overlay.setBusy(false);
	});
}

function layoutCanvas(): void {
	const sidebar = 360;
	const width = Math.max(window.innerWidth - sidebar, 320);
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
