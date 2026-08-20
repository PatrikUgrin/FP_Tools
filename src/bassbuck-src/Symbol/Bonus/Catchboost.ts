import { Point, Sprite } from "pixi.js";
import { BuckSymbol } from "./BuckSymbol";


export class Catchboost extends BuckSymbol{
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, feature:boolean, dummy = false, SymProp : any = null){
		super(_LibSym, _pos, cashValue, feature, dummy, SymProp);
		this.isCatchboost = true;
		return;
	}
	protected override setUpSpineBeforePlaySet(animName: string): void {
		let spine = this._main_spine!;
		spine.skeleton.setSkinByName("catchboost");
		spine.update(0);
		return;
	}
}