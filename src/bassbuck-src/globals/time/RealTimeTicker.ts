import * as PIXI from "pixi.js";
import { Group } from "@tweenjs/tween.js";
import { ggGroup } from "./ggGroup";
import { fpglobals } from "./../fpglobals";

/**
 * A ticker that runs in real time and is not affected by the MasterTicker's timescale
 * Used for effects that should run at consistent speed regardless of game slowdown effects
 */
export class RealTimeTicker {
    private static _instance: RealTimeTicker;
    private _ticker: PIXI.Ticker;
    private _group: ggGroup;
    
    private constructor() {
        this._ticker = new PIXI.Ticker();
        this._ticker.maxFPS = 60;
        this._group = new ggGroup();
        
        // Add the update function to the ticker
        this._ticker.add(() => {
            this._group.update(this._ticker.lastTime);
        });
        
        // Start the ticker immediately
        this._ticker.start();
        
        fpglobals.GLog("RealTimeTicker initialized");
    }
    
    /**
     * Get the singleton instance
     */
    public static get instance(): RealTimeTicker {
        if (!RealTimeTicker._instance) {
            RealTimeTicker._instance = new RealTimeTicker();
        }
        return RealTimeTicker._instance;
    }
    
    /**
     * Get the real-time ticker
     */
    public get ticker(): PIXI.Ticker {
        return this._ticker;
    }
    
    /**
     * Get the real-time group for tweens
     */
    public get group(): ggGroup {
        return this._group;
    }
    
    /**
     * Add a function to the ticker
     */
    public add(fn: (deltaTime: number) => void, context?: any): this {
        this._ticker.add(fn, context);
        return this;
    }
    
    /**
     * Remove a function from the ticker
     */
    public remove(fn: (deltaTime: number) => void, context?: any): this {
        this._ticker.remove(fn, context);
        return this;
    }
    
    /**
     * Start the ticker if it's stopped
     */
    public start(): this {
        if (!this._ticker.started) {
            this._ticker.start();
        }
        return this;
    }
    
    /**
     * Stop the ticker
     */
    public stop(): this {
        this._ticker.stop();
        return this;
    }
} 