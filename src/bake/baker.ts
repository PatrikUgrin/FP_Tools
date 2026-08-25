import * as PIXI from "pixi.js";
import { Spine, SpineParser, TextureAtlas } from "pixi-spine";
import { MotionBlurFilter } from "pixi-filters";
import { BakeJob, buildBakeJobs } from "./catalog";
import { loadConfig, resetExport, saveManifest, savePng } from "./exportClient";
import { BakeOverlay } from "./overlay";

const SYM_X = 252;
const SYM_Y = 168;
const SYMBOL_BAKE_RESOLUTION = 1;
const SYMBOL_BLUR_PAD = 64;
const VIEW_MARGIN = 0.82;
const LOAD_TIMEOUT_MS = 45000;

let sharedMotionBlur: MotionBlurFilter | null = null;

export async function runBake(app: PIXI.Application, overlay: BakeOverlay): Promise<void> {
	overlay.setBusy(true);
	overlay.clearLog();
	overlay.setHud("Building bake list…");

	const config = await loadConfig();
	if (!config.spineExists) {
		throw new Error(config.spineError || "Spine folder not found. Save a valid path in the sidebar.");
	}
	if (config.exportError && !config.exportExists) {
		throw new Error(config.exportError);
	}

	const reset = await resetExport();
	overlay.setExportPath(reset.exportRoot);
	overlay.log("Cleared previous bake output (" + reset.exportRoot + ").");
	if (reset.skipped.length) {
		overlay.log("Dropbox still had a lock on " + reset.skipped.length + " item(s); those files will be overwritten.", "skip");
	}

	const jobs = buildBakeJobs();
	overlay.setProgress(0, jobs.length);
	overlay.log("Load-path jobs: " + jobs.length + " grouped by animation / blur, named by texture cache.");

	const saved: Array<{ group: string; texName: string; path: string }> = [];
	const spineDataCache = new Map<string, any>();
	const spineLoadErrors = new Map<string, Error>();
	const spineLoads = new Map<string, Promise<any>>();
	const loadedSheets = new Set<string>();
	let done = 0;

	try {
		for (const bakeJob of jobs) {
			overlay.setHud(bakeJob.group + " / " + bakeJob.texName);
			await waitFrames(1);
			let display: PIXI.Container | null = null;
			try {
				if (bakeJob.spriteFrame && bakeJob.spriteSheet) {
					display = await createSprite(loadedSheets, bakeJob, overlay);
				} else {
					display = await createSpine(spineDataCache, spineLoads, spineLoadErrors, bakeJob, overlay);
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
		overlay.log("Wrote manifest.json in " + reset.exportRoot + " (" + saved.length + " file(s)).", "ok");
		overlay.setHud("Done — " + saved.length + " PNG(s)");
		overlay.setStatus("done", "Done — " + saved.length + " PNG(s)");
	} finally {
		resetLoader();
		overlay.setBusy(false);
	}
}

async function createSpine(
	dataCache: Map<string, any>,
	inflight: Map<string, Promise<any>>,
	failed: Map<string, Error>,
	bakeJob: BakeJob,
	overlay: BakeOverlay
): Promise<Spine> {
	const cachedError = failed.get(bakeJob.url);
	if (cachedError) {
		throw cachedError;
	}
	let spineData = dataCache.get(bakeJob.url);
	if (!spineData) {
		let pending = inflight.get(bakeJob.url);
		if (!pending) {
			overlay.log("Loading " + bakeJob.spine + "…");
			await waitFrames(1);
			pending = loadSpineData(bakeJob.spine, bakeJob.url, overlay).then((data) => {
				dataCache.set(bakeJob.url, data);
				return data;
			}).catch((err) => {
				const wrapped = err instanceof Error ? err : new Error(String(err));
				failed.set(bakeJob.url, wrapped);
				throw wrapped;
			}).finally(() => {
				inflight.delete(bakeJob.url);
			});
			inflight.set(bakeJob.url, pending);
		}
		spineData = await pending;
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

async function createSprite(loadedSheets: Set<string>, bakeJob: BakeJob, overlay: BakeOverlay): Promise<PIXI.Sprite> {
	const sheetUrl = bakeJob.spriteSheet as string;
	const frame = bakeJob.spriteFrame as string;
	if (!loadedSheets.has(sheetUrl)) {
		overlay.log("Loading " + sheetUrl + "…");
		await waitFrames(1);
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
		const timer = window.setTimeout(() => {
			loader.reset();
			reject(new Error("Timed out fetching " + url + " after " + (LOAD_TIMEOUT_MS / 1000) + "s"));
		}, LOAD_TIMEOUT_MS);
		loader.add("symbols_img", url);
		loader.load((_ldr, resources) => {
			window.clearTimeout(timer);
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

function loadSpineData(name: string, url: string, overlay: BakeOverlay): Promise<any> {
	return (async () => {
		const jsonUrl = url;
		const atlasUrl = url.replace(/\.json(\?.*)?$/i, ".atlas$1");
		overlay.log("  fetching " + name + ".json");
		const json = JSON.parse(await fetchText(jsonUrl));
		overlay.log("  fetching " + name + ".atlas");
		const atlasText = await fetchText(atlasUrl);
		const pages = atlasPageNames(atlasText);
		if (!pages.length) {
			throw new Error("No PNG page listed in " + atlasUrl);
		}
		const textures: { [page: string]: PIXI.Texture } = {};
		const folder = url.replace(/[^/]+$/, "");
		for (const page of pages) {
			overlay.log("  fetching " + page);
			textures[page] = await fetchTexture(folder + page);
		}
		overlay.log("  parsing " + name);
		const atlas = new TextureAtlas(atlasText, (line: string, done: (baseTexture: PIXI.BaseTexture) => void) => {
			const tex = textures[line] || textures[line.replace(/^.*[\\/]/, "")];
			if (!tex) {
				throw new Error("Atlas asked for image that was not fetched: " + line);
			}
			done(tex.baseTexture);
		});
		const parser = new SpineParser();
		const jsonParser = parser.createJsonParser() as unknown as {
			readSkeletonData: (atlas: TextureAtlas, data: unknown) => unknown;
		};
		const spineData = jsonParser.readSkeletonData(atlas, json);
		if (!spineData) {
			throw new Error("No spineData on " + name);
		}
		return spineData;
	})();
}

function atlasPageNames(atlasText: string): string[] {
	const pages: string[] = [];
	const blocks = atlasText.replace(/\r/g, "").split("\n\n");
	for (const block of blocks) {
		const first = block.trim().split("\n")[0];
		if (first && /\.(png|jpe?g|webp)$/i.test(first)) {
			pages.push(first.trim());
		}
	}
	return pages;
}

async function fetchText(url: string): Promise<string> {
	const response = await fetchWithTimeout(url);
	return response.text();
}

async function fetchTexture(url: string): Promise<PIXI.Texture> {
	const response = await fetchWithTimeout(url);
	const blob = await response.blob();
	const objectUrl = URL.createObjectURL(blob);
	try {
		const image = await loadImage(objectUrl);
		return PIXI.Texture.from(image);
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Image decode failed"));
		image.src = src;
	});
}

async function fetchWithTimeout(url: string): Promise<Response> {
	const controller = new AbortController();
	const timer = window.setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			signal: controller.signal,
			cache: "no-store"
		});
		if (!response.ok) {
			throw new Error(url + " HTTP " + response.status);
		}
		return response;
	} catch (err) {
		if (err instanceof Error && err.name === "AbortError") {
			throw new Error("Timed out fetching " + url + " after " + (LOAD_TIMEOUT_MS / 1000) + "s");
		}
		throw err;
	} finally {
		window.clearTimeout(timer);
	}
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
