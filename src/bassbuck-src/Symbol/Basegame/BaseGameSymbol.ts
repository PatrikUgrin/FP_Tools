import { Point, Sprite, Texture } from "pixi.js";
import { gfxsym, SYMBOL_STATE } from "../Core/GraphicSymbol";
import { ggTween } from "../../../globals/time/ggTween";
import { fpglobals } from "../../../globals/fpglobals";
import { SymbolProperty } from "../Core/SymbolProperty";
import { fp_error } from "../../../globals/fp_error";
import { log } from "../../../globals/dev/log";


export class BaseGameSymbol extends gfxsym{
	
	///This should include base game symbols only
	
	private _slot_name_bg : string = "sym_background";
	private _slot_name_bg2 : string = "sym_background_2";
	private _slot_name_main1 : string = "sym_main";
	private _slot_name_main2 : string = "sym_main_2"; 
	private _slot_name_glow : string = "sym_glow"; 
	private _slot_name_glow2 : string = "sym_glow_2"; 
	
	
	private _ColourPerSymbol : any = {
		"l1" : 0xA56B2D, //darker orange
		"l2" : 0x1FB05C, //darker green
		"l3" : 0x3399A3, //darker blue
		"l4" : 0x933A9E,  //darker medium orchid
		"h1" : 0xC98637, //orange
		"h2" : 0x29D871, //green
		"h3" : 0x40BFC9, //blue
		"h4" : 0xB448C1  //medium orchid
	}
	//colours are for colouring attachments in slots
	// symbol_inner_glow_thin
	// symbol_inner_glow
	// symbol_afterglow_1
	// symbol_afterglow_2
	// symbol_afterglow_3
	
	
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, dummy = false, SymProp : SymbolProperty | null = null){
		super(_LibSym, _pos, cashValue, false, dummy, SymProp);
		return;
	}
	
	public override getSpriteName(): string {
		return this.LibSym.toLowerCase();
	}
	public override setSymbolSprite(appear = false): void {
		try{
			const anchor = 0.5;
			this._spine_WinAnimName = "win";
			
			if(this.SymProperty.preview){
				this.setPreviewSprite();
				return;
			}
			
			//sprite bg if any
			//let bg_name = this.getSpriteNameBG();
			//this.main_sprite = Sprite.from(bg_name);
			//this.addChild(this.main_sprite);
			//this.main_sprite.anchor.x = anchor;
			//this.main_sprite.anchor.y = anchor;
			//
			//let parent_to_add = this.main_sprite; //add to main sprite overlay
			//if(parent_to_add == null){
			//	parent_to_add = this;
			//}
			let parent_to_add = this;
			
			let spr_name = this.getSpriteName(); //TODO refactor
			if(appear){
				spr_name += "_appear";
			}
			let main_img = null;
			try{
				main_img = Sprite.from(spr_name);
			} catch(e){
				fp_error.onerror("error symbol sprite["+ spr_name+"] setting : "+ e);
			}
			parent_to_add!.addChild(main_img!);
			main_img!.anchor.x = anchor;
			main_img!.anchor.y = anchor;
			
			if(this.main_sprite == null){
				this.main_sprite = main_img;
			}else{
				parent_to_add.removeChild(this.main_sprite);
				this.main_sprite = main_img;
			}
		}
		catch(e){
			fp_error.onerror("error symbol sprite setting : "+ e);
		}
	}
	
	public override getIsReplacedByBlankOnBonusIntro() : boolean{
		return true;
	}
	
	private setPreviewSprite(){
		if(this.setGetSpine() != null){
			let state = this._spine_static_spin;
			this.setUpSpineBeforePlaySet(state);
			this._main_spine?.setPlayWithDelay(state, 0, false);
			this._main_spine?.update(0);
		}else{
			fp_error.onerror("BaseGameSymbol.setPreviewSprite() - no spine found "+ this.LibSym.toLocaleLowerCase());
		}
	}
	
	protected override setUpSpineBeforePlaySet(animName : string): void {
		//set u p  the layers
		let spine = this._main_spine!;
		//let active = this.isInsidePlayfield;
		
		spine.skeleton.setSkinByName(this.LibSym.toLowerCase());
		
		//symbol specific textures
		//let tex_bg = 			Texture.from(this.LibSym.toLowerCase()+"_bg.png");
		//let tex_main = 			Texture.from(this.LibSym.toLowerCase()+".png");
		//let tex_glow = 			Texture.from(this.LibSym.toLowerCase()+"_glow.jpg");
		//
		////Background
		//spine.hackTextureBySlotName(this._slot_name_bg, tex_bg, tex_bg.orig);
		//spine.hackTextureBySlotName(this._slot_name_bg2, tex_bg, tex_bg.orig);
		//
		////main
		//spine.hackTextureBySlotName(this._slot_name_main1, tex_main, tex_main.orig);
		//spine.hackTextureBySlotName(this._slot_name_main2, tex_main, tex_main.orig);
		//
		////glow
		//spine.hackTextureBySlotName(this._slot_name_glow, tex_glow, tex_glow.orig);
		//spine.hackTextureBySlotName(this._slot_name_glow2, tex_glow, tex_glow.orig);
		//
		//let color = this._ColourPerSymbol[this.LibSym.toLowerCase()];
		
		//let success = spine.setColourPerSlot("symbol_outer_glow", color);
		//if(!success){
		//	fpglobals.GLog("error setting colour per slot: symbol_outer_glow", log.type.ERROR);
		//}
		//success = spine.setColourPerSlot("symbol_inner_glow", color);
		//if(!success){
		//	fpglobals.GLog("error setting colour per slot: symbol_inner_glow", log.type.ERROR);
		//}
		//success = spine.setColourPerSlot("symbol_afterglow_1", color);
		//if(!success){
		//	fpglobals.GLog("error setting colour per slot: symbol_afterglow_1", log.type.ERROR);
		//}
		//success = spine.setColourPerSlot("symbol_afterglow_2", color);
		//if(!success){
		//	fpglobals.GLog("error setting colour per slot: symbol_afterglow_2", log.type.ERROR);
		//}
		//success = spine.setColourPerSlot("symbol_afterglow_3", color);
		//if(!success){
		//	fpglobals.GLog("error setting colour per slot: symbol_afterglow_3", log.type.ERROR);
		//}
		
		spine.update(0);
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
		
		let toPlayFunc = ()=>{
			node.main_sprite.visible = false;
			node.visible = true;
			node.SymState = SYMBOL_STATE.WIN_MARKING;
			node.setAnimationPlay(node._spine_ClearWeedEndAnimName, false, true);
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
	
	protected override afterSpinAnimatorEnd(){
		this.main_sprite.visible = false;
		this.setAnimationPlay("appear");
		this.main_sprite.visible = true;
		//this._ex_tweens
		
		let tweener = new ggTween({time : 0}, fpglobals._GROUP);
		tweener.to({time : 1}, 500);
		tweener.onComplete(()=>{
			this.setSymbolSprite(false);
			this.setRemoveSpinePlayer();
		});
		tweener.start(fpglobals.masterTicker.last_scaled_time);
		this._ex_tweens.push(tweener);
		return;
	}
	protected override beforeSpinAnimatorStart(){
		this.main_sprite.visible = true;
		this.setSymbolSprite(true);
		return;
	}
	
	
}