import { fp_error } from "../fp_error";
import { ggGroup } from "../time/ggGroup";
import { ggTicker } from "../time/ggTicker";
import { ggTween } from "../time/ggTween";
import { MasterTicker } from "../time/MasterTicker";

/**
 * High-precision audio scheduler that doesn't rely on game tickers
 * Uses setTimeout for accurate timing between sequential sounds
 */
export class AudioScheduler {
	private scheduledCallbacks: Map<string, any> = new Map();
	private name: string;
	private ticker_group : ggGroup | null = null;
	private ticker : MasterTicker | null = null;
    private isTickerBased : boolean = false;
	
    private tweens: Map<string, { tween: ggTween, progress: any }> = new Map();
	
	//functions to call on each frame
	private onEachFrameCallbacks: Map<string, () => void> = new Map();
	
	constructor(name: string, _group : ggGroup | null = null, ticker : MasterTicker | null = null) {
		this.name = name;
        if(_group){
            this.ticker_group = _group;
            this.isTickerBased = true;
			this.ticker = ticker;
			
			if(ticker){
				ticker.add(()=>{
					this.onEachFrame();
				});
			}
        }
		//if there is ticker there must be group
		//else throw
		if(ticker != null && _group == null){
			fp_error.onerror("AUDIOSCHEDULER ERROR, ticker is not null but group is null");
		}else if(ticker == null && _group != null){
			fp_error.onerror("AUDIOSCHEDULER ERROR, ticker is null but group is not null");
		}
	}
	
	public addOnEachFrameCallback(id: string, callback: () => void) {
		this.onEachFrameCallbacks.set(id, callback);
	}
	
	public removeOnEachFrameCallback(id: string) {
		this.onEachFrameCallbacks.delete(id);
	}
	
	public onEachFrame() {
		this.onEachFrameCallbacks.forEach((callback) => {
			callback();
		});
	}
	
	/**
	 * Schedule a callback to be executed at a precise time
	 * @param id Unique identifier for this scheduled callback
	 * @param callback Function to call when the time elapses
	 * @param delayMs Time in milliseconds to wait before executing the callback
	 */
	public scheduleCallback(id: string, callback: () => void, delayMs: number) {
		// Cancel any existing callback with the same ID
		this.cancelScheduledCallback(id);
		
        if(this.isTickerBased){
			const progress = { progress: 0 };
			const tween = new ggTween(progress, this.ticker_group);
			tween.to({progress: 1}, delayMs);
			tween.onComplete(() => {
				this.tweens.delete(id);
				callback();
			});
			tween.start(this.ticker!.last_scaled_time);
			this.tweens.set(id, { tween, progress });
        }else{
            // Schedule new callback
            const timeoutId = setTimeout(() => {
                this.scheduledCallbacks.delete(id);
                callback();
            }, delayMs);
			
			this.scheduledCallbacks.set(id, timeoutId);
		}
		return id;
	}
	
	public getCurrentProgress(id: string){
		if(this.isTickerBased){
			const tweenData = this.tweens.get(id);
			return tweenData ? tweenData.progress.progress : 0;
		}else{
			return 0; //TODO for non-ticker based || maybe not needed
		}
	}
	
	/**
	 * Cancel a previously scheduled callback
	 * @param id Identifier of the callback to cancel
	 */
	public cancelScheduledCallback(id: string) {
		if(this.isTickerBased){
			const tweenData = this.tweens.get(id);
			if(tweenData){
				tweenData.tween.stop();
				this.tweens.delete(id);
			}
		}else{
			if (this.scheduledCallbacks.has(id)) {
				clearTimeout(this.scheduledCallbacks.get(id));
				this.scheduledCallbacks.delete(id);
			}
		}
	}
	
	/**
	 * Cancel all scheduled callbacks
	 */
	public cancelAll() {
		if(this.isTickerBased){
			this.tweens.forEach((tweenData) => {
				tweenData.tween.stop();
			});
			this.tweens.clear();
		}else{
			this.scheduledCallbacks.forEach((timeoutId) => {
				clearTimeout(timeoutId);
			});
			this.scheduledCallbacks.clear();
		}
	}
}