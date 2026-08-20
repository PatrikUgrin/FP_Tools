import * as PIXI from "pixi.js";
import { Ticker } from "pixi.js";
import { Group, Tween, now, update } from "@tweenjs/tween.js";
import { Scene } from "../scenes/Scene";
import { SpineController } from "../spine/SpineController";
import { screenResizeHandler } from "../window/screenResizeHandler";
import { UIHandler } from "../window/UIHandler";
import { fpaudio } from "../globals/audio/fpaudio";
import { FPNetwork } from "./FPNetwork";
import { fp_loading } from "./fp_loading";
import { spin } from "../reelspin/BaseGame/spin";
import { effect } from "../effects/effects";
import { fp_error } from "./fp_error";
import { fpEmmiterController } from "../effects/particles/fpEmmiterController";
import { zoomShift } from "../effects/zoomShift";
import { log } from "./dev/log";
import { SPIN_EVENT, UI_EVENT } from "./events";
import { performance_tracker } from "./dev/performance_tracker";
import { SlowMotion } from "../effects/SlowMotion";
import { ggGroup } from "./time/ggGroup";
import { MasterTicker } from "./time/MasterTicker";
import { ggTicker } from "./time/ggTicker";
import { RealTimeTicker } from "./time/RealTimeTicker";
import { rand } from "./numbers/rand";
import { SpineEventCatch } from "../spine/SpineEventCatch";
import { watcher } from "./dev/watcher";

//CONSTANTS

export enum INTERRUPT_TYPE{
	HELP,
	STOP,
	ERROR,
	GAME_WIN
}

export enum QLOG{
	click_SPIN,
	click_MUTE,
	click_HELP,
	click_MENU,
	click_TURBO,
	click_AUTOPLAY
}


//fpglobals is for spin timings
export enum FG_SPIN_TYPE{
	NORMAL,	 		//normal play
	SHORT_EXTENDED, //short extended play (last spin)
	EXTENDED, 		//extended play (last spin)
	EXTENDED_FAST, 	//extended play (last spin)
	FAST, 			//fast play
	FAST_STOP,		//fast play with stop (button spam)
	
	CATCHBOOST,		//catchboost spin
}


export class fpglobals{
	static sym_x : number = 252; //126 is half
	static sym_y : number = 168; //84 is half
	static grid_x : number = 5;
	static grid_y : number = 6;	
	static playfield_low_limit = 4; //fpglobals and higher num is low depth
	
	//fpglobals padding is actual padding for the grid
	//		padding for the grid			x y
	static grid_padding : PIXI.Point = new PIXI.Point(500,300 + 10);
	static grid_padding_horizontal : PIXI.Point = new PIXI.Point(500,300 + 10);
	static grid_padding_vertical : PIXI.Point = new PIXI.Point(300,500);
	//fpglobals padding moves grid
	static grid_outside_padding : PIXI.Point = new PIXI.Point(
		0, // X
		0, // Y
	);
	static background_offset : PIXI.Point = new PIXI.Point(0,0);
	
	public static delta_fpglobals_frame : number = 0;
	public static delta_tracker : performance_tracker;
	
	public static SlowMotion: SlowMotion;
	public static realTimeTicker: RealTimeTicker;
	public static randInstance: rand;
	
	//	1200   800 pixels @ 200x200
//	private static content_size : PIXI.Point = new PIXI.Point( //TODO add offsets or just have scaling
//		fpglobals.grid_x * fpglobals.sym_x + fpglobals.grid_padding.x,
//		fpglobals.grid_y * fpglobals.sym_y + fpglobals.grid_padding.y
//		);
	
	static getContentSize(withPadding = false){
		if(withPadding == false){
			return new PIXI.Point(
				fpglobals.grid_x * fpglobals.sym_x,
				fpglobals.grid_y * fpglobals.sym_y
			);
		}
		return new PIXI.Point( //TODO add offsets or just have scaling
		fpglobals.grid_x * fpglobals.sym_x + (fpglobals.grid_padding.x *2),
		fpglobals.grid_y * fpglobals.sym_y + (fpglobals.grid_padding.y*2)
		);
	}
	
	public static current_view : "vertical" | "horizontal" = "horizontal";
	
	
	
	//static content_padding : PIXI.Point = new PIXI.Point(200,200);
	//REal chaning value
	static content_to_screen : number = 1.0; //relative scale that can be tweened
	//Offset value
	static content_to_screen_effect : number = 0.05; //relative scale for tweenening
	//offset value
	static pixel_offset_effect : PIXI.Point = new PIXI.Point(0,0); //relative pixel offset for tweenening effects
	
