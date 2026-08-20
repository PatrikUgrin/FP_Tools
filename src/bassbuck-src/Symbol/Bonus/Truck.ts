import { Point, Sprite } from "pixi.js";
import { gfxsym } from "../Core/GraphicSymbol";
import { SPIN_EVENT } from "../../../globals/events";
import { fpglobals } from "../../../globals/fpglobals";
import { fp_error } from "../../../globals/fp_error";


export class Truck extends gfxsym{
	
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, feature : boolean, dummy = false,
		SymProp : any = null){
		super(_LibSym, _pos, cashValue, feature, dummy, SymProp);
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
		
		if(this.main_sprite != null){
			this.removeChild(this.main_sprite);
		}
		
		this.main_sprite = Sprite.from(texture_name);
		//this.main_sprite = Sprite.from(this._texture_name_spin);
		this.addChild(this.main_sprite);
		
		this.text_node = this.getCreateTextCenterNode();
		this.addChild(this.text_node);
		
		this.setupCashValue(this.text_node);
		
		this.main_sprite.zIndex = 100;
		this.text_node.zIndex = 201;
		
		this.main_sprite.anchor.x = 0.5;
		this.main_sprite.anchor.y = 0.5;
		
		this.main_sprite.visible = true;
	}
//	public override setSymbolSprite(): void {
//		//Has a background sprite
//		//Has a text node
//		
//		this.main_sprite = Sprite.from("hauler_bg.png");
//		this.addChild(this.main_sprite);
//		
//		this.text_node = this.getCreateTextCenterNode();
//		this.addChild(this.text_node);
//		
//		this.text_prop_node = this.getCreateTextPropNode();
//		this.sortableChildren = true;
//		this.text_prop_node.zIndex = 201;
//		
//		this.setupCashValue(this.text_node);
//		
//		this.main_sprite.zIndex = 100;
//		this.text_node.zIndex = 202;
//		
//		this.main_sprite.anchor.x = 0.5;
//		this.main_sprite.anchor.y = 0.5;
//		
//		this.main_sprite.visible = true;
//		
//		//on top of the background sprite
//		//fs_txt
//		let fs_txt = Sprite.from("hauler_logo.png");
//		fs_txt.scale.set(1);
//		fs_txt.anchor.x = 0.5;
//		fs_txt.anchor.y = 0.5;
//		fs_txt.y = -60;
//		this.main_sprite.addChild(fs_txt);
//	}
	
	public override setActionsAfterBonusSpinDraw(): void {
		fpglobals.SpinEE.emit(SPIN_EVENT.FG_TRUCK_APPEAR);
		this.setStartActivateAnimation();
	}
	
	override setStartActivateAnimation(is_sixpack : boolean = false, delay : number = 0){
		if(delay > 0){
			this.logSpineAnimationScheduled("setStartActivateAnimation", this._spine_appear_animation_name, delay);
		}
		let function_to_call = ()=>{
			this.setZIndexWinFor(1000);
			this.setAnimationPlay(this._spine_appear_animation_name, false, false);
			this.main_sprite.visible = false;
			let loop_func = ()=>{
				this.setAnimationPlay(this._spine_appear_loop_animation_name, true);
			};
			this.callbackAfter(1000, loop_func); //not sure if this is ok
		}
		if(delay > 0){
			this.callbackAfter(delay, function_to_call);
		}else{
			function_to_call();
		}
	}
	public override setPlayCollectorHit(allcoll_delays : Array<number>, allCollNums : Array<number>){
		//truck hit in bonus is "collect_add"
		for(let i = 0; i < allcoll_delays.length; i++){
			let delay = allcoll_delays[i];
			this.callbackAfter(delay, ()=>{
				// Hide only the text display, keep the main sprite and activated animation visible
				if(this.text_node != null){
					this.text_node.visible = false; //TODO why?
				}
				this.setAnimationPlay(this._spine_WinCollectorAnimName,false,true);
			});
		}
		return;
	}
	private setPreviewSprite(){
		if(this.setGetSpine() != null){
			let state = "static_spin";
			this.setUpSpineBeforePlaySet(state);
			this._main_spine?.setPlayWithDelay(state, 0, false);
			this._main_spine?.update(0);
		}else{
			fp_error.onerror("Truck.setPreviewSprite() - no spine found "+ this.LibSym.toLocaleLowerCase());
		}
	}
}