import * as PIXI from "pixi.js";
import { Point, Renderer, RenderTexture, Sprite, Texture } from "pixi.js";
import { LunkerWaveSorter, LunkerWaveSortResult } from "../../reelspin/Feature/LunkerWave/lw_sort";
import { SDSym } from "../../reelspin/BaseGame/BGWin";
import { fish_values, fish_symbol } from "../../reelspin/SpinDataset";
import { generateBonusSymbolAssetsForLoad, getFeatureSpriteName } from "../assets";
import { fpglobals } from "../fpglobals";
import { rand } from "../numbers/rand";

// Lunker Wave Sort Simulator devpanel
// Drag-and-drop bass (fish) values onto the "to-sort" area, run the
// LunkerWaveSorter and visually animate the resulting waves.
export class lw_sort_devpanel{
	private static devpanel_html : any;
	
	// pending symbols the user has staged for sorting
	private static pending : Array<SDSym> = [];
	
	// counter just to give each staged chip a unique key/animation
	private static chip_counter = 0;
	
	// spine-rendered bass previews (value -> data URL), filled on demand
	private static preview_cache = new Map<number, string>();
	private static use_real_graphics = false;
	private static controls_bound = false;
	private static last_ran_seed : number | null = null;
	private static last_sort_seed = 0;
	
	public static init(devpanelDocument : any){
		this.devpanel_html = devpanelDocument;
		if(!this.controls_bound){
			this.bindControls();
			this.controls_bound = true;
		}
		// Textures are captured later in index.ts (after generateBonusSymbolAssetsForLoad).
		// Do not touch TextureCache here — Texture.from throws if the key is missing.
		this.buildPalette();
		this.renderPending();
		this.renderStats(null);
		this.clearWaves();
		this.updateGfxStatus();
	}
	
	// Called whenever the Lunker Wave tab is selected — same as pressing Load bass graphics.
	public static onTabActivated(){
		this.loadGraphics(false);
	}
	
	// Legacy hook from index.ts after global fish bake (pre-warm only, stays on emoji until tab/button).
	public static refreshTextures(){
		this.warmPreviewCache();
		this.updateGfxStatus();
	}
	
	// Load spine screenshots into chips; set forceRegenerate to rebuild from PIXI cache.
	public static loadGraphics(forceRegenerate : boolean = true){
		if(forceRegenerate){
			this.preview_cache.clear();
		}
		this.setGfxStatus("Loading bass graphics from texture cache…", "loading");
		
		const loadBtn = this.devpanel_html?.getElementById("lws-load-gfx-btn") as HTMLButtonElement | null;
		if(loadBtn) loadBtn.disabled = true;
		
		window.setTimeout(() => {
			try{
				if(!this.ensureFishTexturesInCache()){
					this.setGfxStatus("Graphics unavailable — game assets not ready yet. Try again shortly.", "error");
					this.useEmojiMode();
					return;
				}
				
				this.warmPreviewCache(forceRegenerate);
				const loaded = this.preview_cache.size;
				const total = fish_values.length;
				
				if(loaded === 0){
					const cacheKeys = Object.keys(PIXI.utils.TextureCache).filter(k =>
						fish_values.some(v => k === v || k === v + "_green")
					);
					fpglobals.GLog("lw_sort_devpanel: preview capture failed. Cache fish keys: " + cacheKeys.join(", "), 'WARNING');
					this.setGfxStatus("Could not capture bass previews. Use emoji or press Load again.", "error");
					this.useEmojiMode();
					return;
				}
				
				this.use_real_graphics = true;
				this.rebuildAllChips();
				this.setGfxStatus(`Graphics: ${loaded}/${total} bass loaded`, loaded >= total ? "ready" : "loading");
				fpglobals.GLog("lw_sort_devpanel: graphics mode (" + loaded + "/" + total + ")");
			}finally{
				if(loadBtn) loadBtn.disabled = false;
			}
		}, 50);
	}
	
	public static useEmojiMode(){
		this.use_real_graphics = false;
		this.rebuildAllChips();
		this.setGfxStatus("Graphics: emoji", "");
	}
	
	private static rebuildAllChips(){
		this.buildPalette();
		this.renderPending();
	}
	
	// ---------- Builders ----------
	
