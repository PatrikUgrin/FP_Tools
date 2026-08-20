let no_cache = true;


// Add these meta tags programmatically at the start of your code
function addNoCacheMeta() {
    const metaTags = [
        ['Cache-Control', 'no-cache, no-store, must-revalidate'],
        ['Pragma', 'no-cache'],
        ['Expires', '0']
    ];
    
    metaTags.forEach(([name, content]) => {
        const meta = document.createElement('meta');
        meta.setAttribute('http-equiv', name);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
    });
}
if(no_cache){
// Call this before any other initialization
	addNoCacheMeta();
}



import * as PIXI from "pixi.js";
import { Loader } from "pixi.js";
import { WebfontLoaderPlugin } from "pixi-webfont-loader";
import { Tween } from "@tweenjs/tween.js";
import { ggTween } from "./globals/time/ggTween";
import { assets_safari,
	 assets_demo, assets_audio,
	 assets_demo_localhost, generateSymbolBlurAssetsForLoad, generateBonusSymbolAssetsForLoad,
	 generateSymbolTextureAssetsForDeactivated,
	 getAssets, getAssetsSpine, loadWithLowResFallback,
	 generateBonusSymbolAssetsForInfo
	} from './globals/assets';
import { screenResizeHandler } from './window/screenResizeHandler';
import { fpglobals } from './globals/fpglobals';
import { SOUND_TYPE, fpaudio } from './globals/audio/fpaudio';
import { wDOME } from './window/wDOME';
import { UIHandler } from './window/UIHandler';
import { fp_loading, LOADING_TYPE } from './globals/fp_loading';
import { FPNetwork } from './globals/FPNetwork';
import { devpanel } from "./globals/dev/devpanel";
import { lw_sort_devpanel } from "./globals/dev/lw_sort_devpanel";
import { InputMaster } from "./globals/InputMaster";
import { fp_error } from "./globals/fp_error";
import { log } from "./globals/dev/log";
import { timing } from "./reelspin/timing/timing";
import { UI_EVENT } from "./globals/events";
import { exanim } from "./exanim";
import { basket_symbol, collector_symbol,plusonespin_symbol, fullsweep_symbol, fish_symbol, fish_values, lib_bonus_symbols, lib_bonus_symbols_blur, lib_symbols, dropshot_symbol, catchboost_symbol, sixpack_symbol, boat_symbol, largewild_symbol, smallwild_symbol, luckyboot_symbol, truck_symbol } from "./reelspin/SpinDataset";
import { Renderer } from "pixi.js";
import { MasterTicker } from "./globals/time/MasterTicker";
import { SpineController } from "./spine/SpineController";
import { SoundDirector } from "./globals/audio/SoundDirector";
import { installSpineLoadErrorContext } from "./spine/spine_load_errors";

// Enrich pixi-spine load-time errors (e.g. missing atlas regions) with resource name/url.
installSpineLoadErrorContext();

// Must run once before any Loader.shared usage (parses font_barlow Google Fonts CSS).
Loader.registerPlugin(WebfontLoaderPlugin);


// Cap DPR so a 3x/4x display does not allocate 9x/16x pixels on the canvas and render textures.
// Keep this in lockstep with Application.resolution — PIXI.settings.RESOLUTION is the default for new textures.
const APP_RESOLUTION = Math.min(window.devicePixelRatio || 1, 2);
PIXI.settings.RESOLUTION = APP_RESOLUTION; //https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
// Disable interpolation when scaling, will make texture be pixelated

PIXI.settings.SORTABLE_CHILDREN = false;

// Optional: Lower precision for mobile to save memory/battery
// 'highp' is risky on older iOS devices and consumes more shader resources.
// 'mediump' is usually sufficient for 2D games.
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
PIXI.settings.PRECISION_FRAGMENT = isMobile ? PIXI.PRECISION.MEDIUM : PIXI.PRECISION.HIGH;
PIXI.settings.PRECISION_VERTEX   = isMobile ? PIXI.PRECISION.MEDIUM : PIXI.PRECISION.HIGH;


