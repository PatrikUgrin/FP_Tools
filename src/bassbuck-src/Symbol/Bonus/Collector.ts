import { Point, Sprite } from "pixi.js";
import { BuckSymbol } from "./BuckSymbol";

export class Collector extends BuckSymbol{
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, feature:boolean, dummy = false, SymProp : any = null){
		if(cashValue == -1){cashValue = 0;}
		super(_LibSym, _pos, cashValue, feature, dummy, SymProp);
		this.sortableChildren = true;
		return;
	}
	protected override setUpSpineBeforePlaySet(animName: string): void {
		let spine = this._main_spine!;
		spine.skeleton.setSkinByName("collector");
		spine.update(0);
		return;
	}
}