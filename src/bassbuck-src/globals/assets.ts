import { lib_symbols, fish_symbol,weed_symbol, blank_symbol, lib_bonus_symbols, basket_symbol, fish_values, lib_bonus_symbols_blur, catchboost_symbol, fullsweep_symbol, dropshot_symbol, collector_symbol, boat_symbol } from "../reelspin/SpinDataset";
import { fp_error } from "./fp_error";
import { log } from "../globals/dev/log";
import { Container, Graphics, Loader, LoaderResource, Point, Renderer, RenderTexture, Texture, TYPES } from "pixi.js";
import { gfxsym } from "../reelspin/Symbol/Core/GraphicSymbol";
import { SymbolFactory } from "../reelspin/Symbol/Core/SymbolFactory";
import { MotionBlurFilter } from "pixi-filters";
import { fpglobals } from "./fpglobals";
import { SpineCounter } from "../reelspin/WinElements/SpineCounter";
import { SymbolProperty } from "../reelspin/Symbol/Core/SymbolProperty";
import { downloadTextureAsImage } from "./Macro";
import { Translations } from "./text/translations";


//interface connecting symbol name to symbol resource name
export interface SymbolResource{
	symbol_name : string;
	symbol_res : string;
	symbol_res_noblur : string;
}

const extra_fish_qualifier = "";

export const feature_sym_res : Array<SymbolResource> = [ //FISH: plus _green for outside playfield
	//feature symbols:
	//F, B, C, PC, WD, WF, CB, PCB, BL
	//F is Fish, has cash value attached to it
	{	symbol_name : "f1",
		symbol_res : "1_b"+extra_fish_qualifier,
		symbol_res_noblur : "1"+extra_fish_qualifier
	},
	{	symbol_name : "f2",
		symbol_res : "2_b"+extra_fish_qualifier,
		symbol_res_noblur : "2"+extra_fish_qualifier
	},
	{	symbol_name : "f3",
		symbol_res : "3_b"+extra_fish_qualifier,
		symbol_res_noblur : "3"+extra_fish_qualifier
	},
	{	symbol_name : "f5",	
		symbol_res : "5_b"+extra_fish_qualifier,
		symbol_res_noblur : "5"+extra_fish_qualifier
	},
	{	symbol_name : "f10",
		symbol_res : "10_b"+extra_fish_qualifier,
		symbol_res_noblur : "10"+extra_fish_qualifier
	},
	{	symbol_name : "f25",
		symbol_res : "25_b"+extra_fish_qualifier,
		symbol_res_noblur : "25"+extra_fish_qualifier
	},
	{	symbol_name : "f50",
		symbol_res : "50_b"+extra_fish_qualifier,
		symbol_res_noblur : "50"+extra_fish_qualifier
	},
	{	symbol_name : "f100",
		symbol_res : "100_b"+extra_fish_qualifier,
		symbol_res_noblur : "100"+extra_fish_qualifier
	},
	{	symbol_name : "f250",
		symbol_res : "250_b"+extra_fish_qualifier,
		symbol_res_noblur : "250"+extra_fish_qualifier
	},
	{	symbol_name : "f500",
		symbol_res : "500_b"+extra_fish_qualifier,
		symbol_res_noblur : "500"+extra_fish_qualifier
	},
	{	symbol_name : "f1000",
		symbol_res : "1000_b"+extra_fish_qualifier,
		symbol_res_noblur : "1000"+extra_fish_qualifier
	},
	{	symbol_name : "f2000",
		symbol_res : "2000_b"+extra_fish_qualifier,
		symbol_res_noblur : "2000"+extra_fish_qualifier
	},
	{	symbol_name : "b",
		symbol_res : "b.png",
		symbol_res_noblur : "b"
	},
	{	symbol_name : "c",
		symbol_res : "c_b",//because theyre gen->added to cache, we ignore .png
		symbol_res_noblur : "c"
	},
	{	symbol_name : "c_off",
		symbol_res : "c_off.png",
		symbol_res_noblur : "c"
	},
	{	symbol_name : "wd",
		symbol_res : "wd.png",
		symbol_res_noblur : "wd.png"
	},
	{	symbol_name : "wf",
		symbol_res : "wf.png",
		symbol_res_noblur : "wf.png"
	},
	{	symbol_name : "cb_off",
		symbol_res : "cb_off",
		symbol_res_noblur : "cb"
	},
	{	symbol_name : "cb",
		symbol_res : "cb_b",//because theyre gen->added to cache, we ignore .png
		symbol_res_noblur : "cb"
	},
	{	symbol_name : "ds", //dropshot
		symbol_res : "ds_b", //because theyre gen->added to cache, we ignore .png
		symbol_res_noblur : "ds"
	},
	{	symbol_name : "fs", //fullsweep
		symbol_res : "fs_b",//because theyre gen->added to cache, we ignore .png
		symbol_res_noblur : "fs"
	},
	{	symbol_name : "ctr", //truck
		symbol_res : "ctr_b",
		symbol_res_noblur : "ctr"
	},
	{	symbol_name : "sp", //six pack
		symbol_res : "sp_b",
		symbol_res_noblur : "sp"
	},
	{	symbol_name : "ob", //old boot
		symbol_res : "ob_b",
		symbol_res_noblur : "ob"
	},
	{	symbol_name : "bo", //boat
		symbol_res : "bo_b",
		symbol_res_noblur : "bo"
	},
	{	symbol_name : "sp_off", //six pack
		symbol_res : "sp_off.png",
		symbol_res_noblur : "sp_off.png"
	},
	{	symbol_name : "bl",
		symbol_res : "bl_b",
		symbol_res_noblur : "bl.png"
	}
	//IMPORTANT NOTE
	//ending with .png is drawn from texture packer
	// NOT ending with .png means its drawn from texture cache 
];

