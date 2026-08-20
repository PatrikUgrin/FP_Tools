import { Point, Sprite, Container, Texture } from "pixi.js";
import { gfxsym, SYMBOL_STATE } from "../Core/GraphicSymbol";
import { Easing, Tween } from "@tweenjs/tween.js";
import { ggTween } from "../../../globals/time/ggTween";
import { fpglobals } from "../../../globals/fpglobals";
import * as timingConst from "../../timing/timingConst";
import { getFeatureSpriteName } from "../../../globals/assets";
import { blank_symbol, weedfish_symbol } from "../../SpinDataset";
import { SpineController } from "../../../spine/SpineController";
import { SPIN_EVENT } from "../../../globals/events";


//REMINDER, we use WF for spine animations
export class Weed extends gfxsym{
	
	private static _spine_appear_animation_name : string = "appear_green";
	private static weed_sequence_index : number = 0;
	public override _spine_WinCollectorAnimName : string = "wf_remove";
	
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
	
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, feature : boolean,dummy = false, SymProp : any = null){
		super(_LibSym, _pos, cashValue,feature, dummy, SymProp);
		this._spine_WinGenAnimName = weedfish_symbol.toLowerCase() + "_remove"; //uses WF for spine animations
		this.starting_spine_animation = this.WEED_ANIM_INDEX; 
		return;
	}
	
	private _weed_anim_symbol : string = "wf"; //using WF symbol animations
	
	override setSymbolSprite(): void {
		this.WEED_ANIM_INDEX = this.getWeedAnimationIndex();
		this.main_sprite = new Container();
		this.addChild(this.main_sprite);
	}
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
		Weed.weed_sequence_index++;
		if(Weed.weed_sequence_index >= animPool.length){
			Weed.weed_sequence_index = 0;
		}
		return animPool[Weed.weed_sequence_index];
	}
	
	protected override setUpSpineAfterPlaySet(): void {
		this.main_sprite = this._main_spine!;
		if(this.param_spine_animation_track_time != 0){
			this._main_spine?.setAnimationAt(this.param_spine_animation_track_time);
			this.param_spine_animation_track_time = 0;
		}
	}
	
	//TODO -> this assumes we have set spine player
	protected override setUpSpineBeforePlaySet(): void {
		//set u p  the layers
		let spine = this._main_spine!;
		
		//let tex_blank = Texture.from("container.png");
		//
		////Background
		//spine.hackTextureBySlotName(Weed.slot_name_bg, tex_blank, tex_blank.orig);
		//spine.hackTextureBySlotName(Weed.slot_name_bg+"2", tex_blank, tex_blank.orig);
		//
		////Gold outer frame
		//let tex_for_gold = tex_blank;
		//if(this.cashvalue < 25){
		//	tex_for_gold = tex_blank;
		//}
		//spine.hackTextureBySlotName(Weed.slot_name_gold, tex_for_gold, tex_for_gold.orig);
		//
		////Fish (bass)
		//spine.hackTextureBySlotName(Weed.slot_name_fish, tex_blank, tex_blank.orig);
		//spine.hackTextureBySlotName(Weed.slot_name_fish+"2", tex_blank, tex_blank.orig);
		//
		////Text (number)
		//spine.hackTextureBySlotName(Weed.slot_name_t_on, tex_blank, tex_blank.orig);
		//spine.hackTextureBySlotName(Weed.slot_name_t_off, tex_blank, tex_blank.orig);
		spine.skeleton.setSkinByName("weed");

		spine.update(0);
	}
	
	
	
	protected override playSpineOnFeatureStop(): void {
		//this.setupWeedFishSpine(null, this.param_spine_animation);
		if(this._main_spine == null){
			this.setGetSpine();
		}
		let name = Weed._spine_appear_animation_name;
		this.setUpSpineBeforePlaySet();
		//this._main_spine!.addToSpineQueue(this.param_spine_animation_mixin_after);
		this.setAnimationPlay(name, false);
		this.setAnimationPlayQueue(this.WEED_ANIM_INDEX, true);
		this.removeChild(this.main_sprite);
		this.main_sprite =this._main_spine;
		this.addChild(this.main_sprite);
	}
	public override setGetSpine(){
		//		if(param == "main"){
		if(this._main_spine == null){
			let ret = SpineController.getSpinePlayerBySym(this._weed_anim_symbol);
			if(ret == null){return null;}
			this._main_spine = ret;
			this._main_spine.setToLayer(this);
			//for debug name spine_player every time
			let spname = "SP : " + this.LibSym.toLocaleLowerCase() + " " + this.pos.x + " " + this.pos.y;
			if(this.isDummy){spname += " dummy";}
			this._main_spine.name = spname;
			return this._main_spine;
		}
		return this._main_spine;
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
//			let delay = (timingConst.bg_weed_delay_growth * (this.pos.x+1))+
//				((fpglobals.grid_y) * timingConst.delayBetweenSymbols) + 
//				timingConst.init_delay_spin_offset;
			delay = (fpglobals.grid_y- this.pos.y) * timingConst.delayBetweenSymbols + timingConst.init_delay_spin_offset;
			if(this.pos.y >= 3){
				//	time_mp = this.pos.x + 5 + ((fpglobals.grid_y - this.pos.y) * 1.5);
				//	delay+= ((fpglobals.grid_y - this.pos.y+2)) * timingConst.delayBetweenSymbols;
					//negativen correlation =
					//y = 6 - 4 = 2 delay 
					//y = 6 - 6 = 0 delay 
					time_mp = this.pos.x + 5 + ((fpglobals.grid_y - this.pos.y) * timingConst.additionalTimeMpForBottominit);	
				}
			animTime = timingConst.getAnimationSpeed() * time_mp;
			
			let twin_mover = new ggTween(this, fpglobals._GROUP);
			twin_mover.delay(delay);
			twin_mover.onStart(() => {
				node.visible = true;
			});
			twin_mover.to({ x: node.getPosInPixels().x, y: node.getPosInPixels().y }, animTime).easing(Easing.Cubic.In);
			twin_mover.onComplete(() => {
				this.setAnimationPlay(Weed._spine_appear_animation_name, false);
				this.setAnimationPlayQueue(this.WEED_ANIM_INDEX, true);
				this.SymState = SYMBOL_STATE.STATIC;
				this.position_cords(this.pos);
			});
			twin_mover.start(fpglobals.masterTicker.last_scaled_time);
			
			this.win_animators.push(twin_mover);
			
		}else{
			//do instant placement
			node.SymState = SYMBOL_STATE.STATIC;
			node.position_cords(node.pos);
			node.setAnimationPlay(Weed._spine_appear_animation_name, false);
			node.setAnimationPlayQueue(node.WEED_ANIM_INDEX, true);
		}
		return delay + animTime;
	}
	
	
	public override forceStop(){
		super.forceStop();
		if(gfxsym.isNodeSpinning(this)){
			this.setAnimationPlay(Weed._spine_appear_animation_name, false);
			this.setAnimationPlayQueue(this.WEED_ANIM_INDEX, true);
		}
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
				node.setAnimationPlay(node.WEED_ANIM_INDEX, false, true);
				node.setAnimationPlayQueue("wf_reelremove", false);
			});
			twin.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin);
		}
		return;
	}
	
	
	
	//removing from reels (normal spin remove)
	public override animateBGReelRemove(toPos: Point, instant : boolean){
		let node = this;
		
		node.SymState = SYMBOL_STATE.REMOVE;
		if(!instant){
			let time_mp = this.pos.x + 5;
			let time = timingConst.getAnimationSpeed() * time_mp;
			let delay = ((fpglobals.grid_y - this.pos.y)* (timingConst.delayBetweenSymbols));
			//let delay = 0;
			let spine_animation = "wf_reelremove";//+this.WEED_ANIM_INDEX;
			if(this._main_spine != null){
				this._main_spine?.setPlayWithDelay(spine_animation, delay, false, 10);
			}
			
			this.callbackAfter(delay, () => {
				//this.setAnimationPlay(spine_animation, false);
				//this.setAnimationPlayQueue(spine_animation, false);
			});
			//this.callbackAfter(delay+time, () => {
			//	this.destroy();
			//});
			
		}else{
			if(instant){this.visible = false; this.Destroy(); return;}
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
		
		let spineName = "wf_reelremove"; 
		
		let toPlayFunc = ()=>{
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
	
	
	public override animateWinMark(
		animName : string,
		remove : boolean,
		time : number = 1000,
		delay : number = 0,
		delay_after : number = 200){
	
		let node = this;

		node.SymState = SYMBOL_STATE.WIN_MARKING;
		
		this.setAnimationPlay(this.WEED_ANIM_INDEX, true);
		node._main_spine?.update(0);
		
		{ //animaton
			let twin = new ggTween({progress:0}, fpglobals._GROUP);
			let onStart = () => {
				node.visible = true;
				//node.main_sprite.visible = false;
				//this.setAnimationPlay(this.LibSym.toLocaleLowerCase()+"_idle_"+this.WEED_ANIM_INDEX, true);
				node.setAnimationPlayQueue(animName,false);
				node._main_spine?.update(0);
			};
			if(delay!=0){
				twin.delay(delay);
				twin.onStart(() => {
					onStart();
				});
			}else{
				onStart();
			}
			
			
			
			twin.to({progress : 1}, time);
			twin.onComplete(() => {
				node.SymState = SYMBOL_STATE.STATIC;
				//node.visible = false;
				
			});
			twin.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin);
		}
		if(remove){
			let twin = new ggTween({progress:0}, fpglobals._GROUP);
			twin.delay(delay);
			twin.to({progress : 1}, time + delay_after);
			twin.onComplete(() => {
				node.visible = false;
				node.destroy();
			});
			twin.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin);
		}
		return;
	}
	
	public override setActionsAfterBonusSpinDraw(): void {
		//fpglobals.SpinEE.emit(SPIN_EVENT.FG_GREENBASS_APPEAR);
	}
	
	
	
	
}