	private static buildPalette(){
		const palette = this.devpanel_html.getElementById("lws-palette") as HTMLElement | null;
		if(!palette) return;
		
		palette.innerHTML = '';
		
		fish_values.forEach((v) => {
			const value = parseInt(v);
			const chip = this.makeBassChip(value, true);
			chip.setAttribute('draggable', 'true');
			
			// drag start: stash the value on the dataTransfer
			chip.addEventListener('dragstart', (ev : DragEvent) => {
				if(!ev.dataTransfer) return;
				ev.dataTransfer.setData("text/plain", value.toString());
				ev.dataTransfer.effectAllowed = "copy";
				chip.classList.add('dragging');
			});
			chip.addEventListener('dragend', () => {
				chip.classList.remove('dragging');
			});
			
			// click to quick-add (handy for fast staging)
			chip.addEventListener('click', () => {
				this.addPending(value);
			});
			
			palette.appendChild(chip);
		});
	}
	
	private static bindControls(){
		const dropZone = this.devpanel_html.getElementById("lws-drop") as HTMLElement | null;
		if(dropZone){
			dropZone.addEventListener('dragover', (ev : DragEvent) => {
				ev.preventDefault();
				if(ev.dataTransfer) ev.dataTransfer.dropEffect = "copy";
				dropZone.classList.add('drag-over');
			});
			dropZone.addEventListener('dragleave', () => {
				dropZone.classList.remove('drag-over');
			});
			dropZone.addEventListener('drop', (ev : DragEvent) => {
				ev.preventDefault();
				dropZone.classList.remove('drag-over');
				if(!ev.dataTransfer) return;
				const raw = ev.dataTransfer.getData("text/plain");
				const value = parseInt(raw);
				if(isNaN(value)) return;
				if(fish_values.indexOf(value.toString()) === -1){
					// guard: only legal bass values may be added
					fpglobals.GLog("lw_sort_devpanel: rejected non-fish value " + raw, 'WARNING');
					return;
				}
				this.addPending(value);
			});
		}
		
		const sortBtn = this.devpanel_html.getElementById("lws-sort-btn") as HTMLElement | null;
		if(sortBtn){
			sortBtn.addEventListener('click', () => this.runSort());
		}
		
		const clearBtn = this.devpanel_html.getElementById("lws-clear-btn") as HTMLElement | null;
		if(clearBtn){
			clearBtn.addEventListener('click', () => {
				this.pending = [];
				this.chip_counter = 0;
				this.renderPending();
				this.clearWaves();
				this.renderStats(null);
			});
		}
		
		const randomBtn = this.devpanel_html.getElementById("lws-random-btn") as HTMLElement | null;
		if(randomBtn){
			randomBtn.addEventListener('click', () => {
				const count = 2 + Math.floor(Math.random() * 9);
				for(let i = 0; i < count; i++){
					const idx = Math.floor(Math.random() * fish_values.length);
					this.addPending(parseInt(fish_values[idx]), false);
				}
				this.renderPending();
			});
		}
		
		const loadGfxBtn = this.devpanel_html.getElementById("lws-load-gfx-btn") as HTMLElement | null;
		if(loadGfxBtn){
			loadGfxBtn.addEventListener('click', () => this.loadGraphics(true));
		}
		
		const emojiBtn = this.devpanel_html.getElementById("lws-emoji-btn") as HTMLElement | null;
		if(emojiBtn){
			emojiBtn.addEventListener('click', () => this.useEmojiMode());
		}
	}
	
	private static setGfxStatus(text : string, state : "" | "ready" | "loading" | "error"){
		const el = this.devpanel_html?.getElementById("lws-gfx-status") as HTMLElement | null;
		if(!el) return;
		el.textContent = text;
		el.classList.remove("ready", "loading", "error");
		if(state) el.classList.add(state);
	}
	
	private static updateGfxStatus(){
		if(this.use_real_graphics){
			const n = this.preview_cache.size;
			this.setGfxStatus(`Graphics: ${n}/${fish_values.length} bass loaded`, n >= fish_values.length ? "ready" : "");
		}else{
			this.setGfxStatus("Graphics: emoji (switch to this tab to load spine assets)", "");
		}
	}
	
	// ---------- Pending pool ----------
	
