import { Point, Sprite, Container, Texture, IDestroyOptions } from "pixi.js";
import { gfxsym, SYMBOL_STATE } from "../Core/GraphicSymbol";
import { Easing } from "@tweenjs/tween.js";
import { ggTween } from "../../../globals/time/ggTween";
import { fpglobals } from "../../../globals/fpglobals";
import * as timingConst from "../../timing/timingConst";
import { blank_symbol, lunker_threshold_spin_focus, weedfish_symbol } from "../../SpinDataset";
import { SPIN_EVENT } from "../../../globals/events";
import { symbol_effect } from "../../../effects/symbol_effect";
import { requestScreenWakeLock } from "../../../globals/wakeLock";

export class WeedBass extends gfxsym{
	
	private static _spine_appear_animation_name : string = "appear_green";
	
	protected static slot_name_blank = "container_blank";
	
	//Background
	protected static slot_name_bg = "container_bg";
	protected static slot_name_bg2 = "container_bg2";
	
	//Fish (bass)
	protected static slot_name_fish = "container_bass";
	//protected static slot_name_fish2 = "container_bass2";
	
	//Text (number)
	protected static slot_name_t_on = "container_t_on";
	protected static slot_name_t_off = "container_t_off";
	
	//Text string
	protected static slot_name_ts = "container_ts";
	
	//Gold outer frame
	protected static slot_name_gold = "container_gold_outer";
	
	protected static blinkChimeDelay : number = 0;
	