window.onerror = function(message, source, lineno, colno, error) {
	let mainMessage = error?.message ?? String(message);
	let location = "";
	if(source){
		location = "Source: " + source + " [" + lineno + ":" + colno + "]";
	}
	fp_error.onerror(location ? mainMessage + " | " + location : mainMessage);
};
  
const app = new PIXI.Application({
	view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
	//resolution: 1,
	autoStart: true,
	resolution: APP_RESOLUTION,//1.2),
	autoDensity: true,
	//backgroundColor: 0x000000, //black background
	//WIDTH AND HEIGHT DYNAMICALLY CHANGES
	width: fpglobals.getContentSize(true).x , //focus area
	height: fpglobals.getContentSize(true).y ,
	backgroundAlpha : 1,
	powerPreference : "high-performance",
	//resizeTo: document.body,
});

//PIXI.settings.PRECISION_FRAGMENT = 	PIXI.PRECISION.HIGH;
//PIXI.settings.PRECISION_VERTEX = 	PIXI.PRECISION.HIGH;
PIXI.settings.SCALE_MODE = 			PIXI.SCALE_MODES.LINEAR;
PIXI.settings.STRICT_TEXTURE_CACHE = true;
PIXI.settings.ROUND_PIXELS = false;
PIXI.settings.PREFER_ENV = PIXI.ENV.WEBGL2;
PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.OFF;
PIXI.settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = true;

// Leave Pixi defaults (AUTO, 3600 frames). A short GC_MAX_IDLE unloads atlases on the title,
// then re-uploads the whole set the moment the game renders — higher GPU, not lower.
//PIXI.settings.GC_MODE = 			PIXI.GC_MODES.AUTO;
//PIXI.settings.GC_MAX_IDLE = 		5;

(globalThis as any).__PIXI_APP__ = app; // eslint-disable-line
//if debug enabled, add timing reference to globalThis
//if(devpanel.DEMO_MODE){

export const debug = {
	timing,
	timingConst: timing,
	fpglobals,
	screenResizeHandler,
	exanim,
	// Add more as needed
}; // eslint-disable-line
	
	// In your main file
(globalThis as any).__debug__ = debug; // eslint-disable-line
//



let params = fpglobals.getURIParams(window.location.search);
fpglobals.URIparams = params;

fpglobals.UIEE = new PIXI.utils.EventEmitter();
fpglobals.SpinEE = new PIXI.utils.EventEmitter();

let lowResMode = fpglobals.getURIParamValue("mobile") == "true" || fpglobals.getURIParamValue("mobile") == true;

if(lowResMode){
	PIXI.settings.SCALE_MODE = 			PIXI.SCALE_MODES.NEAREST;
}

let time = 0.0;
//set time to be current time in most precise way¸

time = performance.now();

let deltaAmounts = 0;
let deltaSum = 0;

let all_deltas = new Array<number>();