	private static addPending(value : number, rerender : boolean = true){
		const sym : SDSym = {
			libsym : fish_symbol,
			value : value,
			position : new Point(0, 0)
		};
		this.pending.push(sym);
		if(rerender) this.renderPending();
	}
	
	private static renderPending(){
		const drop = this.devpanel_html.getElementById("lws-drop") as HTMLElement | null;
		const count_el = this.devpanel_html.getElementById("lws-pending-count") as HTMLElement | null;
		if(!drop) return;
		
		// strip existing chips but keep the placeholder
		const existing = drop.querySelectorAll('.lws-chip');
		existing.forEach((n : Element) => n.remove());
		
		const placeholder = drop.querySelector('.lws-drop-placeholder') as HTMLElement | null;
		if(placeholder){
			placeholder.style.display = this.pending.length === 0 ? 'block' : 'none';
		}
		
		this.pending.forEach((sym, idx) => {
			const chip = this.makeBassChip(sym.value, false);
			chip.classList.add('lws-chip-enter');
			
			// click on a staged chip removes it
			chip.addEventListener('click', () => {
				this.pending.splice(idx, 1);
				this.renderPending();
			});
			drop.appendChild(chip);
		});
		
		if(count_el){
			count_el.textContent = this.pending.length.toString();
		}
	}
	
	// ---------- Sort + animate ----------
	
	private static applySortSeed(){
		const seedInput = this.devpanel_html.getElementById("lws-seed-input") as HTMLInputElement | null;
		const lockSeed = this.devpanel_html.getElementById("lws-lock-seed") as HTMLInputElement | null;
		
		let seed = seedInput ? parseInt(seedInput.value, 10) : 0;
		if(isNaN(seed)) seed = 0;
		
		const preventAutoSeed = lockSeed?.checked === true;
		if(!preventAutoSeed && this.last_ran_seed !== null && seed === this.last_ran_seed){
			seed = Math.floor(Math.random() * 1001);
		}
		
		if(!fpglobals.randInstance){
			fpglobals.randInstance = new rand(seed);
		}else{
			fpglobals.randInstance.reset(seed);
		}
		
		this.last_ran_seed = seed;
		this.last_sort_seed = seed;
		if(seedInput) seedInput.value = seed.toString();
	}
	
	private static runSort(){
		if(this.pending.length === 0){
			fpglobals.GLog("lw_sort_devpanel: nothing to sort", 'WARNING');
			return;
		}
		
		this.applySortSeed();
		
		// LunkerWaveSorter mutates its arrays internally, hand it shallow clones
		const symbols_add = this.pending.map(s => ({...s, position: new Point(0,0)} as SDSym));
		const symbols_deweed : Array<SDSym> = []; // not used by the sorter
		
		const result : LunkerWaveSortResult = LunkerWaveSorter.doSort(symbols_add, symbols_deweed);
		
		this.renderStats(result);
		this.animateWaves(result);
	}
	
	private static renderStats(result : LunkerWaveSortResult | null){
		const stats = this.devpanel_html.getElementById("lws-stats") as HTMLElement | null;
		if(!stats) return;
		
		if(result === null){
			const highCount = this.pending.filter(s => s.value > 10).length;
			const lowCount  = this.pending.length - highCount;
			const total     = this.pending.reduce((a, s) => a + s.value, 0);
			stats.innerHTML = `
				<span class="lws-stat">Staged: <b>${this.pending.length}</b></span>
				<span class="lws-stat lws-stat-high">High &gt;10: <b>${highCount}</b></span>
				<span class="lws-stat lws-stat-low">Low &le;10: <b>${lowCount}</b></span>
				<span class="lws-stat">Total Multiplier: <b>${total}</b>x</span>
				<span class="lws-stat lws-stat-muted">Waves: <b>—</b></span>
			`;
			return;
		}
		
		const allSymbols = [
			...result.getFirstWaveSymbols(),
			...result.getSecondWaveSymbols(),
			...result.getThirdWaveSymbols()
		].filter((s) => s != null);
		const total = result.getTotalWin().multiplier;
		const highCount = allSymbols.filter(s => s.value > 10).length;
		const lowCount = allSymbols.length - highCount;
			
		stats.innerHTML = `
			<span class="lws-stat">Staged: <b>${this.pending.length}</b></span>
			<span class="lws-stat lws-stat-high">High &gt;10: <b>${highCount}</b></span>
			<span class="lws-stat lws-stat-low">Low &le;10: <b>${lowCount}</b></span>
			<span class="lws-stat">Total Multiplier: <b>${total}</b>x</span>
			<span class="lws-stat lws-stat-ok">Waves: <b>${result.getWaveCount()}</b></span>
			<span class="lws-stat">Seed: <b>${this.last_sort_seed}</b></span>
		`;
	}
	
