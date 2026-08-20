
import {PageType, wDOME} from "../window/wDOME";
import { 
	Container, Sprite, Application,
	 /*Loader,*/ Spritesheet, BaseTexture,
	  MaskSystem, Graphics, Ticker, ScissorSystem, Renderer, TextStyle,
		Text,
		Loader,
		filters,
		RenderTexture
	
	} from "pixi.js";
import { fpglobals } from "./fpglobals";
import { log } from "../globals/dev/log";
import { devpanel } from "./dev/devpanel";
import { spin } from "../reelspin/BaseGame/spin";

//this is for error handling


//on error we display error screen with small info about error and refresh page button

export enum INTERRUPT_TYPE{
	HELP,
	STOP,
	ERROR
	
}



export class fp_error{

	private static tempContainer : any = undefined;

	private static escapeHtml(str: string): string {
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}

	private static formatErrorForOverlay(str: string, debugInfo: string): string {
		return fp_error.escapeHtml(str) + "<br><br>" + fp_error.escapeHtml(debugInfo) + "<br><br>PLEASE RESTART APPLICATION";
	}
	
	//Build a short string with the current seed and step trace (BG/FG).
	//Access is wrapped in try/catch because errors can fire during very early
	//startup (before spin/devpanel statics are populated) and we must never
	//error-out while building the error screen.
	private static getDebugContextString() : string{
		let seedStr = "?";
		let stepStr = "?";
		try{
			if(devpanel != undefined && devpanel.LAST_SEED != undefined){
				seedStr = devpanel.LAST_SEED.toString();
			}
		}catch(e){ /* ignore */ }
		try{
			let inst = spin?.spin_staticInstance;
			let ds = inst?.current_spin_dataset;
			if(ds != undefined){
				let bg = ds.getCurrentStepTrace(true);
				let fg = ds.getCurrentStepTrace(false);
				stepStr = bg + " " + fg;
			}
		}catch(e){ /* ignore */ }
		return "Seed: " + seedStr + " | Step: " + stepStr;
	}
	
	public static onerror(str : string = "UNKNOWN ERROR", skippable = false){ //fatal error
		//Collect debug context (seed + current step trace) so the error screen
		//gives us enough info to reproduce the issue without digging through logs.
		let debugInfo = fp_error.getDebugContextString();
		fpglobals.GLog("ERROR : " + str + " | " + debugInfo, log.type.ERROR);
		if(skippable){return;} //skip error
		
		// SHOW HTML ELEMENT
		let thiswdom = wDOME.getElementByEnum(PageType.ERROR);
		if(thiswdom == undefined){
			//??
			//tryt to find manually? TODO
		}
		thiswdom?.showSelf();
		
		str = fp_error.formatErrorForOverlay(str, debugInfo);
		
		//set text
		let mainText : any = document.getElementById("error_text");
		mainText.innerHTML = str;
		
		
		fpglobals.PAUSE_GAME(INTERRUPT_TYPE.ERROR); //in case of error we pause game last
		
/////////////	 blur	//////////////////////////////
		return; //no blur
		if(fp_error.tempContainer != undefined){
			fp_error.tempContainer.destroy();
		}
		// Create a render texture
		const renderTexture = RenderTexture.create({
			width: fpglobals.FPScene.width,
			height: fpglobals.FPScene.height
		});
		
		// Create a sprite that will contain the blurred image
		const blurredSprite = new Sprite(renderTexture);
		
		// Create a blur filter
		const blurFilter = new filters.BlurFilter(255, 255);
		
		// Apply the blur filter to the sprite
		blurredSprite.filters = [blurFilter];
		
		// Render the scene to the render texture
		fpglobals.GApp.renderer.render(fpglobals.FPScene, {renderTexture});
		//fpglobals.FPScene.render(renderTexture);
		
		blurredSprite.x = 0;
		blurredSprite.y = 0;
		blurredSprite.scale.x = 1;
		blurredSprite.scale.y = 1;
		
		
		fp_error.tempContainer = blurredSprite;
		
		// Add the blurred sprite to the stage
		fpglobals.FPScene.above_reels.addChild(blurredSprite);
		
	}
	
}


/*// Create a render texture
const renderTexture = PIXI.RenderTexture.create({
  width: fpglobals.FPScene.width,
  height: fpglobals.FPScene.height
});

// Create a sprite that will contain the blurred image
const blurredSprite = new PIXI.Sprite(renderTexture);

// Create a blur filter
const blurFilter = new PIXI.filters.BlurFilter(255, 255);

// Apply the blur filter to the sprite
blurredSprite.filters = [blurFilter];

// Render the scene to the render texture
fpglobals.FPScene.render(renderTexture);

// Add the blurred sprite to the stage
fpglobals.FPScene.addChild(blurredSprite);
*/


