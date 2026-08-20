import { Scene } from "../scenes/Scene";
import { UIHandler } from "../window/UIHandler";
import { screenResizeHandler } from "../window/screenResizeHandler";
import { fpglobals } from "./fpglobals";
import * as PIXI from "pixi.js";
import { fp_error } from "./fp_error";
import { log } from "../globals/dev/log";
import { devpanel } from "./dev/devpanel";
import { UI_EVENT } from "./events";

export enum LOADING_TYPE{
	NETWORK,
	ASSETS,
	SPIN_FRAMEWORK,
	SPLASH
}
	
export class fp_loading{
	
	// is it loading
	public static IS_LOADING = true;
	
	// check flags loading
	private static loaded_NETWORK = false;
	private static loaded_ASSETS = false;
	private static loaded_SPIN_FRAMEWORK = false;
	
	public static DEMOMODE_ALL_LOADING_DONE = false;
	public static DEMOMODE_ALL_LOADING_DONE_SET(set : boolean){
		this.DEMOMODE_ALL_LOADING_DONE = set;
		if(set){
			if(devpanel.DEMO_MODE){
				UIHandler.ALL_PLAY_INPUT_BLOCK = false;
			}
		}
	}
	
	
	public static try_start_games(loaded: LOADING_TYPE) : boolean{
		
		if(loaded == LOADING_TYPE.NETWORK){this.loaded_NETWORK = true;}
		if(loaded == LOADING_TYPE.ASSETS){this.loaded_ASSETS = true;}
		if(loaded == LOADING_TYPE.SPIN_FRAMEWORK){this.loaded_SPIN_FRAMEWORK = true;}
		
		if(this.loaded_ASSETS == true && this.loaded_NETWORK == true && this.loaded_SPIN_FRAMEWORK == true){
			if(this.IS_LOADING == false){return false;} //error too many loading points
			this.IS_LOADING = false;
			this.Load();
			return true;
		}
		else{
			return false;
		}
	}
	
	private static Load(){
		
		let app = fpglobals.GApp;
		//load main scene and do work
		const scene: Scene = new Scene(app);
		app.stage.addChild(scene);
		scene.zIndex = 10;
		if(fpglobals.SRH_SCALAR == undefined){
			fpglobals.SRH_SCALAR = new screenResizeHandler(app);
			screenResizeHandler.scene = scene;
		}else{
			screenResizeHandler.scene = scene;
		}
		screenResizeHandler.applyCenterTransform(scene);
		scene.initStageMask();
		fp_loading.RemoveLoadingScreen();
		//fpglobals.getTicker(0)?.start()
		//fpglobals.masterTicker.start()
		
		//basket props
//		const bp = Macro.getResourceByName("basket_anim_props");
//		BasketProperties.parseAnimPropsBasket(bp.data);
		
	} 
	
	
	
	
	
	
	public static RemoveLoadingScreen(){
		
		let dom : any = UIHandler.doc;
		let loading_parent : HTMLElement = dom.getElementById(UIHandler.id_loading_splash);
		if(loading_parent){
			//reduce opacity in 200ms and then remove
			let ret = loading_parent.animate(
				[
					{ opacity: '1.0' },
					{ opacity: '0.0' },
				], {
					fill: "forwards",
					duration: 800,
					iterations: 1
				}
			);
			ret.onfinish = function(){
				loading_parent.remove();
			}
			
			//loading_parent.remove();
		}
		let id_loading_text : HTMLElement = dom.getElementById(UIHandler.id_loading_text);
		if(id_loading_text){
			//reduce opacity in 200ms and then remove
			let ret = id_loading_text.animate(
				[
					
					
					{ top: '30px' },
					
				], {
					fill: "forwards",
					duration: 300,
					iterations: 1
				}
			);
			ret.onfinish = function(){
				loading_bar.remove();
			}
			
			//loading_parent.remove();
		}
		let loading_bar : HTMLElement = dom.getElementById(UIHandler.id_loading_bar);
		if(loading_bar){
			//reduce opacity in 200ms and then remove
			let ret = loading_bar.animate(
				[
					{ height: '0px' },
					{ opacity: '0' },
				], {
					fill: "forwards",
					duration: 300,
					iterations: 1
				}
			);
			ret.onfinish = function(){
				loading_bar.remove();
			}
			
			//loading_parent.remove();
		}
		let loading_bars : HTMLElement = dom.getElementById(UIHandler.id_loading_bars);
		if(loading_bars){
			//reduce opacity in 200ms and then remove
			let ret = loading_bars.animate(
				[
					
					{ opacity: '1.0' },
					{ opacity: '0.0' },
				], {
					fill: "forwards",
					duration: 300,
					iterations: 1
				}
			);
			ret.onfinish = function(){
				loading_bars.remove();
			}
			
			//loading_parent.remove();
		}
	}
	
	
	
	
	
	
	
	
	
	//Function that creates a pixi container with a button and a text, text is centered in button button is centered in container
	//upon clicking the button a function will be called try_start_games with the loading type
	//container should have a red background
	public static SetupLoadingScreen(doc : any){
		let stage = fpglobals.GApp.stage;
		//let ticker = fpglobals.getTicker(1);
		let ticker = new PIXI.Ticker();
		if(fpglobals.perf_LIMIT_FRAMERATE){
			ticker.maxFPS = fpglobals.MAX_FPS;
		}
		ticker.start();
		ticker.autoStart = true;
		let loader = fpglobals.getLoader();
		let loading_div : HTMLElement = UIHandler.getDiv(UIHandler.id_loading_splash);
		let loading_bar : HTMLElement = UIHandler.getDiv(UIHandler.id_loading_bar);
		let lastPerc : number = -1;
		
		//loading_bar.style.scale = "0%";
		//loading_bar.style.visibility = "visible";
		
		
		if(ticker){
			//add fucntion to ticker
			ticker.add(function(){ //each tick
				let success = false;
				
				let perc = fpglobals.getLoaderLoadingInPercent();
				if(perc == lastPerc){return;}
				loading_bar.style.width = (perc*2).toString() + "px";
				/*
				let perc_str = perc.toString() + "%";
				let crrWidth = loading_bar.style.scale;
				if(perc > 0){
					
					let ret = loading_bar.animate(
						[
							{ transform: 'scaleX('+ (perc/100).toString() +')'},
						], {
							fill: "forwards",
						duration: 300,
						iterations: 1
						}
					);
					ret.play();
				}else{
					let ret = loading_bar.animate(
						[
							{ transform: 'scaleX(0)' },
							{ transform: 'scaleY(1)' },
							{ opacity: '1'},
							
						], {
							fill: "forwards",
						duration: 100,
						iterations: 1
						}
					);
					//ret.play();
				}*/
				lastPerc = perc;
				
				if(perc >= 100){
					success = true;
					fpglobals.GLog("ASSET Loading complete", log.type.IMPORTANT);
				}
				
				//on success remove this from ticker
				if(success){
					//TODO call to remove element?
					ticker.destroy();
				}
				
			});
		
		}else{
			fpglobals.GLog("ERROR: ticker not created", log.type.ERROR);
			fp_error.onerror("ERROR: ticker not created");
		}
	}
	
	
	
	
	
	
	
}