	private static clearWaves(){
		for(let i = 1; i <= 3; i++){
			const el = this.devpanel_html.getElementById("lws-wave-" + i) as HTMLElement | null;
			const sum = this.devpanel_html.getElementById("lws-wave-" + i + "-sum") as HTMLElement | null;
			if(el) el.innerHTML = '';
			if(sum) sum.textContent = '0x';
		}
		for(let i = 1; i <= 3; i++){
			const card = this.devpanel_html.getElementById("lws-wave-card-" + i) as HTMLElement | null;
			if(card){
				card.classList.remove('lws-wave-active');
				card.classList.add('lws-wave-disabled');
			}
		}
	}
	
	private static animateWaves(result : LunkerWaveSortResult){
		this.clearWaves();
		
		const waves = [
			result.getFirstWaveSymbols(),
			result.getSecondWaveSymbols(),
			result.getThirdWaveSymbols()
		];
		const waveCount = result.getWaveCount();
		
		// activate cards up to waveCount
		for(let i = 1; i <= waveCount; i++){
			const card = this.devpanel_html.getElementById("lws-wave-card-" + i) as HTMLElement | null;
			if(card){
				card.classList.remove('lws-wave-disabled');
				// small delay so the colour transition is visible
				setTimeout(() => card.classList.add('lws-wave-active'), i * 60);
			}
		}
		
		// stagger chip placement so each wave fills in turn, with a brief overlap
		const PER_CHIP_MS = 110;
		const PER_WAVE_GAP_MS = 250;
		let cursor = 200;
		
		for(let w = 0; w < waves.length; w++){
			const list = waves[w];
			const container = this.devpanel_html.getElementById("lws-wave-" + (w + 1)) as HTMLElement | null;
			const sumEl    = this.devpanel_html.getElementById("lws-wave-" + (w + 1) + "-sum") as HTMLElement | null;
			if(!container) continue;
			
			let runningSum = 0;
			list.forEach((sym, i) => {
				if(!sym) return;
				const delay = cursor + i * PER_CHIP_MS;
				setTimeout(() => {
					const chip = this.makeBassChip(sym.value, false);
					chip.classList.add('lws-chip-fly-in');
					if(sym.value > 10) chip.classList.add('lws-chip-high');
					container.appendChild(chip);
					
					runningSum += sym.value;
					if(sumEl) sumEl.textContent = runningSum + 'x';
				}, delay);
			});
			
			cursor += list.length * PER_CHIP_MS + PER_WAVE_GAP_MS;
		}
	}
	
	// ---------- Texture previews (from PIXI cache after init) ----------
	
	private static getFishTextureKey(value : number) : string {
		// same naming as generateBonusSymbolAssetsForLoad / getFeatureSpriteName
		const high = value > 10;
		return getFeatureSpriteName(fish_symbol, false, high, value);
	}
	
	private static getTextureCache() : Record<string, Texture | RenderTexture> {
		// PIXI stores baked symbols in utils.TextureCache (see Texture.addToCache in assets.ts)
		return PIXI.utils.TextureCache as Record<string, Texture | RenderTexture>;
	}
	
	private static areFishTexturesInCache() : boolean {
		const cache = this.getTextureCache();
		if(!cache) return false;
		// any fish preview from generateBonusSymbolAssetsForLoad is enough
		for(const v of fish_values){
			const n = parseInt(v);
			if(cache[n.toString()] || cache[n + "_green"]) return true;
		}
		return false;
	}
	
	// Never call Texture.from for missing keys — PIXI throws on cache miss.
	private static getCachedTexture(key : string) : Texture | RenderTexture | null {
		const tex = this.getTextureCache()[key];
		if(!tex) return null;
		const w = tex.width ?? (tex as any).frame?.width ?? 0;
		const h = tex.height ?? (tex as any).frame?.height ?? 0;
		if(w <= 0 || h <= 0) return null;
		return tex;
	}
	