	static GApp : PIXI.Application;
	public static FPScene : Scene;
	public static _DEBUG_ = true;
	public static reelMask : PIXI.Graphics;
//	public static _USE_DEPRECATED_LOADER_ = false; //deprecated setting
	public static IS_PAUSED = false;
	public static SRH_SCALAR : screenResizeHandler | undefined = undefined;
	public static ZoomShift : zoomShift;
	public static Basket_AllAtOnce = true; //whether all fishes combine in at once or one by one 
	
	public static URIparams : string[];
	
	public static UIEE : PIXI.utils.EventEmitter; //for general purpose events
	public static SpinEE : PIXI.utils.EventEmitter; //for spin elements (bg change, etc)
	
	public static log_spine_animations = false;
	public static log_audio_events = false; //all audio play/stop actions
	
	public static log_overlay_animation_logging = true;
	
	//performance related
	public static MAX_FPS = 0; //subject to change imo
	public static perf_ANIMATE_MASK = true;
	public static perf_WEED_EFFECT = false;
	public static perf_SPINE_WEED_EFFECT = true;
	public static perf_LIMIT_FRAMERATE = false;	//limit framerate (60fps on native 90/120/144)
	public static perf_overlay = false; //TODO fps/delta overlay
	
	//performance dynamic resolution
	public static perf_dynamic_resolution = false;
	public static perf_dynamic_resolution_min = 1.000;
	public static perf_dynamic_resolution_max = 1.0000;
	
	public static perf_log_frametimes = false;
	public static perf_LIMIT_FPS_ANIM_NUMS = true; //limit framerate on animated numbers
	public static perf_LIMIT_FPS_SPINE = false; //limit framerate on spine animations
	public static perf_ZOOMSHIFT_EFFECT = true;
	
	//perf spine pool settings
	public static perf_PRELOAD_SPINE = false;
	public static perf_SPINE_KEEP_ALIVE = false; //deprecated setting
	public static perf_DEBUG_ALWAYS_NEW_SPINE = false; //Enable/Disable pooling
	
	public static isSlowMotionEnabled: boolean = true;//Not working
	
	public static dbg_setGridOverSpinning = false;
	
	//tickers
	static masterTicker : MasterTicker;
	public static _preloading_ticker : PIXI.Ticker;
	public static _preloading_group : Group;
	public static _ticker : PIXI.Ticker;
	public static _GROUP : ggGroup; //general animation group for tweens, TODO
	
	static _UI_ticker : PIXI.Ticker;
	
	static _ANIMATED_NUMS_TICKER : PIXI.Ticker;
	static _ANIMATED_NUMS_GROUP : Group;
	
	static _BG_COMP_GROUP : Group;
	
	static _SPINE_TICKER : PIXI.Ticker;
	static _SPINE_GROUP : Group;
	
	static _AUDIO_TICKER : Ticker;
	static _AUDIO_GROUP : Group;
	
	
	
	
	//customObjects
	public static objEachFrame_GameWin : any = null;
	
	
	public static setApplyFramerateSettingsToTicker(ticker : Ticker, maxFPS = fpglobals.MAX_FPS){
		ticker.maxFPS = maxFPS;
		//ticker.minFPS = maxFPS;
		ticker.speed = 1;
		ticker.maxFPS = maxFPS; //ANIMATION TICKER TIME
	}
	