	private _weed_idle_anims : Array<string> = [
		"wf_idle_l",
		"wf_idle_l2",
		"wf_idle_m",
		"wf_idle_m2",
		"wf_idle_r",
		"wf_idle_r2",
		"wf_idle_s",
		"wf_idle_s2",
	];
	override getWeedAnimationIndex() : string{
		let animPool = [
			"wf_idle_l",
			"wf_idle_l2",
			"wf_idle_m",
			"wf_idle_m2",
			"wf_idle_r",
			"wf_idle_r2",
			"wf_idle_s",
			"wf_idle_s2",
		];
		if(	this.cashvalue == 1 ||
			this.cashvalue == 2 ||
			this.cashvalue == 10){
			//eliminate the ones that end with _l
			animPool = animPool.filter(anim => !anim.endsWith("_m"));
			animPool = animPool.filter(anim => !anim.endsWith("_m2"));
			animPool = animPool.filter(anim => !anim.endsWith("_s"));
			animPool = animPool.filter(anim => !anim.endsWith("_s2"));
		}else if(
			this.cashvalue == 3 ||
			this.cashvalue == 5	||
			this.cashvalue == 50||
			this.cashvalue == 1000||
			this.cashvalue == 500){
			//eliminate the ones that end with _l
			animPool = animPool.filter(anim => !anim.endsWith("_l"));
			animPool = animPool.filter(anim => !anim.endsWith("_l2"));
	//		if(this.cashvalue == 500 || this.cashvalue == 1000){
				animPool = animPool.filter(anim => !anim.endsWith("_s"));
				animPool = animPool.filter(anim => !anim.endsWith("_s2"));
	//		}
		}
		else if(this.cashvalue == 25 ||
			this.cashvalue == 100 ||
			this.cashvalue == 250||
			this.cashvalue == 2000){
			//eliminate the ones that end with _r
			animPool = animPool.filter(anim => !anim.endsWith("_r"));
			animPool = animPool.filter(anim => !anim.endsWith("_r2"));
			animPool = animPool.filter(anim => !anim.endsWith("_s"));
			animPool = animPool.filter(anim => !anim.endsWith("_s2"));
		}
		else {
			//random
		}
		//if(rand
		//TODO use our random
		return animPool[Math.floor(Math.random() * animPool.length)];
	}
	
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, feature : boolean, dummy = false, SymProp : any = null){
		super(_LibSym, _pos, cashValue, feature, dummy, SymProp);
		this._spine_WinGenAnimName = weedfish_symbol.toLowerCase() + "_remove";
		this.starting_spine_animation = this.WEED_ANIM_INDEX; 
		return;
	}
	override setZIndexDummyWins(value : boolean){
		this.zIndex = 10;
		super.setZIndexDummyWins(value);
	}
	
	override getIsLunker(){
		return this.cashvalue >= 500;
	}
	
	
	override setSymbolSprite(forceActivePlayfield : boolean = false): void { //weedbass has symbol sprite that falls first then spine over it is playing
		const anchor = 0.5;
		this.WEED_ANIM_INDEX = this.getWeedAnimationIndex();
//	//	//setup the layers
//		let bg = Sprite.from(this.getFishSpriteName(forceActivePlayfield, 0)); //always outside gfx
//		bg.name = "background";
//		bg.anchor.x = anchor;
//		bg.anchor.y = anchor;
//		bg.x = 0;
//		bg.y = 0;
//		this.addChild(bg);
//		this.main_sprite = bg;
//		this.main_bg = bg;
//			//	TODO clear this
//		let bass = Sprite.from(this.getFishSpriteName(this.isInsidePlayfield, 2));
//		if(forceActivePlayfield){
//			bass = Sprite.from(this.getFishSpriteName(true, 2));
//		}
//		bass.name = "bass";
//		bass.anchor.x = anchor;
//		bass.anchor.y = anchor;
//		bass.x = 0;
//		bass.y = 0;
//		this.main_sprite.addChild(bass);


		if(this.main_sprite){
			this.main_sprite.parent.removeChild(this.main_sprite);
			this.main_sprite = null;
		}
		
		this.main_sprite = Sprite.from(this.cashvalue.toString() + "_green");
		this.addChild(this.main_sprite);
		this.main_sprite.anchor.x = anchor;
		this.main_sprite.anchor.y = anchor;
		this.main_sprite.x = 0;
		this.main_sprite.y = 0;
		this.main_sprite.zIndex = 100;
		this.main_sprite.name = "WEEDBASS_MAIN_SPRITE";
		
		if(false){
			let txt = Sprite.from(this.getFishSpriteName(forceActivePlayfield, 1));
			txt.anchor.x = anchor;
			txt.anchor.y = anchor;
			txt.name = "text"; //cashvalue text
			this.main_sprite.addChild(txt);
			this.main_txt = txt;
		}
	}
	
	//TODO -> this assumes we have set spine player
	protected override setUpSpineBeforePlaySet(): void {
		//set u p  the layers
		let spine = this._main_spine!;
		
		spine.skeleton.setSkinByName(this.cashvalue.toString());
		spine.setPlayWithDelay("static_appear_green",0,false,10);
		
		spine.update(0);
	}
	
	protected override setUpSpineAfterPlaySet(): void {
		//this.main_sprite = this._main_spine!; //not valid on weedbass
		this.main_sprite.visible = false;
		//this.main_sprite = this._main_spine;
		//this.main_sprite.visible = true;
		//we need background construct for removing
	}
	protected override playSpineOnFeatureStop(): void {
		//this.setupWeedFishSpine(null, this.param_spine_animation);
		if(this._main_spine == null){
			this.setGetSpine();
		}
		this.setUpSpineBeforePlaySet();
		//this._main_spine!.addToSpineQueue(this.param_spine_animation_mixin_after);
		this.setAnimationPlay(WeedBass._spine_appear_animation_name, false);
		this.setAnimationPlayQueue(this.WEED_ANIM_INDEX, true);
		this.removeChild(this.main_sprite);
		this.main_sprite =this._main_spine;
		this.addChild(this.main_sprite);
	}
	
	//This is spin start only
	public override animateSpin_Start(toPos : Point, instant : boolean){ // a public command
		//init chain
		
		let node = this;
		node.pos = toPos;
		let delay = 0;
		let animTime = 0;
		if(!instant){
			this.SymState = SYMBOL_STATE.SPIN;
			let time_mp = this.pos.x + 5;

			let delay = (fpglobals.grid_y- this.pos.y) * timingConst.delayBetweenSymbols + timingConst.init_delay_spin_offset;
			if(this.pos.y >= 3){
				time_mp = this.pos.x + 5 + ((fpglobals.grid_y - this.pos.y) * timingConst.additionalTimeMpForBottominit);
			}
			let animTime = timingConst.getAnimationSpeed() * time_mp;
			
			this._start_pos_time = delay;
			this._end_pos_time = delay + animTime;
			
			//to show weedbass value fix
			//this.setAnimationPlay(WeedBass._spine_appear_animation_name, false);
			//this._main_spine!.update(0);
			//this._main_spine!.state.timeScale = 0;
			
			let twin_mover = new ggTween(this, fpglobals._GROUP);
			twin_mover.delay(delay);
			twin_mover.onStart(() => {
				node.visible = true;
			});
			twin_mover.to({ x: node.getPosInPixels().x, y: node.getPosInPixels().y }, animTime).easing(Easing.Cubic.In);
			twin_mover.onComplete(() => {
				this.setAnimationPlay(WeedBass._spine_appear_animation_name);
				this.setAnimationPlayQueue(this.WEED_ANIM_INDEX, true);
				//this._main_spine!.state.timeScale = 1;
				this.SymState = SYMBOL_STATE.STATIC;
				this.position_cords(this.pos);
				if(this._lambda_func_fire_on_bg_appear){
					this._lambda_func_fire_on_bg_appear();
					this._lambda_func_fire_on_bg_appear = null;
				}
			});
			twin_mover.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin_mover);
		}else{
			//do instant placement
			node.SymState = SYMBOL_STATE.STATIC;
			node.position_cords(node.pos);
			node.setAnimationPlay(WeedBass._spine_appear_animation_name, false);
			node.setAnimationPlayQueue(this.WEED_ANIM_INDEX, true);
			node.setUpSpineBeforePlaySet(); //this sets spien sprite
		}
		return delay + animTime;
	}
	
	//removing from reels (normal spin remove)
	public override animateBGReelRemove(toPos: Point, instant : boolean){
		let node = this;
		
		node.SymState = SYMBOL_STATE.REMOVE;
		node.removeSymbolOverlayEffectWithDelay(0);
		if(!instant){
			{ //Do the spine animation
				let time_mp = this.pos.x + 5;
				let time = timingConst.getAnimationSpeed() * time_mp;
				let delay = ((fpglobals.grid_y - this.pos.y)* (timingConst.delayBetweenSymbols));
				//let delay = 0;
				let spine_animation = this.LibSym.toLocaleLowerCase()+"_reelremove";//+this.WEED_ANIM_INDEX;
				
				let animateDeweed = false;
				if(animateDeweed){
					this.callbackAfter(delay, () => {
						//this.setAnimationPlay(spine_animation, false);
						this.setAnimationPlayQueue(spine_animation, false);
					});
				}
				this.callbackAfter((delay+time)*2, () => { //to be sure
					this.visible = false;
					this.destroy();
				});
			}
			{ //Do remove of fish
				let time_mp = this.pos.x + 5;
				let time = timingConst.getAnimationSpeed() * time_mp;
				let delay = ((fpglobals.grid_y - this.pos.y)* (timingConst.delayBetweenSymbols* 3));
				//this.param_spine_animation = this.LibSym.toLocaleLowerCase()+"_reelremove";//+this.WEED_ANIM_INDEX;
				node.pos = toPos;
				
				let twin_mover = new ggTween(this, fpglobals._GROUP);
				twin_mover.delay(delay);
				twin_mover.onStart(() => {
					node.visible = true;
				});
				twin_mover.to({ x: node.getPosInPixels().x, y: node.getPosInPixels().y }, time).easing(Easing.Cubic.In);
				twin_mover.onComplete(() => {
					node.SymState = SYMBOL_STATE.STATIC;
					node.visible = false;
					node.destroy();
				});
				twin_mover.start(fpglobals.masterTicker.last_scaled_time);
				this.win_animators.push(twin_mover);
			}
			
		}else{
			if(instant){this.visible = false; this.Destroy(); return;}
		}
		return;
	}
	
	
	public override forceStop(){
		super.forceStop();
		if(gfxsym.isNodeSpinning(this)){
			this.setAnimationPlay(WeedBass._spine_appear_animation_name, false);
			this.setAnimationPlayQueue(this.WEED_ANIM_INDEX, true);
			this.setUpSpineBeforePlaySet(); //this sets spien sprite
		}
	}
	
	//for weed we play remove, this is removing
	public override animateGeneratedEndEvent( //NOT USED
		animName : string,
		time : number = 1000,
		delay : number = 0){
		let node = this;
		node.SymState = SYMBOL_STATE.WIN_MARKING_INSERT; 
		
		{ //animaton
			let twin = new ggTween({progress:0}, fpglobals._GROUP);
			twin.delay(delay);
			twin.to({progress : 1}, time);
			twin.onComplete(() => {
				node.visible = true;
				node.SymState = SYMBOL_STATE.STATIC;
				node.setAnimationPlay(animName,false, true);
				node.setAnimationPlayQueue(node.WEED_ANIM_INDEX, true);
			});
			twin.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin);
		}
		return;
	}
	//for weed we play remove, this is removing
	public override animateGeneratedEndEventRemove(
		animName : string, //TODO remove anim name? as it is not used
		time : number = 1000,
		delay : number = 0){
		let node = this;
		node.SymState = SYMBOL_STATE.WIN_MARKING_INSERT; 
		{ //animaton
			let twin = new ggTween({progress:0}, fpglobals._GROUP);
			twin.delay(delay);
			twin.to({progress : 1}, time);
			twin.onComplete(() => {
				//node.setAnimationPlay(this.LibSym.toLocaleLowerCase()+"_idle_"+node.WEED_ANIM_INDEX, false, true);
				//node.setAnimationPlayQueue(this.LibSym.toLocaleLowerCase()+"_reelremove", false);
				node.setAnimationPlay(node.WEED_ANIM_INDEX, false, true);
				node.setAnimationPlayQueue(this.LibSym.toLocaleLowerCase()+"_reelremove", false);
				node.removeSymbolOverlayEffectWithDelay(0);
			});
			twin.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin);
		}

		return;
	}
	
	
	//THIS IS ON DUMMY SYMBOL!
	public override playCollectSequence( //COLLECT NOT COLLECTOR
		collector_pos : Point,
		delay : number,
		animtime : number, //delay, time of sequence
	){
		let node = this;
		node.visible = false;
		node.SymState = SYMBOL_STATE.WIN_MARKING_DELAY;
		
		let spineName = node.LibSym.toLocaleLowerCase()+"_reelremove"; 
		
		let toPlayFunc = ()=>{
			if(node.overlay_symbol_effect){
				node.overlay_symbol_effect.destroy();
				node.overlay_symbol_effect = undefined;
			}
			node.main_sprite.visible = false;
			node.visible = true;
			node.SymState = SYMBOL_STATE.WIN_MARKING;
			//node.setAnimationPlay(node._spine_WinCollectorAnimName, false, true);
			node.setAnimationPlay(spineName, false, true);
		}
		
		let twin = new ggTween({progress : 0}, fpglobals._GROUP);
		if(delay != 0){
			toPlayFunc();
		}else{
			twin.delay(delay);
			twin.onStart(()=>{
				toPlayFunc();
			});
		}
		twin.to({progress : 1},animtime);
		twin.onComplete(()=>{
			node.visible = false;
			node.SymState = SYMBOL_STATE.STATIC;
			node.destroy();
		});
		
		return this;
	}
	
	
	public override animateGenerated(
		//	upgrading : boolean, animTime : number, delay : number
		//){
		animName : string,
		time : number = 1000,
		delay : number = 0){
		let node = this;
		node.SymState = SYMBOL_STATE.WIN_MARKING_INSERT;
//			node.main_sprite.visible = false;
		node.animateTint(delay);
		
		node.setZIndexWins(true);
		{ 	//animaton
			let twin = new ggTween({progress:0}, fpglobals._GROUP);
			twin.delay(delay);
			twin.onStart(() => {
				if(node.overlay_symbol_effect){
					node.overlay_symbol_effect.destroy();
					node.overlay_symbol_effect = undefined;
				}

				//node.setTintActive();
				node.visible = true;
				//node.setSymbolSprite();
				node.SymState = SYMBOL_STATE.STATIC;
				
				node.setAnimationPlay(node.WEED_ANIM_INDEX, false);
				node.setAnimationPlay(animName, false);
				
				//node._main_spine!.setPlayWithDelay(node.WEED_ANIM_INDEX, 0, false, 1);
				//node.setUpSpineBeforePlaySet();
				//node._main_spine!.setPlayWithDelay(animName, 0, false, 10);
				
				//node.setAnimationPlay(node.WEED_ANIM_INDEX, true);
				//node.setUpSpineBeforePlaySet();
				//node.setAnimationPlayQueue(animName,false);
				
			});
			twin.to({progress : 1}, time);
			twin.onComplete(() => {
				node.visible = false;
			});
			twin.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin);
		}
		return;
	}
	
	override setBlinkAndChime(duration : number, delay : number, doEvent : boolean = false, isWeed : boolean = true, isDeweed : boolean = false){
		
		let func = () => {
			if(doEvent){
				//fpglobals.SpinEE.emit(SPIN_EVENT.BG_BLINK_CHIME);
				if(this.cashvalue <= 5){
					fpglobals.SpinEE.emit(SPIN_EVENT.BG_BLINK_CHIME_SMALLIES);
				}else if(this.cashvalue <= 250){
					fpglobals.SpinEE.emit(SPIN_EVENT.BG_BLINK_CHIME_FAIR);
				}else if(this.cashvalue <= 2000){
					fpglobals.SpinEE.emit(SPIN_EVENT.BG_BLINK_CHIME_LUNKER);
				}
			}
			//this.setAnimationPlay("appear_green", false);
			if(isDeweed){
				this.setAnimationPlay("appear", false);
			}
			
			if(isWeed){
				
				let func = () => { //magic number to wait animation time? same as bass
					
					//fpglobals.FPScene.wins_holder
					if(this.overlay_symbol_effect == undefined){
						this.overlay_symbol_effect = new symbol_effect("wf_spine", this);
						fpglobals.FPScene.wins_holder.addChildToOverlay(this.overlay_symbol_effect);
					}
					
					if(this.cashvalue>=lunker_threshold_spin_focus){
						
						
						let temp_effect = new symbol_effect("wf_spine", this);
						fpglobals.FPScene.wins_holder.addChildToOverlay(temp_effect);
						temp_effect.startAppearAnimation(false); //we set autoremove to false because we want to remove manually
						temp_effect.setRemoveAfter(1000); //We remove manually because we have 2 effects
						temp_effect.startFollowTween();
						temp_effect.position = this.position;
					//	
					//	this.overlay_symbol_effect.startFollow(true);
					//	this.overlay_symbol_effect.visible = false;
					//	temp_effect.visible = false;
						
						
						this.overlay_symbol_effect.startAppearAnimation(false);
						this.overlay_symbol_effect.repeat_follow = false;
						let oveff = this.overlay_symbol_effect;
						this.callbackAfter(500, () => {
							if(oveff){
								oveff.startFollow(true);
							}
						});
						
					}
					else{
						this.overlay_symbol_effect.startAppearAnimation();
						this.overlay_symbol_effect.repeat_follow = false;
						this.overlay_symbol_effect.startFollowTween();
					}
				};
				if(delay > 0){
					this.callbackAfter(WeedBass.blinkChimeDelay, func);
				}else{
					func();
				}
			}
		};
		if(delay > 0){
			this.callbackAfter(delay, func);
		}else{
			func();
		}
	}
	
	public override setActionsAfterBonusSpinDraw(): void {
		if(this.cashvalue >= lunker_threshold_spin_focus){
			fpglobals.SpinEE.emit(SPIN_EVENT.FG_GREENLUNKER_APPEAR);
		}else{
			fpglobals.SpinEE.emit(SPIN_EVENT.FG_GREENBASS_APPEAR);
		}
	//	if(this.cashvalue >= lunker_threshold_spin_focus || !this.isInsidePlayfield){
			this.setBlinkAndChime(1000, 0, false, true, false);
	//	}
	}
	
	//transfer from overlay to symbol spine
	public override convertGridOverlayEffectToSymbolSpine(){
		if(!this.overlay_symbol_effect){return;}
		if(!this._main_spine){this.setGetSpine();}
		this._main_spine!.setPlayWithDelay("appear_green_loop_base", 0, true, 3);
		this.removeSymbolOverlayEffectWithDelay(0);
		
		return;
	}
}