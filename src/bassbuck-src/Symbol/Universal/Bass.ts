import { Container, Point, RenderTexture, Sprite, Texture, filters } from "pixi.js";
import {MotionBlurFilter} from '@pixi/filter-motion-blur';
import { gfxsym } from "../Core/GraphicSymbol";
import { FG_SPIN_TYPE, fpglobals } from "../../../globals/fpglobals";
import { SPIN_EVENT } from "../../../globals/events";
import { lunker_threshold_spin_focus } from "../../SpinDataset";
import { fp_error } from "../../../globals/fp_error";
import { feature_symbol_spin_event } from "../../bonus_step";
import { symbol_effect } from "../../../effects/symbol_effect";
import { ggTween } from "../../../globals/time/ggTween";


export class Bass extends gfxsym{
	protected main_txt_string : Sprite | null;
	
	protected static slot_name_blank = "container_blank";
	//Background
	protected static slot_name_bg = "container_bg";
	//Fish (bass)
	protected static slot_name_fish = "container_bass";
	//Text (number)
	protected static slot_name_t_on = "container_t_on";
	protected static slot_name_t_off = "container_t_off";
	//Text string
	protected static slot_name_ts = "container_ts";
	//Gold outer frame
	protected static slot_name_gold = "container_gold_outer";
	