export function getFeatureSpriteName(
	symbol : string,
	blur : boolean,
	high : boolean,
	cashValue : number = -1,
	used = false //used means we need _off frame
	) : string
	//symbol input can be either "f" or straight up "f5" with value
	{
	symbol = symbol.toLocaleLowerCase();
	let toSearchSymbol = symbol.substring(0, symbol.length);
	if(symbol == fish_symbol.toLocaleLowerCase()){
		toSearchSymbol = symbol + cashValue;
	}
	
	if(used){ //this should already be filtered to non pers supporting syms
		toSearchSymbol += "_off";
	}
	
	let toRet = "";
	let found = false;
	
	for(let i = 0; i < feature_sym_res.length; i++){
		if(toSearchSymbol == feature_sym_res[i].symbol_name){
			if(blur){
				toRet = feature_sym_res[i].symbol_res;
			}else{
				toRet = feature_sym_res[i].symbol_res_noblur;
			}
			found = true;
			break;
		}
	}
	if(found){
		if(symbol[0] == fish_symbol.toLocaleLowerCase()){
			if(!high){
//				if(!blur){
					toRet += "_green";
//				}
			}
		}
		return toRet;
	}
	
	fp_error.onerror("getFeatureSpriteName() : symbol not found : " + symbol + " cashValue : " + cashValue + " blur : " + blur.toString() + " | toSearchSymbol : " + toSearchSymbol);
	return "bl.png";
}




export const sym_res = [
//	"L1",   "L2",   "L3",   "L4", //CARDS
	"l1", "l2", "l3", "l4", //CARDS
//  "H1", "H2", "H3", "H4", //ICON
	"h1", "h2", "h3", "h4", //ICON
	"f",//fish
	"b",//basket
	"sw",//small wild
	"lw",//large wild
	"c",//collector
	"wf",//WEED
	"wf",//weed fish
	"tr",//Truck
	"sp",//sixpack
	"bo",//boat
	"ob",//old boot
	"lb",//lucky old boot
//	"Winbox"//BLANK empty
	
	//Same entries will pop up warning in console, but it is ok because we will replace them later
]