app.renderer.on('prerender', () => {
	//console.log("prerender");
	
	time = performance.now();
});
app.renderer.on('postrender', () => {
//code for stutter hunting
	//		//console.log("postrender");
	//		if(fp_loading.IS_LOADING){return;}
	//		if(true){return;}
//
	//		//get difference between time and date.now()
	//		let delta = performance.now() - time;
	//		//console.log("delta: " + delta);
	//		deltaSum += delta;
	//		deltaAmounts++;
//
	//		fpglobals.delta_this_frame = delta;
	//		all_deltas.push(delta);
//
	//		if(deltaAmounts > 1000){
	//			fpglobals.GLog("============ AVERAGE DELTA RESET ============", log.type.PERFORMANCE);
	//			fpglobals.GLog("AVERAGE DELTA: " + (deltaSum / deltaAmounts) + " ms", log.type.PERFORMANCE); //time it takes to render a frame in ms
	//			
	//			let delta_top_10perc;
	//			//get top 10% in all_deltas
	//			all_deltas.sort(function(a, b){return b-a});
	//			delta_top_10perc = all_deltas.slice(0, Math.floor(all_deltas.length * 0.1));
	//		//		fpglobals.GLog("TOP 10% DELTA: " + (delta_top_10perc.reduce((a, b) => a + b, 0) / delta_top_10perc.length) + " ms", log.type.PERFORMANCE); //time it takes to render a frame in ms
	//			
	//			//get top 1% in all_deltas
	//			delta_top_10perc = all_deltas.slice(0, Math.floor(all_deltas.length * 0.01));
	//		//		fpglobals.GLog("TOP 1% DELTA: " + (delta_top_10perc.reduce((a, b) => a + b, 0) / delta_top_10perc.length) + " ms", log.type.PERFORMANCE); //time it takes to render a frame in ms
	//			
	//			//get top 0.1% in all_deltas
	//			delta_top_10perc = all_deltas.slice(0, Math.floor(all_deltas.length * 0.001));
	//		//		fpglobals.GLog("TOP 0.1% DELTA: " + (delta_top_10perc.reduce((a, b) => a + b, 0) / delta_top_10perc.length) + " ms", log.type.PERFORMANCE); //time it takes to render a frame in ms
	//			
	//			deltaSum = 0;
	//			deltaAmounts = 0;
	//			all_deltas = new Array<number>();
	//		}
});

fpglobals.GApp = app;
app.stage.sortableChildren = true; //https://github.com/pixijs/pixijs/blob/dev/packages/display/src/Container.ts

let loaded_audio = false;

devpanel.setMode(window.location.href);
wDOME.collectAllElementsBeforeLoad(); //collect all pages
fpglobals.masterTicker = new MasterTicker();
fpglobals.masterTicker.app = app;
//app.renderer.on('prerender', () => {
	//fpglobals.masterTicker.update();
	fpglobals.masterTicker.start();
	app.ticker.add(fpglobals.masterTicker.update.bind(fpglobals.masterTicker));
//});
fpglobals.createTicker(1); //create clock/UI ticker
fpglobals.createTicker(3); //create animatedNumber ticket


fp_loading.SetupLoadingScreen(document); //setup loading screen

let audio_loaded = false;
let video_ended = false;