	private static resolveFishTexture(value : number) : Texture | RenderTexture | null {
		const preferred = this.getFishTextureKey(value);
		const fallbacks : string[] = [preferred, value.toString(), value + "_green"];
		const seen = new Set<string>();
		for(const key of fallbacks){
			if(seen.has(key)) continue;
			seen.add(key);
			const tex = this.getCachedTexture(key);
			if(tex) return tex;
		}
		return null;
	}
	
	private static ensureFishTexturesInCache() : boolean {
		if(this.areFishTexturesInCache()) return true;
		
		const renderer = fpglobals.GApp?.renderer as Renderer | undefined;
		if(!renderer) return false;
		
		// same passes as index.ts — bake fish spine frames into TextureCache
		const libs = fish_values.map(() => fish_symbol);
		const vals = fish_values.map(v => parseInt(v));
		generateBonusSymbolAssetsForLoad(renderer, libs, vals, true);
		generateBonusSymbolAssetsForLoad(renderer, libs, vals, true, "static_appear_green");
		
		return this.areFishTexturesInCache();
	}
	
	private static warmPreviewCache(forceAll : boolean = false){
		const renderer = fpglobals.GApp?.renderer as Renderer | undefined;
		if(!renderer || !this.areFishTexturesInCache()) return;
		
		fish_values.forEach((v) => {
			const value = parseInt(v);
			if(!forceAll && this.preview_cache.has(value)) return;
			
			const tex = this.resolveFishTexture(value);
			if(!tex) return;
			
			const dataUrl = this.textureToDataUrl(tex, renderer);
			if(dataUrl){
				this.preview_cache.set(value, dataUrl);
			}
		});
	}
	
	private static textureToDataUrl(tex : Texture | RenderTexture, renderer : Renderer) : string | null {
		// Cached fish entries are RenderTextures from generateSymbolPreview — extract directly first.
		try {
			const canvas = renderer.extract.canvas(tex as Texture);
			const url = canvas.toDataURL('image/png');
			if(url && url.length > 100) return url;
		}catch(_e){ /* fall through */ }
		
		try {
			const sprite = new Sprite(tex as Texture);
			const bounds = sprite.getLocalBounds();
			const pad = 8;
			const w = Math.max(64, Math.ceil(bounds.width + pad * 2));
			const h = Math.max(64, Math.ceil(bounds.height + pad * 2));
			const rt = RenderTexture.create({ width: w, height: h });
			sprite.x = w / 2;
			sprite.y = h / 2;
			renderer.render(sprite, { renderTexture: rt });
			sprite.destroy();
			const canvas = renderer.extract.canvas(rt);
			rt.destroy();
			return canvas.toDataURL('image/png');
		}catch(e2){
			fpglobals.GLog("lw_sort_devpanel: texture extract failed: " + e2, 'WARNING');
			return null;
		}
	}
	
	private static appendChipVisual(chip : HTMLElement, value : number){
		const preview = this.use_real_graphics ? this.preview_cache.get(value) : undefined;
		if(preview){
			const thumb = document.createElement('img');
			thumb.className = 'lws-chip-thumb';
			thumb.src = preview;
			thumb.alt = value + 'x bass';
			thumb.draggable = false;
			chip.appendChild(thumb);
		}else{
			const icon = document.createElement('span');
			icon.className = 'lws-chip-icon';
			icon.textContent = '🐟';
			chip.appendChild(icon);
		}
		
		const label = document.createElement('span');
		label.className = 'lws-chip-value';
		label.textContent = value.toString() + 'x';
		chip.appendChild(label);
	}
	
	// ---------- Visual helpers ----------
	
	private static makeBassChip(value : number, isPalette : boolean) : HTMLElement {
		const chip = document.createElement('div');
		chip.className = 'lws-chip' + (isPalette ? ' lws-chip-palette' : '');
		if(value > 10) chip.classList.add('lws-chip-high');
		
		chip.dataset.value = value.toString();
		this.appendChipVisual(chip, value);
		chip.dataset.cid = (++this.chip_counter).toString();
		
		return chip;
	}
}
