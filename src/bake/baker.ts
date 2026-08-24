import * as PIXI from "pixi.js";
import { Spine } from "pixi-spine";
import { MotionBlurFilter } from "pixi-filters";
import { BakeJob, buildBakeJobs } from "./catalog";
import { resetExport, saveManifest, savePng } from "./exportClient";
import { BakeOverlay } from "./overlay";

const SYM_X = 252;
const SYM_Y = 168;
const SYMBOL_BAKE_RESOLUTION = 1;
const SYMBOL_BLUR_PAD = 64;
const VIEW_MARGIN = 0.82;

let sharedMotionBlur: MotionBlurFilter | null = null;

export async function runBake(app: PIXI.Application, overlay: BakeOverlay): Promise<void> {
	overlay.setBusy(true);
	overlay.clearLog();
	overlay.setExportPath("export/png/<animation or blur>/");
	overlay.setHud("Building bake list…");

	await resetExport();
	overlay.log("Cleared previous bake output (export/png only).");

	const jobs = buildBakeJobs();
	overlay.setProgress(0, jobs.length);
	overlay.log("Load-path jobs: " + jobs.length + " grouped by animation / blur, named by texture cache.");

	const saved: Array<{ group: string; texName: string; path: string }> = [];
	const spineDataCache = new Map<string, any>();
	const loadedSheets = new Set<string>();
	let done = 0;

	try {
		for (const bakeJob of jobs) {
			overlay.setHud(bakeJob.group + " / " + bakeJob.texName);
			let display: PIXI.Container | null = null;
			try {
				if (bakeJob.spriteFrame && bakeJob.spriteSheet) {
					display = await createSprite(loadedSheets, bakeJob);
				} else {
					display = await createSpine(spineDataCache, bakeJob);
					poseSymbol(display as Spine, bakeJob);
				}

				const result = bakeJob.blur
					? captureBlur(app.renderer as PIXI.Renderer, display)
					: capturePreview(app.renderer as PIXI.Renderer, display);

				fitInView(app, display);
				app.renderer.render(app.stage);

				const relPath = await savePng(bakeJob.group, bakeJob.texName, result.base64);
				overlay.setPreview(result.dataUrl);
				overlay.log("Saved " + relPath + "  (" + result.width + "×" + result.height + ")", "ok");
				saved.push({ group: bakeJob.group, texName: bakeJob.texName, path: relPath });
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				overlay.log("Error " + bakeJob.texName + ": " + message, "error");
			} finally {
				if (display) {
					if (display.parent) {
						display.parent.removeChild(display);
					}
					if (display instanceof PIXI.Sprite) {
						display.destroy({ children: false, texture: false, baseTexture: false });
					} else {
						display.destroy({ children: true });
					}
				}
			}
			done += 1;
			overlay.setProgress(done, jobs.length);
			await waitFrames(2);
		}

		await saveManifest(saved);
		overlay.log("Wrote export/png/manifest.json (" + saved.length + " file(s)).", "ok");
		overlay.setHud("Done — " + saved.length + " PNG(s)");
		overlay.setStatus("done", "Done — " + saved.length + " PNG(s)");
	} finally {
		resetLoader();
		overlay.setBusy(false);
	}
}

async function createSpine(dataCache: Map<string, any>, bakeJob: BakeJob): Promise<Spine> {
	let spineData = dataCache.get(bakeJob.url);
	if (!spineData) {
		spineData = await loadSpineData(bakeJob.spine, bakeJob.url);
		dataCache.set(bakeJob.url, spineData);
	}
	const spine = new Spine(spineData);
	spine.autoUpdate = false;
	return spine;
}

