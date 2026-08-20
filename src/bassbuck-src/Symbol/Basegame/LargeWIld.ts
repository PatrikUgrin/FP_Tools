import { Point, Sprite } from "pixi.js";
import { ggTween } from "../../../globals/time/ggTween";

import { fpglobals } from "../../../globals/fpglobals";
import { gfxsym, SYMBOL_STATE } from "../Core/GraphicSymbol";
import { 
	//bg_collector_remove_delay,
	bg_collector_win_start_delay,
	bg_collector_remove_intro_delay,
	bg_collector_remove_delay
} from "../../timing/timingConst";
import { CollSYM } from "../../BaseGame/BGWin";
import { timing } from "../../timing/timing";
import { fp_error } from "../../../globals/fp_error";



//THIS IS BASE GAME COLLECTOR
export class LargeWild extends gfxsym{
	
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, feature : boolean, dummy = false, SymProp : any = null){
		super(_LibSym, _pos, cashValue, feature, dummy, SymProp);
		this.isOversized = true;
		this._spine_WinGenAnimName = "action_create_buck";
		this._spine_WinAnimName = "win_buck";
		
		this._spine_WinCollectorAnimName_remove 	= "action_buck_clear";
		this._spine_WinCollectorAnimName_remove_noweed = "action_buck_clear";
		this._spine_ConvertToBlankAnimName = "convert_to_blank_buck";
		return;
	}
	public override setSymbolSprite(): void {
        //Has a background sprite
        //Has a text node
        
		//if this is for preview, then use spine so we can generate the texture
		if(this.SymProperty.preview){
			this.setPreviewSprite();
			return;
		}
		let texture_name = this._texture_name_spin;
		if(this.main_sprite != null){
			this.removeChild(this.main_sprite);
		}
        this.main_sprite = Sprite.from(texture_name);
        //this.main_sprite = Sprite.from(this._texture_name_spin);
        this.addChild(this.main_sprite);
        
        this.main_sprite.zIndex = 100;
        this.main_sprite.anchor.x = 0.5;
        this.main_sprite.anchor.y = 0.5;
        this.main_sprite.visible = true;
    }
	private setPreviewSprite(){
		if(this.setGetSpine() != null){
			let state = "static_buck";
			if(this.SymProperty.Used){
				state = "static_deactivated";
			}
			this.setUpSpineBeforePlaySet(state);
			this._main_spine?.setPlayWithDelay(state, 0, false);
			this._main_spine?.update(0);
		}else{
			fp_error.onerror("LargeWild.setPreviewSprite() - no spine found "+ this.LibSym.toLocaleLowerCase());
		}
	}
	 
