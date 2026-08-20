import { Point, Sprite } from "pixi.js";
import { BuckSymbol } from "./BuckSymbol";
import { fpglobals } from "../../../globals/fpglobals";
import { log } from "../../../globals/dev/log";

export class Dropshot extends BuckSymbol {
    constructor(_LibSym: string, _pos: Point, cashValue: number = 0, feature: boolean, dummy = false, SymProp: any = null) {
        super(_LibSym, _pos, cashValue, feature, dummy, SymProp);
        this.isDropshot = true;
        return;
    }
    protected override setUpSpineBeforePlaySet(animName: string): void {
        let spine = this._main_spine!;
        spine.skeleton.setSkinByName("dropshot");
        spine.update(0);
		
		fpglobals.GLog("Dropshot setUpSpineBeforePlaySet, animName: " + animName, log.type.EXCEPTION);
        return;
    }
	public override setAnimationPlay(animName: string, loop: boolean, clearPrevious: boolean, delay: number): void {
		super.setAnimationPlay(animName, loop, clearPrevious, delay);
		fpglobals.GLog("Dropshot setAnimationPlay, animName: " + animName, log.type.EXCEPTION);
		return;
	}
	
	
	
} 