function poseSymbol(spine: Spine, bakeJob: BakeJob): void {
	const data = spine.spineData;
	if (bakeJob.skin && !data.findSkin(bakeJob.skin)) {
		throw new Error("Skin '" + bakeJob.skin + "' not on " + bakeJob.spine);
	}
	if (!data.findAnimation(bakeJob.animation)) {
		throw new Error("Animation '" + bakeJob.animation + "' not on " + bakeJob.spine);
	}

	// Drop the previous skin fully — Spine attachAll() otherwise mixes buck variants.
	(spine.skeleton as unknown as { setSkin: (skin: unknown) => void }).setSkin(null);
	spine.skeleton.setSlotsToSetupPose();
	spine.skeleton.setBonesToSetupPose();
	if (bakeJob.skin) {
		spine.skeleton.setSkinByName(bakeJob.skin);
		spine.skeleton.setSlotsToSetupPose();
	}

	spine.state.clearTracks();
	spine.state.timeScale = 1;
	spine.state.setAnimation(0, bakeJob.animation, false);
	spine.update(0);
}

async function createSprite(loadedSheets: Set<string>, bakeJob: BakeJob): Promise<PIXI.Sprite> {
	const sheetUrl = bakeJob.spriteSheet as string;
	const frame = bakeJob.spriteFrame as string;
	if (!loadedSheets.has(sheetUrl)) {
		await loadSpritesheet(sheetUrl);
		loadedSheets.add(sheetUrl);
	}
	const texture = PIXI.Texture.from(frame);
	if (!texture || texture === PIXI.Texture.EMPTY) {
		throw new Error("No spritesheet frame " + frame);
	}
	const sprite = new PIXI.Sprite(texture);
	sprite.anchor.set(0.5);
	return sprite;
}

function fitInView(app: PIXI.Application, node: PIXI.Container): void {
	app.stage.removeChildren();
	app.stage.addChild(node);
	node.scale.set(1);
	node.position.set(0, 0);
	const bounds = node.getLocalBounds();
	const bw = Math.max(bounds.width, 1);
	const bh = Math.max(bounds.height, 1);
	const scale = Math.min(
		(app.renderer.width * VIEW_MARGIN) / bw,
		(app.renderer.height * VIEW_MARGIN) / bh,
		1
	);
	node.scale.set(scale);
	node.position.set(
		app.renderer.width / 2 - (bounds.x + bounds.width / 2) * scale,
		app.renderer.height / 2 - (bounds.y + bounds.height / 2) * scale
	);
}

function capturePreview(renderer: PIXI.Renderer, node: PIXI.Container): BakePixels {
	node.scale.set(1);

	const bounds = node.getLocalBounds();
	const left = -bounds.x;
	const right = bounds.x + bounds.width;
	const top = -bounds.y;
	const bottom = bounds.y + bounds.height;
	let width = 2 * Math.max(left, right, SYM_X / 2);
	let height = 2 * Math.max(top, bottom, SYM_Y / 2);
	width = Math.min(Math.ceil(width), SYM_X * 2);
	height = Math.min(Math.ceil(height), SYM_Y * 2);

	const holder = new PIXI.Container();
	holder.addChild(node);
	node.position.set(width / 2, height / 2);

	const renderTexture = PIXI.RenderTexture.create({
		width: Math.max(1, width),
		height: Math.max(1, height),
		resolution: SYMBOL_BAKE_RESOLUTION
	});
	renderer.render(holder, { renderTexture, clear: true });
	const pixels = textureToPng(renderer, renderTexture);
	renderTexture.destroy(true);
	holder.removeChild(node);
	holder.destroy({ children: false });
	return pixels;
}