//	public override setZIndexDummyWins(active : boolean){
//		if(active){
//			this.zIndex += 22000;
//		}else{
//			this.zIndex -= 22000;
//		}
//	}
//	public overridesetZIndexWins(active : boolean){
//		if(active){
//			this.zIndex += 5500;
//		}else{
//			if(this.zIndex > 5500){ //only over 1000 is wins
//				this.zIndex -= 5500;
//			}
//		}
//	}

	override setUpSpineBeforePlaySet(animName : string): void {
		//this._main_spine?.skeleton.setSkinByName("collector");
	}
	
	//THIS IS ON DUMMY SYMBOL!
	public override playCollectorSequence( //THIS IS FOR COLLECTOR NOT COLLECT
		allCollect : Array<CollSYM>,
		delay : number, //initial delay
		small_win_duration : number,
		removeAfter : boolean = true //remove after is for base game
	){
		this._spine_WinCollectorAnimName = "action_buck_collect";
		this._spine_WinCollectorAnimName_remove = "action_buck_clear";
		this.visible = true;
		//let cum_delay = timbudget.delay; //cummulative delay per each action 
		let cum_delay = delay; //cummulative delay per each action 
		
		////////////////////////// START INIT //////////////////////////
		
		//Set To InitStage
		//-> timingConst.bg_collector_win_start_delay;
		{
			let winStartAnimName = "action_buck_collect_intro";
			if(allCollect.length < 1){
				winStartAnimName = "action_buck_clear_intro";
			}
			
			let node = this;
			let funcOnComplete = ()=>{
				node.main_sprite.visible = false;
				node.SymState = SYMBOL_STATE.WIN_MARKING;
				node.setAnimationPlay(winStartAnimName, false, true);
			};
			
			if(delay != 0){
				let progress = {time : 0};
				let tween = new ggTween(progress, fpglobals._GROUP);
				tween.to({time: 1}, delay); //TODO delay should already be inside
				tween.onComplete(()=>{
					funcOnComplete();
				});
				tween.start(fpglobals.masterTicker.last_scaled_time);
				this._ex_tweens.push(tween);
			}else{
				funcOnComplete();
			}
			//cum_delay+= bg_collector_win_start_delay; //add to total delay
		}
		if(allCollect.length > 0){
			cum_delay+= bg_collector_win_start_delay; //add to total delay
		}
		////////////////////////// COLLECT ANIMATIONS //////////////////////////
		
		//collect animations repeating per collect
		//for(let i = 0; i < allCollect.length; i++) {
		for(let i = 0; i < 1; i++) {
			if(allCollect.length == 0){
				break;
			}
			let node = this;
			let collect = allCollect[i];
			let thisTime = small_win_duration//collect.time;
			cum_delay+= collect.delay;
			
			node.SymState = SYMBOL_STATE.WIN_MARKING_DELAY;
			
			let toPlayFunc = ()=>{
				node.main_sprite.visible = false;
				node.SymState = SYMBOL_STATE.WIN_MARKING;
				node.setAnimationPlay(node._spine_WinCollectorAnimName, false, true);
			};
			let progress = {time : 0};
			let tween = new ggTween(progress, fpglobals._GROUP);
			if(cum_delay != 0){
				tween.delay(cum_delay);
				tween.onStart(()=>{
					toPlayFunc();
				});
				tween.to({time: 1}, thisTime);
			}else{
				toPlayFunc();
				tween.to({time: 1}, thisTime);
			}
			tween.onComplete(()=>{
				node.visible = true;
			});
			tween.start(fpglobals.masterTicker.last_scaled_time);
			this._ex_tweens.push(tween);
			
			cum_delay += thisTime;//timbudget.animationTime;
		}
		
		
		////////////////////////// REMOVE ANIM //////////////////////////
		
		if(allCollect.length<1) { //TODO moving intro here
		} else { //else do clear_intro
			
////////////////////	CLEAR INTRO		///////////////////////			
			
			//cum_delay+=small_win_duration; //already added in collect sequence
			cum_delay+= bg_collector_remove_delay; //breathe time
		}
		
		cum_delay+= bg_collector_remove_intro_delay; //this is win lines delay
		
		
		if(false) { //Remove
		//	cum_delay+=bg_collector_remove_delay;
			
		
			//let thisCollect = allCollect[allCollect.length-1];
			let thisCollect = timing.getBGCollectorTimePerSymbol(this.LibSym);
			
			
			//let deweed_only = allCollect.length == 1 && deweed;
			//DEWEED
			//TODO different animation if deweed? or just dissapear?
			let node = this;
			let thisTime = thisCollect.time;//timing.getBGCollectorTimePerSymbol(this.LibSym).time; //TODO self remove time
			let delayToAdd = thisCollect.delay;//timing.getBGCollectorTimePerSymbol(this.LibSym).delay; //TODO self remove time
			//Here is ->bg_collector_remove_delay/smallwin_duration included
			
			cum_delay+= delayToAdd;
			
			let progress = {time : 0};
			let tween = new ggTween(progress, fpglobals._GROUP);
			tween.delay(cum_delay);
			tween.to({time: 1}, thisTime);
			tween.onStart(()=>{
				let animToPlay = node._spine_WinCollectorAnimName;
				//set frame to activated
				if(removeAfter){
					animToPlay = node._spine_WinCollectorAnimName_remove;
				}else{
					animToPlay = node._spine_WinCollectorAnimName;
				}
				node.SymState = SYMBOL_STATE.WIN_MARKING_DELAY;
				node.setAnimationPlay(animToPlay, false, true);
				node.main_sprite.visible = false;
			});
			tween.onComplete(()=>{
				node.visible = false;
				node.SymState = SYMBOL_STATE.STATIC;
				node.destroy();
			});
			
			tween.start(fpglobals.masterTicker.last_scaled_time);
			this._ex_tweens.push(tween);
			
			cum_delay += thisTime;//timbudget.animationTime;
		}
		
		return cum_delay; //return will be baseline for next initial delay in sequence
	}
	public override playCollectorRemove(){
		//let thisCollect = allCollect[allCollect.length-1];
		let thisCollect = timing.getBGCollectorTimePerSymbol(this.LibSym);
		//let deweed_only = allCollect.length == 1 && deweed;
		//DEWEED
		//TODO different animation if deweed? or just dissapear?
		let node = this;
		let thisTime = thisCollect.time;//timing.getBGCollectorTimePerSymbol(this.LibSym).time; //TODO self remove time
		let delayToAdd = thisCollect.delay;//timing.getBGCollectorTimePerSymbol(this.LibSym).delay; //TODO self remove time
		//Here is ->bg_collector_remove_delay/smallwin_duration included
		
		let cum_delay = 0;
		
		let progress = {time : 0};
		let tween = new ggTween(progress, fpglobals._GROUP);
		tween.delay(cum_delay);
		tween.to({time: 1}, thisTime);
		tween.onStart(()=>{
			let animToPlay = node._spine_WinCollectorAnimName_remove;
			node.SymState = SYMBOL_STATE.WIN_MARKING_DELAY;
			node.param_spine_animation_mixin_duration = 250;
			node.setAnimationPlay(animToPlay, false, false);
			node.param_spine_animation_mixin_duration = 0;
			node.main_sprite.visible = false;
		});
		tween.onComplete(()=>{
			node.visible = false;
			node.SymState = SYMBOL_STATE.STATIC;
			node.destroy();
		});
		
		tween.start(fpglobals.masterTicker.last_scaled_time);
		this._ex_tweens.push(tween);
		
		return;
	}
	
	protected override afterSpinAnimatorEnd(){
		if(this.isInsidePlayfield){
		//	this.setAnimationPlay("static_buck", false);
			this.setAnimationPlay("appear_buck", false);
			if(true){
				this.callbackAfter(500, () => {
					this.setRemoveSpinePlayer();
					this.setSymbolSprite();
				});
			}
		}
	}
	
	public override setPlayCollectorHit(allcoll_delays : Array<number>, allCollNums : Array<number>){
		for(let i = 0; i < allcoll_delays.length; i++){
			let delay = allcoll_delays[i];
			this.callbackAfter(delay, ()=>{
				this.setAnimationPlay("action_buck_collect",false,false);
			});
		}
	}
		
	
	
	
	
}