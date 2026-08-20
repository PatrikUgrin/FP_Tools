import { Container, Point, Sprite } from "pixi.js";
import { gfxsym } from "../Core/GraphicSymbol";
import { getFeatureSpriteName } from "../../../globals/assets";


export class Blank extends gfxsym{
	
	///This should include base game symbols only
	
	
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, isFeature : boolean, dummy = false, SymProp : any = null){
		super(_LibSym, _pos, cashValue, isFeature, dummy, SymProp);
		
		return;
	}
	
	override setSymbolSprite(): void {
		if(this.isFeature){
			if(this.main_sprite){
				this.main_sprite.parent.removeChild(this.main_sprite);
				this.main_sprite = null;
			}
			let spritename = getFeatureSpriteName(this.LibSym, false, this.pos.y > 3);
			this.main_sprite = Sprite.from(spritename);
			this.addChild(this.main_sprite);
			this.main_sprite.anchor.set(0.5);
			this.main_sprite.position.set(0, 0);
			this.main_sprite.name = this.LibSym;
			this.main_sprite.visible = true;
		}
		else {
			this.main_sprite = new Container();
			this.addChild(this.main_sprite);
			this.visible = true;
			return;
		}
	}
	
	override getIsReplacedByBlankOnBonusIntro(): boolean {
		return true; //blank is replaced by bonus blank
	}
	
	protected override setUpSpineBeforePlaySet(animName : string): void {
		let spine = this._main_spine!;
		spine.skeleton.setSkinByName("blank");
		spine.update(0);
	}
}