export function getAssets(lowResMode : boolean) : any[] {
	
	let res = "";
	if(lowResMode){
		res = "@0.5x";
	}
	
	let assets = [
		//anim properties
		{name : "basket_anim_props", url : "./anim_props.json"},
		
		//images
		{name : "background_1", url : "./images/background_images_0"+res+".json"}, //TODO only one?
		{name : "background_2", url : "./images/background_images_1"+res+".json"},
		
		{ name: "splah_screen_img", url: "./images/bootimg.jpg" },
		
		{ name: "playfield_bg", url: "./images/playfield_bg.png" },
		{ name: "playfield_pkg", url: "./images/playfield_components"+res+".json"}, //used in spine is fake news for now
		
		{ name : "symbols", url: "./images/symbols/symbols_img.json"},
		
		//{ name : "symbols_highlow", url: "./images/symbols/high_low_symbols.json"},
		
		{ name : "symbol_bass", url: "./images/symbols/bass.json"},
		
		{ name : "win_init_tiles", url: "./images/win_init_tiles"+res+".json"},
		
		//effects
	//	{name : "displacement_map", url: "./effects/displacement_map_repeat.jpg"},
		
		////FONT
		//{ name: "font2", url:"https://fonts.googleapis.com/css?family=Roboto"},
		//{ name: "font1", url: "https://fonts.googleapis.com/css2?family=Rowdies:wght@300;400;700&display=swap"},
		
	//	{ name: "font_barlow", url: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"},
		{ name: "font_barlow", url: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,500;1,800&display=swap"},
		
		
		{ name: "nums_medium", url: "./images/bmf_medium_nums.json"},
		{ name: "nums_collect", url: "./images/bmf_collect.json"},
		{ name: "nums_hits", url: "./images/bmf_nums_hits.json"},
		
		//particles
		//picture
		{ name: "bubble", url: "./particles/bubble50px.png"},
		// bubbles background
		{ name: "bubbles_bg", url: "./particles/bubbles_background.json"},
		//bubbles symbol, medium instesity
		{ name: "bubble_sym_med", url: "./particles/bubbles_symbol_med.json"},
		
		//Coins - particles
		{ name: "coingg", url: "./particles/coingg_particles.json"},
		//Coins - spritesheet
		{ name: "coingg_ss", url: "./particles/coingg.json"},
		
		{ name: "leaf_particle", url: "./particles/leaf_particle.json"},
		{ name: "leaf_particle_textures", url: "./particles/leaf_particle_textures.json"},
		
		
		//external basic animations 
		{ name: "exanims", url: "./exanim.json"},
		
		{name : "bigwin_props", url : "./bigwin_props.json"},
		
		//{name : "eff_pngs", url : "./images/eff_pngs.json"},
		{name : "eff_jpgs", url : "./images/eff_jpgs"+res+".json"},
		
		
		{name : "lunker_wave_lunkers", url : "./images/lunker_wave_lunkers_.json"},
		

		{name : "translations", url : "./translations.json", onComplete : function(obj : any){
			Translations.getInstance().init(obj.url);
		}},
	]


	//Push assets that are multipack here
//	if(!lowResMode){
//		assets.push({name : "background_2", url : "./images/background_images_1"+res+".json"},
//		);
//	}



	return assets;
}
export const assets_audio = [
	//audio
	{ name : "mainaudio_sprite", url : "./audio/mainaudio.json", audiourl: "./audio/mainaudio.mp3"	},
	//{ name : "mainaudio", 		url : "./audio/mainaudio.mp3" 	},
]

export const assets_video = [
	{ name: "intro_video", url: "./video/intro_video.mp4"},
]

export const assets_demo = [
	//audio
	//{name : "games_local", url : "games.json"},
	//{name : "games", url : "games.json"},
	{name : "gameslibrary", url : "./games/gameslibrary.json", crossOrigin : true},
	{name : "devdesc", url : "./games/feature_seed_mapping.txt"},
	
	
]
export const assets_demo_localhost = [
	//audio
	//{name : "games_local", url : "games.json"},
	//{name : "games", url : "games.json"},
	//{name : "gameslibrary", url : "D:/2022_DUprojects/fp_sim/games/gameslibrary.json", localStorage : true},
	{name : "gameslibrary", url : "./games/gameslibrary.json", crossOrigin : true},
	{name : "devdesc", url : "./games/feature_seed_mapping.txt"},
	
	
//	//test buttons
//	{name : "btn_left", url : "./images/button_left.png"},
//	{name : "btn_right", url : "./images/button_right.png"},
]

export function getAssetsSpine(lowResMode : boolean) : any[] {
	
	const spineMeta = lowResMode
		? { spineAtlasSuffix: '@0.5x.atlas' }
		: {};
	
	return [
	{name : "spine_counter_props", url: "./spine_counter_props.json", crossOrigin: true
		, onComplete : function(obj : any){
			SpineCounter.parseSpineCounterProperties(obj.data);
		}
	}, //Spine Counter Properites
	{name : "counter", url: "./spine/animated_numbers.json", crossOrigin: true, metadata: spineMeta}, // counter
	
//	{ name: "spine_wf", url: "./spine/inert_cash_sym.json", crossOrigin: true}, //SPINE SKELETON
	
	{ name: "spine_bonus_transition", url: "./spine/bonus_end_transition.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON

	{ name: "spine_hilo", url: "./spine/hilo_sym.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON for all high low symbols
	
	{ name: "spine_wild", url: "./spine/wild.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	//{ name: "spine_sw", url: "./spine/sw.json", crossOrigin: true}, //SPINE SKELETON
	//{ name: "spine_lw", url: "./spine/lw.json", crossOrigin: true}, //SPINE SKELETON
	
    { name: "spine_f", url: "./spine/cash_sym.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
    { name: "spine_plusonespin", url: "./spine/plusonespin.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
    { name: "spine_b", url: "./spine/b.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
    { name: "spine_bo", url: "./spine/bo.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
    { name: "spine_lb", url: "./spine/luckyboot_sym.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
    { name: "spine_buck_symbol", url: "./spine/buck_sym.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
    
	{ name: "spine_trail_example", url: "./spine/trail_example.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON TEST
    
    { name: "spine_ctr", url: "./spine/ctr.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
    { name: "spine_sp", url: "./spine/sp.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
    { name: "spine_beer", url: "./spine/beer.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
	{ name: "wlines", url: "./spine/wlines.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
	{ name: "vortex", url: "./spine/vortex.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
//	{ name: "spine_benchmark", url: "./spine/benchmark.json", crossOrigin: true}, //SPINE SKELETON
	
	{ name: "spine_bigwin", url: "./spine/big_win.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
//	{name : "buck_main", url : "./spine/buck_full.json", crossOrigin: true}, //character spine skeleton

	{ name: "spine_quick_effect", url: "./spine/qeff.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
	{ name: "spine_counter_left", url: "./spine/bonus_spin_counter.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	{ name: "spine_counter_right", url: "./spine/counter_total_win.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	{ name: "spine_hit_counter", url: "./spine/counter_hits.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	{ name: "spine_background", url: "./spine/background_ambience.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
	{ name: "spine_lunker_wave_scene", url: "./spine/lunker_wave_scene.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	{ name: "spine_lunker_wave_bass", url: "./spine/lunker_wave_bass.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
	{ name: "spine_catchboost_start_vfx", url: "./spine/catchboost_start_vfx.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
	//{ name: "spine_title_screen", url: "./spine/title_screen.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	{ name: "spine_logo", url: "./spine/logo.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
	
	//bonus_info_background
	{ name: "spine_bonus_info_title_scenes", url: "./spine/bonus_info_title_scenes.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
	//{ name: "spine_bonus_info_scenes", url: "./spine/bonus_info_scenes.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	{ name: "spine_bonus_info_slide", url: "./spine/bonus_info_slide.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
	{name : "spine_ui_button", url: "./spine/ui_button.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	{name : "spine_ui_slider", url: "./spine/bonus_info_ui.json", crossOrigin: true, metadata: spineMeta}, //SPINE SKELETON
	
	];
}


export function generateSymbolBlurAssetsForLoad(
	renderer : Renderer, symbols: Array<string>,
	cashvalues: Array<number>, green = false){
	let symprop : SymbolProperty = {preview : true, ScatterProperty : null, Used : false, NumProp : null};
	for(let i = 0; i < symbols.length; i++){
		if(symbols[i] == basket_symbol){continue;}
		let sym = SymbolFactory.getNewSymbol(symbols[i], new Point(0,0), cashvalues[i], true, true, symprop);
		if(green){
			sym.isInsidePlayfield = false;
			sym.setSymbolSprite();
		}
	
		let tex = generateSymbolBlur(renderer, sym);
		
		let texname = sym.LibSym.toLocaleLowerCase()+"_b";
		if(sym.LibSym == fish_symbol){
			texname = sym.cashvalue.toString()+"_b";
			if(green){
				texname += "_green";
			}
		}
		(tex as any).name = texname;
		// Add the texture directly to PIXI's texture cache
		Texture.addToCache(tex, texname);
		
		sym.destroy();
	}
	emptyFilterTexturePool(renderer);
}
export function generateBonusSymbolAssetsForLoad(
	renderer : Renderer, symbols: Array<string>,
	 cashvalues: Array<number>, useCashValueAsTexName = false, animType = "static_appear"){
	let symprop : SymbolProperty = {preview : true, ScatterProperty : null, Used : false, NumProp : null};
	for(let i = 0; i < symbols.length; i++){
		//if(symbols[i] == catchboost_symbol){}
		//else if(symbols[i] == fullsweep_symbol)	{}
		//else if(symbols[i] == dropshot_symbol)	{}
		//else if(symbols[i] == collector_symbol)	{}
		//else {continue;}
		let texname = symbols[i].toLowerCase();
		if(animType == "static_appear"){
			texname += "_appear";
		}
		let cashvalue = 0;
		if(i < cashvalues.length){
			cashvalue = cashvalues[i];
		}
		
		let sym = SymbolFactory.getNewSymbol(symbols[i], new Point(0,0), cashvalue, false, true, symprop);
		sym._spine_static_spin = animType;
		if(animType == "static_appear_green"){
			sym.isInsidePlayfield = false;
		}
		sym.setSymbolSprite();

		let tex = generateSymbolPreview(renderer, sym);
		
		if(useCashValueAsTexName){
			texname = cashvalue.toString();
			if(animType == "static_appear_green"){
				texname += "_green"; 
			}
		}
		(tex as any).name = texname;
		
		sym.destroy();
		
	//	if(sym.LibSym.toLocaleLowerCase() == "sw" || sym.LibSym.toLocaleLowerCase() == "lw"){
	//		downloadTextureAsImage(tex, texname + ".png", renderer);
	//	}
		// Add the texture directly to PIXI's texture cache
		Texture.addToCache(tex, texname);
	}
}

export function generateSymbolTextureAssetsForDeactivated(renderer : Renderer, symbols : Array<string>, boat_multiplier = false){
	let symprop : SymbolProperty = {preview : true, ScatterProperty : null, Used : true, NumProp : null};
	let boat_mp_value = 1;
	for(let i = 0; i < symbols.length; i++){
		let libsym = symbols[i];
		let addToTexName = "";
		if(libsym.toLowerCase() == boat_symbol.toLowerCase() && boat_multiplier){
			addToTexName = "_" + boat_mp_value.toString();
			symprop.NumProp = boat_mp_value;
			if(boat_mp_value < 3){
				boat_mp_value++;
				i--;
			}
		}

		let sym = SymbolFactory.getNewSymbol(libsym, new Point(0,0), 0, false, true, symprop);
		let tex = generateSymbolPreview(renderer, sym);
		let texname = sym.LibSym.toLowerCase()+"_deactivated" + addToTexName;
		(tex as any).name = texname;
		
	//	if(sym.LibSym.toLocaleLowerCase() == "bo"){
	//		downloadTextureAsImage(tex, texname + ".png", renderer);
	//	}
		Texture.addToCache(tex, texname);
		
		sym.destroy();
	}
}


export function generateBonusSymbolAssetsForInfo( //deprecated / kept for reference or downloadable images
	renderer : Renderer, symbols: Array<string>, animType = "static_info"){
	
	let symprop : SymbolProperty = {preview : true, ScatterProperty : null, Used : false, NumProp : null};
	for(let i = 0; i < symbols.length; i++){
		//if(symbols[i] == catchboost_symbol){}
		//else if(symbols[i] == fullsweep_symbol)	{}
		//else if(symbols[i] == dropshot_symbol)	{}
		//else if(symbols[i] == collector_symbol)	{}
		//else {continue;}
		let texname = symbols[i].toLowerCase();
		let sym = SymbolFactory.getNewSymbol(symbols[i], new Point(0,0), 0, false, true, symprop);
		sym._spine_static_spin = animType;
		sym.setSymbolSprite();
		
		
		let fillColor = 0x8B0000;
		let outlineColor = 0x5C0000;
		if(symbols[i] == catchboost_symbol){
			fillColor = 0x9B30FF; outlineColor = 0x6A0DAD;
		} else if(symbols[i] == fullsweep_symbol){
			fillColor = 0x4488FF; outlineColor = 0x2255AA;
		} else if(symbols[i] == collector_symbol){
			fillColor = 0xFF4444; outlineColor = 0xAA1111;
		} else if(symbols[i] == dropshot_symbol){
			fillColor = 0x44CC44; outlineColor = 0x228822;
		}
		const bg = new Graphics();
		//bg.lineStyle(3, outlineColor, 1);
		bg.beginFill(fillColor, 0.0);
		bg.drawRoundedRect(-fpglobals.sym_x / 2, -fpglobals.sym_y / 2, fpglobals.sym_x, fpglobals.sym_y * 2, 16);
		bg.endFill();
		sym.addChildAt(bg, 0);
		
		let tex = generateSymbolPreview(renderer, sym);
		
		(tex as any).name = texname;
		
		sym.destroy();
		
	//	if(sym.LibSym.toLocaleLowerCase() == "sw" || sym.LibSym.toLocaleLowerCase() == "lw"){
	//		downloadTextureAsImage(tex, texname + ".png", renderer);
	//	}
		// Add the texture directly to PIXI's texture cache
		Texture.addToCache(tex, texname);
	}
}
	
	

// Baked spin frames are cached for the whole session. Always bake at 1x — using renderer.resolution
// (often 2) made every preview/blur target 4x the pixels, and Spine getLocalBounds() can be huge.
const SYMBOL_BAKE_RESOLUTION = 1;
const SYMBOL_BLUR_PAD = 64;
let sharedMotionBlurFilter: MotionBlurFilter | null = null;

function getSharedMotionBlurFilter(): MotionBlurFilter {
	if(!sharedMotionBlurFilter){
		sharedMotionBlurFilter = new MotionBlurFilter([0,15],5);
	}
	return sharedMotionBlurFilter;
}

function emptyFilterTexturePool(renderer : Renderer){
	const filterSystem = (renderer as any).filter;
	if(filterSystem && typeof filterSystem.emptyPool === "function"){
		filterSystem.emptyPool();
	}
}

export function generateSymbolBlur(renderer : Renderer, symbol : Container){
	//Symbols is already assembled in symbol : container
	//We add a filter with parameters to the symbol
	//We render the symbol to a texture
	//we save the texture in loader resources
	
	const bounds = symbol.getLocalBounds();
	let width = Math.max(bounds.width, fpglobals.sym_x) + SYMBOL_BLUR_PAD * 2;
	let height = Math.max(bounds.height, fpglobals.sym_y) + SYMBOL_BLUR_PAD * 2;
	width = Math.min(Math.ceil(width), fpglobals.sym_x * 2 + SYMBOL_BLUR_PAD * 2);
	height = Math.min(Math.ceil(height), fpglobals.sym_y * 2 + SYMBOL_BLUR_PAD * 2);
	
	const blurFilter = getSharedMotionBlurFilter();
	symbol.filters = [blurFilter];
	
	// Filters must be rendered into a target that matches the renderer resolution.
	const renderTexture = RenderTexture.create({
		width: width,
		height: height,
		resolution: renderer.resolution || 1
	});
	
	// Save position and reset it temporarily for rendering
	const originalX = symbol.x;
	const originalY = symbol.y;
	symbol.x = renderTexture.width / 2;  // Center in the render texture
	symbol.y = renderTexture.height / 2;
	
	renderer.render(symbol, { renderTexture });
	
	// Restore original position
	symbol.x = originalX;
	symbol.y = originalY;
	
	symbol.filters = null;
	return renderTexture;
}
export function generateSymbolPreview(renderer : Renderer, symbol : Container){
	//Symbols is already assembled in symbol : container
	//We render the symbol to a texture
	//we save the texture in loader resources

	const bounds = symbol.getLocalBounds();

	// Measure how far content extends from the symbol origin (cell centre)
	const left = -bounds.x;
	const right = bounds.x + bounds.width;
	const top = -bounds.y;
	const bottom = bounds.y + bounds.height;

	let width = 2 * Math.max(left, right, fpglobals.sym_x / 2);
	let height = 2 * Math.max(top, bottom, fpglobals.sym_y / 2);

	// Cap oversized VFX slots so a single bake cannot allocate a 1k+ render target
	width = Math.min(Math.ceil(width), fpglobals.sym_x * 2);
	height = Math.min(Math.ceil(height), fpglobals.sym_y * 2);

	const renderTexture = RenderTexture.create({
		width: Math.max(1, width),
		height: Math.max(1, height),
		resolution: SYMBOL_BAKE_RESOLUTION
	});
	
	// Place symbol origin at texture centre (matches anchor 0.5 on the grid)
	const originalX = symbol.x;
	const originalY = symbol.y;
	symbol.x = width / 2;
	symbol.y = height / 2;
	
	renderer.render(symbol, { renderTexture });
	
	// Restore original position
	symbol.x = originalX;
	symbol.y = originalY;
	
	//downloadTextureAsImage(renderTexture, "symbol_preview.png", renderer);
	
	return renderTexture;
}


/**
 * Wraps PIXI.Loader.shared.load() with a fallback mechanism for @0.5x assets.
 *
 * Regular assets: if the URL contains "@0.5x" and fails, retry without it.
 *
 * Spine assets: the JSON has no @0.5x variant — only the atlas/png do.
 * pixi-spine names atlas sub-resources as "<spine_name>_atlas".
 * When a @0.5x atlas fails, we retry the entire parent spine resource
 * without the spineAtlasSuffix so the default .atlas is loaded instead.
 */
export function loadWithLowResFallback(
	loader: Loader,
	callback: () => void
): void {
	const failedLowRes: Map<string, string> = new Map();
	const failedSpineParents: Map<string, { url: string; crossOrigin: boolean }> = new Map();

	loader.onError.add((_error: any, _loader: Loader, resource: LoaderResource) => {
		if (!resource.url || !resource.url.includes('@0.5x')) { return; }

		const isSpineAtlas = resource.name.endsWith('_atlas');

		if (isSpineAtlas) {
			const parentName = resource.name.replace(/_atlas$/, '');
			const parentResource = loader.resources[parentName];
			if (parentResource) {
				failedSpineParents.set(parentName, {
					url: parentResource.url,
					crossOrigin: !!parentResource.crossOrigin
				});
				log.log(
					`Spine atlas '${resource.name}' failed with @0.5x, will retry '${parentName}' at full res`,
					log.type.WARNING
				);
			}
		} else {
			const fallbackUrl = resource.url.replace(/@0\.5x/g, '');
			failedLowRes.set(resource.name, fallbackUrl);
			log.log(
				`Asset '${resource.name}' failed with @0.5x, will retry full res: ${fallbackUrl}`,
				log.type.WARNING
			);
		}
	});

	loader.load(() => {
		const hasRegularRetries = failedLowRes.size > 0;
		const hasSpineRetries = failedSpineParents.size > 0;

		if (!hasRegularRetries && !hasSpineRetries) {
			callback();
			return;
		}

		log.log(
			`Retrying ${failedLowRes.size} regular + ${failedSpineParents.size} spine asset(s) at full resolution...`,
			log.type.WARNING
		);

		failedLowRes.forEach((_url, name) => {
			delete loader.resources[name];
		});
		failedLowRes.forEach((url, name) => {
			loader.add(name, url);
		});

		failedSpineParents.forEach((_info, parentName) => {
			delete loader.resources[parentName + '_atlas'];
			delete loader.resources[parentName];
		});
		failedSpineParents.forEach((info, parentName) => {
			loader.add({ name: parentName, url: info.url, crossOrigin: info.crossOrigin });
		});

		loader.load(() => {
			callback();
		});
	});
}


///////////////////////////// SAFARI ////////////////////////////////////////

export const assets_safari = [
//    { name: "background", url: "./images/bg.png" },
//	{ name: "tsyms_image", url: "./images/safari/tsyms.jp2" },
  //  { name: "tsyms", url: "./images/safari/tsyms.json" },
]
export const assets_spine_safari = [
//	{ name: "tumble_test_image", url: "./images/safari/tumble_test.jp2"},
//	//{ name: "tumble_test_image", url: "./images/tumble_test.webp"},
  //  { name: "tumble_test", url: "./images/safari/tumble_test.json", crossOrigin: true},
]