	protected static blinkChimeDelay : number = 0;
	
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, feature : boolean, dummy = false, SymProp : any = null){
		super(_LibSym, _pos, cashValue, feature, dummy, SymProp);
		
		this._spine_WinBonusInitAnimName = "appear";
		this._spine_WinAnimName = "collected";
		this._spine_WinCollectorAnimName = "collected";
		if(feature){
			this._spine_WinCollectorAnimName = "collected";
		}
		this._spine_WinGenAnimName = "create";
		return;
	}
	override getIsLunker(){
		return this.cashvalue >= lunker_threshold_spin_focus;
	}
	override getTxtPosInPixels(pos : Point = this.pos, center = true) : Point{
		return this.getPosInPixels(pos, center);
	}
	
	
	override setSymbolSprite(): void {
		
		if(this.SymProperty.preview){
			this.setPreviewSprite();
			return;
		}
		
		const anchor = 0.5;
		//setup the layers
		
		//detach previous main sprite if any
		if(this.main_sprite){
			this.main_sprite.parent.removeChild(this.main_sprite);
			this.main_sprite = null;
		}
		
		if(!this.isInsidePlayfield){
			this.main_sprite = Sprite.from(this.cashvalue.toString() + "_green");
		}else{
			this.main_sprite = Sprite.from(this.cashvalue.toString());
		}
		this.addChild(this.main_sprite);
		this.main_sprite.anchor.x = anchor;
		this.main_sprite.anchor.y = anchor;
		this.main_sprite.x = 0;
		this.main_sprite.y = 0;
		this.main_sprite.zIndex = 100;
		this.main_sprite.name = "BASS_MAIN_SPRITE";
	}
	
	private setPreviewSprite(){
		if(this.setGetSpine() != null){
			let state = this._spine_static_spin;
			//if(green){
			//	state = this._spine_static_spin + "_green";
			//}
			this.setUpSpineBeforePlaySet(state);
			this._main_spine?.setPlayWithDelay(state, 0, false);
			this._main_spine?.update(0);
		}else{
			fp_error.onerror("Bass.setPreviewSprite() - no spine found "+ this.LibSym.toLocaleLowerCase());
		}
	}
	
	protected override updateSymbolSprite(): void {
		this.setSymbolSprite();
	}
	
	override animateSpinFeature(reelstrip: Array<string>, instant: boolean, ongrid: boolean, previous_the_same: boolean, sym_timing: any, event: feature_symbol_spin_event | null, timingParam?: FG_SPIN_TYPE) {
		return super.animateSpinFeature(reelstrip, instant, ongrid, previous_the_same, sym_timing, event, timingParam);
	}
	
	public override animateBGReelRemove(toPos: Point, instant : boolean){
		let node = this;
		node.removeSymbolOverlayEffectWithDelay(0);
		// Stop delayed appear/blink callbacks (they would re-acquire spines after destroy),
		// but swap back to main_sprite so the fall animation stays visible the whole way.
		node.stopExTweens();
		if(node._main_spine){
			node.setRemoveSpinePlayer();
		}
		if(node.main_sprite){
			node.main_sprite.visible = true;
		}
		node.visible = true;
		super.animateBGReelRemove(toPos, instant);
	}
	
	
	protected override setUpSpineBeforePlaySet(animName : string): void {
		//set u p  the layers
		let spine = this._main_spine!;
		
		let active = this.isInsidePlayfield;
		
		spine.skeleton.setSkinByName(this.cashvalue.toString());
		if(!active){
		//	spine.setPlayWithDelay("static_appear_green",0,false,10);
		}else{
		//	spine.setPlayWithDelay("static_appear",0,false,10);
		}
		spine.update(0);
	}
	
	override setBlinkAndChime(duration : number, delay : number, doEvent : boolean = false, removeAfter : boolean = true, doBlinkChimeDelay : boolean = true){
		if(this._symbolDestroyed){return;}
		let blinkChimeDelay = Bass.blinkChimeDelay;
		if(!doBlinkChimeDelay){
			blinkChimeDelay = 0;
		}
		let func = () => {
			if(this._symbolDestroyed){return;}
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
			if(this.isInsidePlayfield){
				this.setAnimationPlay("appear", false);
				if(removeAfter){
					this.callbackAfter(duration, () => {
						this.setRemoveSpinePlayer();
					});
				}
			}
			else{
				let func = () => { //magic number to wait animation time? same as weedbass
					//fpglobals.FPScene.wins_holder
					if(this.overlay_symbol_effect == undefined){
						this.overlay_symbol_effect = new symbol_effect("wf_spine", this);
		//				if(this.param_overlay_set_above){
		//					fpglobals.FPScene.lunker_wave_effect_holder.addChild(this.overlay_symbol_effect);
		//				}else{
							fpglobals.FPScene.wins_holder.addChildToOverlay(this.overlay_symbol_effect);
		//				}
					}
					if(this.cashvalue>=lunker_threshold_spin_focus){
						let temp_effect = new symbol_effect("wf_spine", this);
						fpglobals.FPScene.wins_holder.addChildToOverlay(temp_effect);
						temp_effect.startAppearAnimation(false); //we set autoremove to false because we want to remove manually
						temp_effect.setRemoveAfter(1000); //We remove manually because we have 2 effects
						temp_effect.startFollowTween();
						temp_effect.position = this.position;
						
						// Match WeedBass lunker: play green appear on persistent overlay, then follow
						this.overlay_symbol_effect.startAppearAnimation(false);
						this.overlay_symbol_effect.repeat_follow = false;
						let oveff = this.overlay_symbol_effect;
						this.callbackAfter(500, () => {
							if(oveff){
								oveff.startFollow(true);
							}
						});
						
					}else{
						this.overlay_symbol_effect.startAppearAnimation();
						this.overlay_symbol_effect.repeat_follow = false;
						this.overlay_symbol_effect.startFollowTween();
					}
				};
				if(duration > 0){
					this.callbackAfter(blinkChimeDelay, func);
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
	
	protected override afterSpinAnimatorEnd(){
		if(this._symbolDestroyed){return;}
		if(this.isInsidePlayfield){
			this.setAnimationPlay("appear", false);
			this.main_sprite.visible = true;
			if(true){
				this.callbackAfter(1000, () => {
					if(this._symbolDestroyed){return;}
					this.setRemoveSpinePlayer();
					this.main_sprite.visible = true;
				});
			}
		}else{
			this.setAnimationPlay("appear_green", false);
			if(true){
				this.callbackAfter(1000, () => {
					if(this._symbolDestroyed){return;}
					this.setRemoveSpinePlayer();
					this.main_sprite.visible = true;
				});
			}
		}
	}
	
	
	public override setActionsAfterBonusSpinDraw(): void {
		if(this.cashvalue >= lunker_threshold_spin_focus){
			fpglobals.SpinEE.emit(SPIN_EVENT.FG_LUNKER_APPEAR, {value : this.getPosInPixels()});
		}else{
			fpglobals.SpinEE.emit(SPIN_EVENT.FG_BASS_APPEAR, {value : this.getPosInPixels()});
		}
		this.setBlinkAndChime(1000,0,true, false);
		if(!this.SymProperty.Used){
			this.setStartActivateAnimation();
		}
	}
	
	
	//transfer from overlay to symbol spine
	public override convertGridOverlayEffectToSymbolSpine(){
		if(!this.overlay_symbol_effect){return;}
		if(!this._main_spine){this.setGetSpine();}
		this._main_spine!.skeleton.setSkinByName(this.cashvalue.toString());
		this._main_spine!.setPlayWithDelay(gfxsym.ANIM_APPEAR_LOOP_BASE, 0, true, 1);
		this.removeSymbolOverlayEffectWithDelay(0);
		return;
	}
	
	
	
	
		//THIS IS ON DUMMY SYMBOL!
	public override playCatchboostCollectSequence( //COLLECT NOT COLLECTOR
			collector_pos : Point,
			delay : number,
			animtime : number, //delay, time of sequence
			
		){
			let point_end_name : string = "point_end"
			let animToPlay = this._spine_WinCollectorAnimName;
			
			animToPlay = "catchboost_move";
			
			let node = this;
			node.visible = true;
			
			let toPlayFunc = ()=>{
				if(node._symbolDestroyed){return;}
				node.visible = true;
				
				node.setAnimationPlay(animToPlay, false, true);
				if(node._main_spine){
					node.main_sprite.visible = false;
				}else if(node.main_sprite){
					node.main_sprite.visible = true;
				}
				node.setSpinePath(collector_pos, node.getPosInPixels(), point_end_name);
			}
			let twin = new ggTween({progress : 0}, fpglobals._GROUP);
			if(delay == 0){
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
				node.destroy();
			});
			twin.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin);
			return;
		}
	
	
	
}