const on_finished_video = function(){
	if(video_ended){return;}
	video_ended = true;
	
	let loading_cover = document.getElementById(UIHandler.id_loading_splash);
	if(loading_cover){
		loading_cover.style.visibility = 'visible';
	}
	PIXI.Loader.shared.reset();
	PIXI.Loader.shared.concurrency = 20;
	
	//console.log(Spine);
	
	//this is called when loader finishes loading
	const on_finished_loading = function(){
		//parse audio sprite
		
		if(devpanel.isLocalHost()){
			PIXI.Loader.shared.add(assets_demo_localhost);
		}else{
			PIXI.Loader.shared.add(assets_demo);
		}
		//on loading done, init devpanel
		PIXI.Loader.shared.onComplete.once(() => {
			devpanel.init();
			InputMaster.parseGamesList();
			fp_loading.DEMOMODE_ALL_LOADING_DONE_SET(true);
			app.renderer.view.addEventListener('pointerdown', function(event) {
				fpglobals.UIEE.emit(UI_EVENT.TOUCH_ANY);
			});
			SpineController.initSymbolPool();
			SpineController.initOtherPool();
			//add all fish values to the loader
			generateSymbolBlurAssetsForLoad(
				fpglobals.GApp.renderer as Renderer,
				fish_values.map(val => fish_symbol),
				fish_values.map(val => parseInt(val))
			); 
			//generate symbol blur assets for load
			//remove fish symbol and basket symbol
			let symbols = lib_bonus_symbols_blur.filter(sym => sym !== basket_symbol);
			//let symbols = lib_bonus_symbols_blur.filter(sym => sym !== fish_symbol && sym !== basket_symbol);
			let cashvalues = symbols.map(sym => 0);
			//add all symbols to the loader except fish
			generateSymbolBlurAssetsForLoad(
				fpglobals.GApp.renderer as Renderer,
				symbols,
				cashvalues
			);
			generateBonusSymbolAssetsForLoad(
				fpglobals.GApp.renderer as Renderer,
				fish_values.map(val => fish_symbol),
				fish_values.map(val => parseInt(val)),
				true
			);
			generateBonusSymbolAssetsForLoad(
				fpglobals.GApp.renderer as Renderer,
				fish_values.map(val => fish_symbol),
				fish_values.map(val => parseInt(val)),
				true,
				"static_appear_green"
			);
			generateBonusSymbolAssetsForLoad(
				fpglobals.GApp.renderer as Renderer,
				symbols.concat([largewild_symbol, smallwild_symbol,
					"l1", "l2", "l3", "l4",
					"h1", "h2", "h3", "h4"
				]),
				cashvalues,
				false,
				"static_appear"
			);
			generateBonusSymbolAssetsForLoad(
				fpglobals.GApp.renderer as Renderer,
				symbols.concat([
					//largewild_symbol, smallwild_symbol,
					"l1", "l2", "l3", "l4",
					"h1", "h2", "h3", "h4"
				]),
				cashvalues,
				false,
				"static_spin"
			);
			generateSymbolTextureAssetsForDeactivated(
				fpglobals.GApp.renderer as Renderer,
				[
					collector_symbol,
					fullsweep_symbol,
					dropshot_symbol,
					catchboost_symbol,
					sixpack_symbol,
					boat_symbol,
					luckyboot_symbol,
					plusonespin_symbol
				], true //for boat multiplier
			);
			generateSymbolBlurAssetsForLoad(
				fpglobals.GApp.renderer as Renderer,
				fish_values.map(val => fish_symbol),
				fish_values.map(val => parseInt(val)),
				true
			);
			
			let doInfoOutput = false;
			if(doInfoOutput){
				//BONUS INFO cards
				generateBonusSymbolAssetsForInfo(
					fpglobals.GApp.renderer as Renderer,
					[collector_symbol,truck_symbol, fullsweep_symbol, dropshot_symbol, catchboost_symbol, sixpack_symbol, boat_symbol, luckyboot_symbol, plusonespin_symbol],
					"static_info"
				);
			}
			
			
			if(devpanel.DEMO_MODE){
				// bass spine previews are now in Texture cache — refresh devpanel simulator
				lw_sort_devpanel.refreshTextures();
			}
			
		});
		FPNetwork.DEMOConnectLocalNetwork();
		if(!audio_loaded){
			fpaudio.parseAudioFileAndCreateHowler(finished_audio_load_callback);
		}
		exanim.parseExanims();
		if(audio_loaded){
			finished_audio_load_callback();
		}
	}

	//this is called when audio(howler) finishes loading
	const finished_audio_load_callback = function(){
		SoundDirector.startSplashAudio();
		fp_loading.try_start_games(LOADING_TYPE.ASSETS);
	}
	
	if(!audio_loaded){
		PIXI.Loader.shared.add(assets_audio);
	}
	
	let safari = false;
	if(safari){
		PIXI.Loader.shared.add(getAssetsSpine(lowResMode));
		PIXI.Loader.shared.add(assets_safari);
	}else{
		PIXI.Loader.shared.add(getAssetsSpine(lowResMode));
		PIXI.Loader.shared.add(getAssets(lowResMode));
	}
	if(devpanel.DEMO_MODE){
		//PIXI.Loader.shared.add(assets_demo);
	}
	//PIXI.Loader.shared.add(getSymbolAssetsForLoad());
	try{
		loadWithLowResFallback(PIXI.Loader.shared, on_finished_loading);
	} catch(e){
		fpglobals.GLog("ERROR LOADING ASSETS: " + e, log.type.ERROR);
	}
}

