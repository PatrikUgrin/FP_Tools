import { Graphics, Point, Sprite } from "pixi.js";
import { ggTween } from "../../../globals/time/ggTween";

import { fpglobals } from "../../../globals/fpglobals";
import { gfxsym, SYMBOL_STATE } from "../Core/GraphicSymbol";
import { CollSYM } from "../../BaseGame/BGWin";
import { timing } from "../../timing/timing";
import { fp_error } from "../../../globals/fp_error";



//THIS IS BASE GAME COLLECTOR
export class SmallWild extends gfxsym{
	
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, feature : boolean, dummy = false, SymProp : any = null){
		super(_LibSym, _pos, cashValue, feature, dummy, SymProp);
		this.isOversized = true;
		this._spine_WinGenAnimName = "action_create_wild";
		this._spine_WinAnimName = "win_wild";
		this._spine_ConvertToBlankAnimName = "convert_to_blank_wild";
		
		//for debug add a graphic node, green colored rectangle
	//	let rect = new Graphics();
	//	rect.beginFill(0x00ff00);
	//	rect.drawRect(0,0,100,100);
	//	rect.endFill();
	//	this.main_sprite.addChild(rect);
		
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
			let state = "static_wild";
			this.setUpSpineBeforePlaySet(state);
			this._main_spine?.setPlayWithDelay(state, 0, false);
			this._main_spine?.update(0);
		}else{
			fp_error.onerror("BaseWild.setPreviewSprite() - no spine found "+ this.LibSym.toLocaleLowerCase());
		}
	}
	public override getIsReplacedByBlankOnBonusIntro() : boolean{
		return true;
	}
	
	override setUpSpineBeforePlaySet(animName : string): void {
		//this._main_spine?.skeleton.setSkinByName("wild");
	}
		
	protected override afterSpinAnimatorEnd(){
		if(this.isInsidePlayfield){
		//	this.setAnimationPlay("static_wild", false);
			this.setAnimationPlay("appear_wild", false);
			let node = this;
			if(true){
				this.callbackAfter(500, () => { //this does not work! Because on cascade the symbol gets replaced by another one!
					node.setRemoveSpinePlayer();
					node.setSymbolSprite();
				});
			}
		}
	}
	
}