	public static createTicker(param : number){
		switch(param){
			case -2: // Create the real-time ticker that won't be affected by slow motion
				fpglobals.realTimeTicker = RealTimeTicker.instance;
				fpglobals.realTimeTicker.add(watcher.onEachFrame);
				return fpglobals.realTimeTicker.ticker;
			case -1: //pre loading ticker
				fpglobals._preloading_ticker = new PIXI.Ticker();
				if(fpglobals.perf_LIMIT_FRAMERATE){
					fpglobals.setApplyFramerateSettingsToTicker(fpglobals._preloading_ticker);
				}
				fpglobals._preloading_group = new Group();
				fpglobals._preloading_ticker.add(fpglobals.eachFrame_PreLoading);
				fpglobals._preloading_ticker.start() //standalone
				return fpglobals._preloading_ticker;
			case 0: //general FE ticker
				if(fpglobals._ticker != undefined){return fpglobals._ticker;}
				fpglobals._ticker = new PIXI.Ticker();
				if(fpglobals.perf_LIMIT_FRAMERATE){
					fpglobals.setApplyFramerateSettingsToTicker(fpglobals._ticker);
				}
				//fpglobals._GROUP = new ggGroup();
				//is created in MasterTicker
				fpglobals._ticker.add(()=>{
					fpglobals._GROUP.update(fpglobals.masterTicker.last_scaled_time);
				});
				MasterTicker.addTicker(fpglobals._ticker);
				return fpglobals._ticker;
			case 1: //CLOCK / UI ticker
				fpglobals._UI_ticker = new PIXI.Ticker();
				if(fpglobals.perf_LIMIT_FRAMERATE){
					fpglobals.setApplyFramerateSettingsToTicker(fpglobals._UI_ticker); //accuracy on 60
				}
				fpglobals._UI_ticker.add(UIHandler.eachTick);
				MasterTicker.addTicker(fpglobals._UI_ticker);
				return fpglobals._UI_ticker;
			case 3: //ANIM NUMBERS
				fpglobals._ANIMATED_NUMS_TICKER = new PIXI.Ticker();
				if(fpglobals.perf_LIMIT_FPS_ANIM_NUMS){
					fpglobals.setApplyFramerateSettingsToTicker(fpglobals._ANIMATED_NUMS_TICKER, 60);
				}
				fpglobals._ANIMATED_NUMS_GROUP = new Group();
				fpglobals._ANIMATED_NUMS_TICKER.add(()=>{
					fpglobals._ANIMATED_NUMS_GROUP.update(fpglobals.masterTicker.last_scaled_time);
				});
				MasterTicker.addTicker(fpglobals._ANIMATED_NUMS_TICKER);
				return fpglobals._ANIMATED_NUMS_TICKER;
			case 4: //SPINE TICKER
				fpglobals._SPINE_TICKER = new PIXI.Ticker();
				if(fpglobals.perf_LIMIT_FPS_SPINE){
					fpglobals.setApplyFramerateSettingsToTicker(fpglobals._SPINE_TICKER, 60);
				}
				fpglobals._SPINE_GROUP = new Group();
				fpglobals._BG_COMP_GROUP = new Group();
				
				MasterTicker.addTicker(fpglobals._SPINE_TICKER);
				//TODO make spine ticker separate update function
				//it will be triggered by beforeRender
				//fpglobals way spine will always be updated before rendering
				
				//each frame update group
				fpglobals._SPINE_TICKER.add(fpglobals.eachFrame_Spine);
				fpglobals._SPINE_TICKER.add(()=>{
					fpglobals._SPINE_GROUP.update(fpglobals.masterTicker.last_scaled_time);
					fpglobals._BG_COMP_GROUP.update(fpglobals.masterTicker.last_scaled_time);
				});
				//fpglobals._SPINE_TICKER.speed = 2;
				return fpglobals._SPINE_TICKER;
			case 5: //AUDIO TICKER
				fpglobals._AUDIO_TICKER = new PIXI.Ticker();
				if(fpglobals.perf_LIMIT_FPS_SPINE){
					fpglobals.setApplyFramerateSettingsToTicker(fpglobals._AUDIO_TICKER, 60); //TODO higher accuracy?
				}
				fpglobals._AUDIO_GROUP = new Group();
				
				//each frame update group
				fpglobals._AUDIO_TICKER.add(()=>{
					fpglobals._AUDIO_GROUP.update(fpglobals.masterTicker.last_scaled_time);
				});
				MasterTicker.addTicker(fpglobals._AUDIO_TICKER);
				return fpglobals._AUDIO_TICKER;
		}
		return undefined;
	}
	public static getTicker(param : number){
		switch(param){
			case -2:
				return fpglobals.realTimeTicker?.ticker;
			case -1:
				return fpglobals._preloading_ticker;
			case 0:
				return fpglobals._ticker;
			case 1:
				return fpglobals._UI_ticker;
			case 3:
				return fpglobals._ANIMATED_NUMS_TICKER;
			case 4:
				return fpglobals._SPINE_TICKER;
			case 5:
				return fpglobals._AUDIO_TICKER;
		}
		return undefined;
	}
	public static getLoader(){
		return PIXI.Loader;
	}
	public static getLoaderLoadingInPercent(){
		return PIXI.Loader.shared.progress;
	}
	
	
	public static ClickLog(msg : QLOG){ //global log
		fpglobals.GLog("CLICK:" + msg.toString());
	}
	
	public static GLog(msg : any, verbosity = log.type.INFO){ //global log
		return log.log(msg, verbosity);
	}
	
	//LOGS//////////////////////////////////////////////////////////////////////////////
	
	//That parameter is a number in "how many frames passed at 60fps".
	// 	 	1 means you are running at 60 fps.
	// 		2 means you are running at 30fps.
	public static eachFrame(ticker : ggTicker){
		let delta = ticker.deltaMS;
		let elapsed = ticker.elapsedMS;
		let _delta = ticker.deltaMS;
		
		try {
			update(); //tween.js update
		} 
		catch (e: any) {
			console.error('Error in update function:', e);
		}
		
		try{
			if(fpglobals.delta_tracker){
				if(fpglobals.FPScene){
					effect.eachFrameUpdateAllEffects(delta); //update effects
					if(fpglobals.perf_log_frametimes){
						let fps = fpglobals.delta_tracker.RecordDelta(elapsed); //record delta
						if(fps!= "NaN"){
							fpglobals.FPScene.fps_text.text = fps.toString() + "ms";
						}
					}
				}
			}
			fpEmmiterController.updateAll(delta); //update particles
		}
		catch(e:any){
			fpglobals.GLog(e, log.type.ERROR);
			fp_error.onerror(e.toString() + "fpglobals.eachFrame");
		}
	}
	
