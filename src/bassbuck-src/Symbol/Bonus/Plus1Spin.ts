import { Point, Sprite } from "pixi.js";
import { gfxsym } from "../Core/GraphicSymbol";
import { SPIN_EVENT } from "../../../globals/events";
import { fpglobals } from "../../../globals/fpglobals";
import { fp_error } from "../../../globals/fp_error";

export class Plus1Spin extends gfxsym {
    constructor(_LibSym: string, _pos: Point, cashValue: number = 0, feature: boolean, dummy = false, SymProp: any = null) {
        super(_LibSym, _pos, cashValue, feature, dummy, SymProp);
		this._spine_WinAnimName = "activate";
        return;
    }
	
	private setPreviewSprite(){
		if(this.setGetSpine() != null){
			let state = "static_spin";
			this.setUpSpineBeforePlaySet(state);
			this._main_spine?.setPlayWithDelay(state, 0, false);
			this._main_spine?.update(0);
		}else{
			fp_error.onerror("Plus1Spin.setPreviewSprite() - no spine found plusonespin");
		}
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
	public override setActionsAfterBonusSpinDraw(): void {
		fpglobals.SpinEE.emit(SPIN_EVENT.FG_PLUSONE_APPEAR);
		this.setStartActivateAnimation();
		this.setZIndexWinFor(1000);
	}
} 