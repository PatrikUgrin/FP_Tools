import { Tween } from "@tweenjs/tween.js";
import { Group } from "@tweenjs/tween.js";
import { ggGroup } from "./ggGroup";

export class ggTween extends Tween<any> {

    constructor(target: any, props: any) {
        super(target, props);
    }
    //on start by default is set _startTime to current time
    //instead we want to set _startTime to the current time of the ticker
    public override start(time?: number, overrideStartingValues?: boolean): this {
		if(time == undefined){
			throw new Error("ggTween.start() called with undefined time");
		}
		super.start(time, overrideStartingValues);
        return this;
    }
}