function captureBlur(renderer: PIXI.Renderer, node: PIXI.Container): BakePixels {
	node.scale.set(1);

	const bounds = node.getLocalBounds();
	let width = Math.max(bounds.width, SYM_X) + SYMBOL_BLUR_PAD * 2;
	let height = Math.max(bounds.height, SYM_Y) + SYMBOL_BLUR_PAD * 2;
	width = Math.min(Math.ceil(width), SYM_X * 2 + SYMBOL_BLUR_PAD * 2);
	height = Math.min(Math.ceil(height), SYM_Y * 2 + SYMBOL_BLUR_PAD * 2);

	if (!sharedMotionBlur) {
		sharedMotionBlur = new MotionBlurFilter([0, 15], 5);
	}

	const holder = new PIXI.Container();
	holder.addChild(node);
	node.position.set(width / 2, height / 2);
	holder.filters = [sharedMotionBlur];
	holder.filterArea = new PIXI.Rectangle(0, 0, width, height);

	const renderTexture = PIXI.RenderTexture.create({
		width,
		height,
		resolution: renderer.resolution || 1
	});
	renderer.render(holder, { renderTexture, clear: true });
	holder.filters = null;
	const pixels = textureToPng(renderer, renderTexture);
	renderTexture.destroy(true);
	holder.removeChild(node);
	holder.destroy({ children: false });
	emptyFilterTexturePool(renderer);
	return pixels;
}

function emptyFilterTexturePool(renderer: PIXI.Renderer): void {
	const filterSystem = (renderer as any).filter;
	if (filterSystem && typeof filterSystem.emptyPool === "function") {
		filterSystem.emptyPool();
	}
}

interface BakePixels {
	dataUrl: string;
	base64: string;
	width: number;
	height: number;
}

function textureToPng(renderer: PIXI.Renderer, renderTexture: PIXI.RenderTexture): BakePixels {
	const resolution = renderTexture.baseTexture.resolution || 1;
	const width = Math.round(renderTexture.width * resolution);
	const height = Math.round(renderTexture.height * resolution);
	const pixels = renderer.extract.pixels(renderTexture);
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d", { alpha: true });
	if (!ctx) {
		throw new Error("Could not create 2D canvas for PNG encode");
	}
	const imageData = ctx.createImageData(width, height);
	imageData.data.set(pixels);
	ctx.putImageData(imageData, 0, 0);
	const dataUrl = canvas.toDataURL("image/png");
	const comma = dataUrl.indexOf(",");
	if (comma < 0) {
		throw new Error("Failed to encode PNG");
	}
	return {
		dataUrl,
		base64: dataUrl.substring(comma + 1),
		width,
		height
	};
}

function loadSpritesheet(url: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const loader = new PIXI.Loader();
		loader.add("symbols_img", url);
		loader.load((_ldr, resources) => {
			const resource = resources.symbols_img;
			if (!resource) {
				reject(new Error("Loader returned no resource for " + url));
				return;
			}
			if (resource.error) {
				reject(resource.error);
				return;
			}
			if (!resource.spritesheet && !resource.textures) {
				reject(new Error("No spritesheet on " + url));
				return;
			}
			resolve();
		});
	});
}

function loadSpineData(name: string, url: string): Promise<any> {
	return new Promise((resolve, reject) => {
		const loader = new PIXI.Loader();
		loader.add(name, url);
		loader.load((_ldr, resources) => {
			const resource = resources[name];
			if (!resource) {
				reject(new Error("Loader returned no resource for " + name));
				return;
			}
			if (resource.error) {
				reject(resource.error);
				return;
			}
			if (!resource.spineData) {
				reject(new Error("No spineData on " + name));
				return;
			}
			resolve(resource.spineData);
		});
	});
}

function resetLoader(): void {
	const loader = PIXI.Loader.shared;
	for (const key of Object.keys(loader.resources)) {
		const resource = loader.resources[key] as { spineAtlas?: { dispose?: () => void } };
		if (resource.spineAtlas && typeof resource.spineAtlas.dispose === "function") {
			resource.spineAtlas.dispose();
		}
	}
	loader.reset();
}

function waitFrames(count: number): Promise<void> {
	return new Promise((resolve) => {
		let left = count;
		const tick = (): void => {
			left -= 1;
			if (left <= 0) {
				resolve();
			} else {
				requestAnimationFrame(tick);
			}
		};
		requestAnimationFrame(tick);
	});
}