	private static eachFrame_PreLoading(fps:number){
		const Tick = fpglobals._preloading_ticker;
		const delta = Tick.deltaMS;	//ACTUAL DELTA FOR ANIMATION (not frame time)
		const elapsed = Tick.elapsedMS;
		const _delta = Tick.deltaMS;
		fpglobals._preloading_group.update();
	}
	
	
	private static eachFrame_Spine(fps:number){
		if(fpglobals.IS_PAUSED){return;}
		const delta = fpglobals._SPINE_TICKER.deltaMS;
		const elapsed = fpglobals._SPINE_TICKER.elapsedMS;
		SpineController.symbol_pool.update(delta / 1000.0);
		SpineController.other_pool.update(delta / 1000.0);
		SpineEventCatch.update();
	}
	
	
	
	
	// SAFETY BLOCKERS ETC
	public static getCanWeSpin(){
		if(fpglobals.IS_PAUSED){return false;}
		return fpglobals.getCanWeInteract();//TODO -> better logic (BET/BET downing ETC)
	}
	public static getCanWeInteract(){ //spin button
		if(fp_loading.IS_LOADING){return false;}
		if(UIHandler.ALL_PLAY_INPUT_BLOCK){return false;}
		
		//generally if game is paused for one reason or another, we can't interact
		//if(fpglobals.IS_PAUSED){return false;}
		
		return true;//TODO
	}
	
	
	// PAUSE UNPAUSE
	public static PAUSE_GAME(type : INTERRUPT_TYPE){
		fpglobals.IS_PAUSED = true;
		
		// Pause the MasterTicker which will affect all tickers
		fpglobals.masterTicker.stop();
		
		// For backwards compatibility, still pause individual tickers
		const fpglobalsTick = fpglobals.getTicker(0);
		if(fpglobalsTick){
			fpglobalsTick.stop();
		}
		
		if(type == INTERRUPT_TYPE.ERROR){
			fpglobals._UI_ticker.stop();
		}
		
		SpineController.PAUSE_SPINE_PLAYERS(type); //deprecated
		fpaudio.PAUSE_ALL(type);
		effect.PAUSE_ALL(type);
		
	}
	
	public static RESUME_GAME(type : INTERRUPT_TYPE){
		fpglobals.IS_PAUSED = false;
		
		// Resume the MasterTicker which will affect all tickers
		fpglobals.masterTicker.start()
		
		SpineController.RESUME_SPINE_PLAYERS(); //deprecated
		fpaudio.RESUME_ALL();
		effect.RESUME_ALL(type);
	}
	
	public static getURIParams(search : string){ {
		// Remove the leading '?' from the search string
		const searchParams = search.slice(1);
		// Split the search string into an array of key-value pairs
		return searchParams.split('&');
		}
	}
	public static getURIParamValue(param : string) : boolean | string{
		if(fpglobals.URIparams == null){
			//TODO log some error
			fpglobals.URIparams = fpglobals.getURIParams(window.location.search);
		}
		
		for(let i = 0; i < fpglobals.URIparams.length; i++){
			if(fpglobals.URIparams[i].includes(param)){
				let split = fpglobals.URIparams[i].split('=');
				if(split.length < 2){ return true; }
				if(split[0] == param){
					return split[1];
				}
			}
		}
		return false;
	}
	
	public static FastPlayToggle(){
		if(UIHandler.FASTPLAY){
			// Use the new setTimescale method for consistency
			fpglobals.setTimescale(2);
		}else{
			// Use the new setTimescale method for consistency
			fpglobals.setTimescale(1);
		}
	}
	
	/**
	 * Set the global timescale for all tickers
	 * @param value The new timescale value (1.0 is normal speed)
	 */
	public static setTimescale(value: number): void {
		// Set timescale on MasterTicker which will affect all tickers
		fpglobals.masterTicker.timescale = value;
		
		// For backwards compatibility, also set individual ticker speeds
		const speedValue = Math.max(0.01, value);
		fpglobals._SPINE_TICKER.speed = speedValue;
		fpglobals._ANIMATED_NUMS_TICKER.speed = speedValue;
		fpglobals._ticker.speed = speedValue;
		fpglobals.GApp.ticker.speed = speedValue;
		
		// Note: We don't adjust AudioScheduler's timing as it uses setTimeout 
		// which operates in real time, independently of the game's time scale
	}
	
}