window.addEventListener('load', function() {
    setTimeout(function() {
        window.scrollTo(0, 1);
    }, 0);
});

let removeInProgress = false;

function removeVideo(instant = false){
	if(removeInProgress){return;}
	removeInProgress = true;
	let video : HTMLVideoElement | null = document.getElementById('video') as HTMLVideoElement;
	let overlay : HTMLVideoElement | null = document.getElementById('video_overlay') as HTMLVideoElement;
	let unmute : HTMLVideoElement | null = document.getElementById('unmute_button') as HTMLVideoElement;
	if(instant){
		if(video){
			video!.parentNode!.removeChild(video!);
		}
		if(overlay){
			overlay!.parentNode!.removeChild(overlay!);
		}
	}
	else{
		fpglobals.createTicker(-1);
		//fade out video and overlay
		if (video) {
			video.style.opacity = '1';
			let alpha = {alpha :1};
			let tween = new ggTween(alpha, fpglobals._preloading_group)
				.to({ alpha: 0 }, 2000)
				.onUpdate( () => {
					//console.log(alpha.alpha.toString());
					video!.style.opacity = alpha.alpha.toString();
				})
				.onComplete(function () {
					video!.parentNode!.removeChild(video!);
				})
				.start(fpglobals.masterTicker.last_scaled_time);
		}
		if(overlay){
			overlay!.parentNode!.removeChild(overlay!);
		}
	}
}

