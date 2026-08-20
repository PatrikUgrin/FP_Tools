import { Point, Sprite } from "pixi.js";
import { gfxsym } from "../Core/GraphicSymbol";
import { fpglobals } from "../../../globals/fpglobals";
import { SPIN_EVENT } from "../../../globals/events";
import { fp_error } from "../../../globals/fp_error";


export class Boat extends gfxsym{
	
	///This should include base game symbols only
	
	
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, dummy = false, SymProp : any = null){
		super(_LibSym, _pos, cashValue, true, dummy, SymProp);
		this.isBoat = true;
		this._spine_WinAnimName = "action_row";
		this._spine_WinCollectorAnimName = "collected";
		return;
	}
	
	public override getTxtYOffset(){
		return -35;//this.txt_y_offset;
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
			texture_name = this.LibSym.toLocaleLowerCase() + "_deactivated_" + this.SymProperty.NumProp?.toString();
		}
		
		if(this.main_sprite != null){
			this.removeChild(this.main_sprite);
		}
		
		this.main_sprite = Sprite.from(texture_name);
		//this.main_sprite = Sprite.from(this._texture_name_spin);
		this.addChild(this.main_sprite);
		
		this.text_node = this.getCreateTextCenterNode();
		this.addChild(this.text_node);
		
	//	this.text_prop_node = this.getCreateTextPropNode();
		this.sortableChildren = true;
	//	this.text_prop_node.zIndex = 201;
		
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
				state = "static_deactivated"; //animation name, not texture name
			}
			this.setUpSpineBeforePlaySet(state);
			this._main_spine?.setPlayWithDelay(state, 0, false);
			this.setUpSpineAfterPlaySet();
			this._main_spine?.update(0);
		}else{
			fp_error.onerror("Boat.setPreviewSprite() - no spine found "+ this.LibSym.toLocaleLowerCase());
		}
	}
	public override setActionsAfterBonusSpinDraw(): void {
		fpglobals.SpinEE.emit(SPIN_EVENT.FG_BOAT_APPEAR);
		this.setStartActivateAnimation();
	}
	
	public override setStartActivateAnimation(is_sixpack: boolean = false, delay: number = 0): void {
		if(delay > 0){
			this.logSpineAnimationScheduled("setStartActivateAnimation", this._spine_appear_animation_name, delay);
		}
		let cb_func = ()=>{
			this.setZIndexWinFor(1000);
			this.setAnimationPlay(this._spine_appear_animation_name, false, true);
			this.main_sprite.visible = false;
			
			if(is_sixpack){
				this.setZIndexWins(true);
			}
			let loop_func = ()=>{
				this.setAnimationPlay(this._spine_appear_loop_animation_name, true);
			};
			this.callbackAfter(1000, loop_func); //not sure if this is ok
			
		}
		if(delay > 0){
			this.callbackAfter(delay, cb_func);
		}else{
			cb_func();
		}
	}
	
	
	//public override setUpSpineBeforePlaySet(animName: string): void {
	//	let spine = this._main_spine!;
	//	
	//	if(this.SymProperty.NumProp){
	//		if(this.SymProperty.NumProp == 2){
	//			spine.skeleton.setSkinByName("2_multi");
	//		} else if(this.SymProperty.NumProp == 3){
	//			spine.skeleton.setSkinByName("3_multi");
	//		}else{
	//			spine.skeleton.setSkinByName("no_multi");
	//		}
	//	}
	//	return;
	//}
	protected override setUpSpineAfterPlaySet(): void {
		let spine = this._main_spine!;
		if(this.SymProperty.NumProp){
			if(this.SymProperty.NumProp == 2){
				spine.skeleton.setSkinByName("2_multi");
			} else if(this.SymProperty.NumProp == 3){
				spine.skeleton.setSkinByName("3_multi");
			}else{
				spine.skeleton.setSkinByName("no_multi");
			}
		}else{
			spine.skeleton.setSkinByName("no_multi");
			spine.update(0);
		}
		return;
	}
	
	
	
	
	
	
	
}