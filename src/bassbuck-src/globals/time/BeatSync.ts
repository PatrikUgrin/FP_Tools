//Beat synchronization

import { Tween } from "@tweenjs/tween.js";

//A simple timer updated by ticker
//A beat time interval
// Main purpose is to sync bonus game ON STATE animation with each symbol that is ON STATE
// can be used for other animations as well

class BeatSync {
    private _beatTimeDuration: number; //on how many ms the beat is
    private _beatProgress: number;
    private _tween: Tween<any>;

    constructor(beatTimeDuration: number) {
        this._beatTimeDuration = beatTimeDuration;
        this._beatProgress = 0;
    }

    public start() {
        // Create an object to tween
        const tweenObj = { progress: 0 };
        
        // Create the tween
        this._tween = new Tween(tweenObj)
            .to({ progress: this._beatTimeDuration }, this._beatTimeDuration)
            .onUpdate(() => {
                this._beatProgress = tweenObj.progress;
            })
            .repeat(Infinity) // Make it loop forever
            .start();
    }

    public getBeatProgress() {
        return this._beatProgress;
    }

    public stop() {
        if (this._tween) {
            this._tween.stop();
        }
    }
}

export default BeatSync;








