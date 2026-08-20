import { Group } from "@tweenjs/tween.js";

//TweenGroup is a custom group class that extends the Tween.js Group class.
export class ggGroup extends Group {
    private lastTime: number = 0;
    constructor() {
        super();
    }
    public override add(target: any): void {
        super.add(target);
    }
    public updateDelta(deltaMS: number, preserve?: boolean): boolean {
        const currentTime = this.lastTime + deltaMS;
        const result = super.update(currentTime, preserve);
        this.lastTime = currentTime;
        return result;
    }
    public override update(time?: number, preserve?: boolean): boolean {
        if (time !== undefined) {
            this.lastTime = time;
        }
        return super.update(time, preserve);
    }
    
}
