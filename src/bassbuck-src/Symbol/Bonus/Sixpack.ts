import { Point, Sprite } from "pixi.js";
import { gfxsym } from "../Core/GraphicSymbol";
import { fpglobals } from "../../../globals/fpglobals";
import { SPIN_EVENT } from "../../../globals/events";
import { fp_error } from "../../../globals/fp_error";


export class Sixpack extends gfxsym{
	
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, feature : boolean, dummy = false,
		SymProp : any = null){
		super(_LibSym, _pos, cashValue, feature, dummy, SymProp);
		
		
		
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
		if(this.SymProperty.Used){
			texture_name = this.LibSym.toLocaleLowerCase() + "_deactivated";
		}
		
		if(this.main_sprite != null){
			this.removeChild(this.main_sprite);
		}
		
        this.main_sprite = Sprite.from(texture_name);
        //this.main_sprite = Sprite.from(this._texture_name_spin);
        this.addChild(this.main_sprite);
        
        this.text_node = this.getCreateTextCenterNode();
        this.addChild(this.text_node);
		
		this.sortableChildren = true;
        
        this.setupCashValue(this.text_node);
        
        this.main_sprite.zIndex = 100;
        this.text_node.zIndex = 201;
        
        this.main_sprite.anchor.x = 0.5;
        this.main_sprite.anchor.y = 0.5;
        
        this.main_sprite.visible = true;
    }
	
	private setPreviewSprite(){
		if(this.setGetSpine() != null){
			let state = "static_spin";
			if(this.SymProperty.Used){
				state = "static_deactivated";
			}
			this.setUpSpineBeforePlaySet(state);
			this._main_spine?.setPlayWithDelay(state, 0, false);
			this._main_spine?.update(0);
		}else{
			fp_error.onerror("Sixpack.setPreviewSprite() - no spine found "+ this.LibSym.toLocaleLowerCase());
		}
	}
	public override setActionsAfterBonusSpinDraw(): void {
		fpglobals.SpinEE.emit(SPIN_EVENT.FG_SP_APPEAR);
		this.setStartActivateAnimation();
	}
	
	public override setZIndexWins(active : boolean, offset : number = 0){
		if(active){
			if(this.zIndex < 1800){
				this.zIndex += 1800 + offset;
			}
		}else{
			if(this.zIndex > 1800){ //only over 1000 is wins
				this.zIndex -= 1800 + offset;
			}
		}
	}
	
	
	override setStartActivateAnimation(is_sixpack : boolean = false, delay : number = 0){
		if(delay > 0){
			this.logSpineAnimationScheduled("setStartActivateAnimation", this._spine_appear_animation_name, delay);
		}
		let function_to_call = ()=>{
			this.setAnimationPlay(this._spine_appear_animation_name, false, false);
			let loop_func = ()=>{
				this.setAnimationPlay(this._spine_appear_loop_animation_name, true);
			};
			this.callbackAfter(1000, loop_func); //not sure if this is ok
			this.main_sprite.visible = false;
		}
		if(delay > 0){
			this.callbackAfter(delay, function_to_call);
		}else{
			function_to_call();
		}
	}
}