import { Point, Sprite, Texture } from "pixi.js";
import { gfxsym, SYMBOL_STATE } from "../Core/GraphicSymbol";
import { SPIN_EVENT } from "../../../globals/events";
import { fpglobals } from "../../../globals/fpglobals";
import { fp_error } from "../../../globals/fp_error";
import { timing } from "../../timing/timing";
import { ggTween } from "../../../globals/time/ggTween";

export class BuckSymbol extends gfxsym{
	
	//Spine slot replacements
	public _spine_slot_bg : string = "symbol_bg"; 
	public _spine_slot_txt : string = "symbol_txt";
	public _spine_slot_buck : string = "buck"; 

	override _spine_WinAnimName : string 					= "collect";
	override _spine_WinCollectorAnimName : string 			= "collect";
	override _spine_WinCollectorAnimName_static : string 	= "collect";

	override _zIndexWinsOffset : number = 2000;

	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, feature:boolean, dummy = false, SymProp : any = null){
		super(_LibSym, _pos, cashValue, feature, dummy, SymProp);
		this.isBuckSymbol = true;
		this.setZIndex(null);
		return;
	}



	//Spine needss replacing textures before running

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
			fp_error.onerror("BuckSymbol.setPreviewSprite() - no spine found "+ this.LibSym.toLocaleLowerCase());
		}
	}
	
	public override setZIndexWins(active: boolean, offset: number = 0): void {
		if(active){
			if(this.zIndex < 2000){
				this.zIndex += 2000 + offset;
			}
		}else{
			if(this.zIndex > 2000){ //only over 1000 is wins
				this.zIndex -= 2000 + offset;
			}
		}
	}
	
	public override setPlayCollectorHit(allcoll_delays : Array<number>, allCollNums : Array<number>){
		//collector hit in bonus is "collect_add"
		for(let i = 0; i < allcoll_delays.length; i++){
			let anim_name = this._spine_WinCollectorAnimName;
			if(i == allcoll_delays.length-1){
	//			anim_name = this._spine_ClearWeedEndAnimName; //TODO check implementation
			}
			let delay = allcoll_delays[i];
			this.callbackAfter(delay, ()=>{
				this.main_sprite.visible = false;
				this.text_node.visible = false;
				this.setAnimationPlay(anim_name,false,true);
			});
		}
		return;
	}
	public override setActionsAfterBonusSpinDraw(): void {
		fpglobals.SpinEE.emit(SPIN_EVENT.FG_BUCK_APPEAR);
		this.setStartActivateAnimation();
	}
	override setStartActivateAnimation(is_sixpack : boolean = false, delay : number = 0){
		if(delay > 0){
			this.logSpineAnimationScheduled("setStartActivateAnimation", this._spine_appear_animation_name, delay);
		}
		let function_to_call = ()=>{
		if(!is_sixpack){
			this.setZIndexWinFor(1000);
			this.setAnimationPlay(this._spine_appear_animation_name, false, false);
			
			let loop_func = ()=>{
				this.setAnimationPlay(this._spine_appear_loop_animation_name, true);
			};
			this.callbackAfter(1000, loop_func); //not sure if this is ok
			
		}else{
			this.setAnimationPlay("reactivate", false, false);
			this.setZIndexWins(true);
			fpglobals.SpinEE.emit(SPIN_EVENT.FG_BUCK_REVIVE);
			{
				let _func_appear = ()=>{
					this.setAnimationPlay(this._spine_appear_animation_name, false, true);
				};
				this.callbackAfter(1650, _func_appear);
			}
			{
				let _func_appear = ()=>{
					this.setAnimationPlay(this._spine_appear_loop_animation_name, true, false);
				};
				this.callbackAfter(2650, _func_appear);
			}
		}
		this.main_sprite.visible = false;
		}
		if(delay > 0){
			this.callbackAfter(delay, function_to_call);
		}else{
			function_to_call();
		}
	}
	
	protected override setUpSpineBeforePlaySet(animName: string): void {
		this.main_sprite.visible = false;
		return;
	}
	
	public override playCollectedAnimation(delay : number = 0){
	//	this.setAnimationPlay(this._spine_WinCollectorAnimName, false, true);
		let animToPlay = this._spine_WinCollectedAnimName;
		if(this.SymProperty.Used == false){
			animToPlay = this._spine_WinCollectedAnimName_activated;
		}
		if(delay > 0){
			this.logSpineAnimationScheduled("playCollectedAnimation", animToPlay, delay);
		}
		if(delay > 0){
			this.callbackAfter(delay, ()=>{
				this.setAnimationPlay(animToPlay, false, false);
			});
		}else{
			this.setAnimationPlay(animToPlay, false, false);
		}
	}
	
	
	public override playBonusCollectorBuckClear(){
		
		let node = this;
		let thisTime = 2000;
		let delayToAdd = 0;
		
		
		let cum_delay = 0;
		
		let progress = {time : 0};
		let tween = new ggTween(progress, fpglobals._GROUP);
		tween.delay(cum_delay);
		tween.to({time: 1}, thisTime);
		tween.onStart(()=>{
			let animToPlay = node._spine_buck_clear_AnimName;
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
		
		return;
	}
	
	
	
	//protected override setUpSpineBeforePlaySet(animName: string): void {
	//	return;
	//	let tex_bg = Texture.from(this.LibSym.toLowerCase() + "_bg.png");
	//	let tex_txt = Texture.from(this.LibSym.toLowerCase() + "_txt.png");
	//	let tex_buck = Texture.from(this.LibSym.toLowerCase() + "_buck.png");
//
	//	//this._main_spine!.hackTextureBySlotName(this._spine_slot_bg, tex_bg, tex_bg.orig);
	//	//this._main_spine!.hackTextureBySlotName(this._spine_slot_txt, tex_txt, tex_txt.orig);
	//	//this._main_spine!.hackTextureBySlotName(this._spine_slot_buck, tex_buck, tex_buck.orig);
	//	this._main_spine!.hackTextureBySlotName("symbol_bg", tex_bg, tex_bg.orig);
	//	this._main_spine!.hackTextureBySlotName("symbol_txt", tex_txt, tex_txt.orig);
	//	this._main_spine!.hackTextureBySlotName("buck", tex_buck, tex_buck.orig);
//
	//	this._main_spine!.update(0);
	//}
	
}