//TODO determine if we can display video
//if novideo is present, playVideo is false
//let playVideo = fpglobals.getURIParamValue("novideo") == false;
let playVideo = false;//fpglobals.getURIParamValue("novideo") == false;
if(playVideo){
	screenResizeHandler.application = app;
	PIXI.Loader.shared.add(assets_audio);
	PIXI.Loader.shared.load();
	PIXI.Loader.shared.onComplete.once(() => {
		//fpglobals.SRH_SCALAR = new screenResizeHandler(app);
		audio_loaded = true;
		fpaudio.parseAudioFileAndCreateHowler(() => { //TODO maybe do the same if no video, play audio before loading is done?
			fpaudio.ToggleMute(true);
			if(!fpaudio.getIsMuted()){
				fpaudio.PlaySound(SOUND_TYPE.splash_intro, false, 'loop');
			}
			//empty braces for scope
			{
				let video : HTMLVideoElement | null = document.getElementById('video') as HTMLVideoElement;
				let overlay : HTMLVideoElement | null = document.getElementById('video_overlay') as HTMLVideoElement;
				let unmute : HTMLVideoElement | null = document.getElementById('unmute_button') as HTMLVideoElement;
				if(video == null || overlay == null || unmute == null){
					//TODO log error
					removeVideo();
					on_finished_video();
					return;
				}
				video!.playsInline = true;
				video!.preload = 'metadata';
				video!.loop = false;
				video!.autoplay = false;
				video!.muted = true;
				video!.src = 'video/intro_video.mp4';
				
				
				//document.body.appendChild(video);
				video!.controls = false;
				
				const function_on_window_resize = function(){
					
					let toScale = screenResizeHandler.getLowestScale(
						new PIXI.Point(window.innerWidth, window.innerHeight),
						new PIXI.Point(video!.clientWidth, video!.clientHeight)
					);
					
					let windowAspect = window.innerWidth / window.innerHeight;
					let spriteAspect = video!.clientWidth / video!.clientHeight;
					
					let scalefactor = 1;
					
					if (windowAspect > 16 / 9) {
						// Window is wider than 16:9, scale based on width
						toScale = (window.innerWidth * scalefactor) / video!.clientWidth;
					} else if (windowAspect < 9 / 16) {
						// Window is taller than 9:16, scale based on height
						toScale = (window.innerHeight * scalefactor) / video!.clientHeight;
					} else {
						// Window aspect ratio is between 9:16 and 16:9, scale based on sprite aspect ratio
						if (windowAspect > spriteAspect) {
							toScale = (window.innerWidth * scalefactor) / video!.clientWidth;
						} else {
							toScale = (window.innerHeight * scalefactor) / video!.clientHeight;
						}
					}
					video!.style.scale = toScale.toString();
					//align video to center
					video!.style.position = 'absolute';
					video!.style.left = (window.innerWidth - video!.clientWidth) / 2 + 'px';
					video!.style.top = (window.innerHeight - video!.clientHeight) / 2 + 'px';
					
					
				}
				
				video!.ontimeupdate = function(){
					if(video!.currentTime > 0.1){
						function_on_window_resize();
					}
					if(video!.currentTime > 0.8){
						let loading_cover = document.getElementById(UIHandler.id_loading_splash);
						if(loading_cover){
							loading_cover.style.visibility = 'visible';
						}
						if(overlay){
							overlay.style.visibility = 'visible';
						}
						video!.ontimeupdate = null;
					}
				}
				
				
				window.addEventListener('resize', function_on_window_resize);
				window.addEventListener('orientationchange', function_on_window_resize);
				
				if(!fpaudio.getIsAudioUnlocked() && !fpaudio.getIsMuted()){
					unmute!.onclick = ()=> {
						unmute!.parentNode!.removeChild(unmute!);
						// Remove automatic unmuting on click
						//fpaudio.ToggleMute(false);
						
						let TrackLen = fpaudio.getTrackLength(SOUND_TYPE.splash_intro, true);
						let TrackStart = fpaudio.getTrackStartTime(SOUND_TYPE.splash_intro);
						let seekTo = (video!.currentTime*1000 + TrackStart) / 1000;
						fpaudio.setSeekPerType(SOUND_TYPE.splash_intro, seekTo);
						fpaudio.setFadeInPerType(SOUND_TYPE.splash_intro, 1000);
					};
				}else{
					unmute!.parentNode!.removeChild(unmute!);
				}
				
				video!.onended = function(){
	//				app.stage.removeChild(videoSprite);
					removeVideo(false);
					window.removeEventListener('resize', function_on_window_resize);
					window.removeEventListener('orientationchange', function_on_window_resize);
					on_finished_video();
				}
				
	//			videoSprite.interactive = true;
				video!.onclick = ()=> {
					if(!fpaudio.getIsAudioUnlocked()){
						//video.muted = false;
						let videoProgress = video!.currentTime / video!.duration;
		//						fpaudio.SetVolumePerType(SOUND_TYPE.ambient, 0.5);
						
						// Remove automatic unmuting on click
						//fpaudio.ToggleMute(false);
						
						let TrackLen = fpaudio.getTrackLength(SOUND_TYPE.splash_intro, true);
						let TrackStart = fpaudio.getTrackStartTime(SOUND_TYPE.splash_intro);
						//fpaudio.setSeekPerType(SOUND_TYPE.ambient, (videoProgress*TrackLen)/1000); //seeking, uncomment to seek test
						let seekTo = (video!.currentTime *1000 + TrackStart) / 1000;
						//seekTo = 13+12;//Math.round(seekTo); //seeking, uncomment to seek test
						fpaudio.setSeekPerType(SOUND_TYPE.splash_intro, seekTo);
						fpaudio.setFadeInPerType(SOUND_TYPE.splash_intro, 1000);
						unmute!.parentNode!.removeChild(unmute!);
						//return;
					}
					//app.stage.removeChild(videoSprite);
					removeVideo(false);
					window.removeEventListener('resize', function_on_window_resize);
					window.removeEventListener('orientationchange', function_on_window_resize);
					on_finished_video();
					
				};
				
				
				
				
				video!.play();
			}
			
			
		});
	});
}else{
	removeVideo(true);
	on_finished_video();
}




//https://stackoverflow.com/questions/44565671/ignore-ts6133-import-is-declared-but-never-used