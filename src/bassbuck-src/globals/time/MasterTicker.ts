import { Application } from "pixi.js";
import { ggTicker } from "./ggTicker";
import { fpglobals } from "./../fpglobals";
import { ggGroup } from "./ggGroup";


//master application ticker
export class MasterTicker extends ggTicker {
	static instance : MasterTicker;
	public app : Application;
	private _timescale: number = 1.0;
	private _GROUP : ggGroup;
	
	constructor() {
		super();
		this.allTickers = new Array<ggTicker>();
		if(!MasterTicker.instance){
			MasterTicker.instance = this;
		}else{
			throw new Error("MasterTicker already exists");
		}
		this._GROUP = new ggGroup();
		fpglobals._GROUP = this._GROUP;
	}
	
	/**
	 * Get the current timescale
	 * @returns The current timescale value
	 */
	public get timescale(): number {
		return this._timescale;
	}
	
	/**
	 * Set the timescale for all tickers
	 * @param value The new timescale value
	 */
	public set timescale(value: number) {
		this._timescale = Math.max(0.01, value); // Prevent negative or zero timescale
	}
	
	/**
	 * Static method to get the current timescale
	 * @returns The current timescale value
	 */
	public static get timescale(): number {
		return MasterTicker.instance.timescale;
	}
	
	/**
	 * Static method to set the timescale for all tickers
	 * @param value The new timescale value
	 */
	public static set timescale(value: number) {
		MasterTicker.instance.timescale = value;
	}
	
	public allTickers : Array<ggTicker> = [];
	public allTickersPostUpdate : Array<ggTicker> = [];
	public allTickersPreUpdate : Array<ggTicker> = [];
	
	public addTicker(ticker : ggTicker){
		this.allTickers.push(ticker);
	}
	public addTickerPostUpdate(ticker : ggTicker){
		this.allTickersPostUpdate.push(ticker);
	}
	public addTickerPreUpdate(ticker : ggTicker){
		this.allTickersPreUpdate.push(ticker);
	}
	static addTicker(ticker : ggTicker){
		MasterTicker.instance.addTicker(ticker);
	}
	
	
	//we keep track of real time and internal time
	//when updating we comapred time elapsed between real time and last time
	//for our internal time we apply the timescale to the delta between real time and last time
	//then we add scaled time to our internal time
	//we update tickers with scaled time
	
	private last_real_time : number = 0;
	public last_scaled_time : number = 0;
	
	// Maximum allowed delta per tick, in ms.
	// Anything larger (debugger break, tab backgrounding, GC pause, etc.)
	// is clamped so the synthetic app-time clock does not leap forward.
	public static MAX_DELTA_MS : number = 40;
	
	
	public override update(){
		super.update();
		// Apply timescale to lastTime for all tickers
		//const scaledTime = this._timescale > 0 ? this.lastTime * this._timescale : this.lastTime;
		
		// Seed last_real_time on the first tick so we don't book a huge
		// delta accumulated from t=0 up to the first update().
		if(this.last_real_time === 0){
			this.last_real_time = this.lastTime;
		}
		
		let delta_time = this.lastTime - this.last_real_time;
		if(delta_time < 0){ delta_time = 0; }
		if(delta_time > MasterTicker.MAX_DELTA_MS){ delta_time = MasterTicker.MAX_DELTA_MS; }
		
		const scaled_delta_time = delta_time * this._timescale;
		this.last_scaled_time += scaled_delta_time;
		this.last_real_time = this.lastTime;
		
		this.last_scaled_time; //this enables the use of ggTween.start(fpglobals.masterTicker.last_scaled_time);
		//also only advances time properly when slow motion is active
		this.preUpdate(this.last_scaled_time);
		for(let i = 0; i < this.allTickers.length; i++){
			this.allTickers[i].update(this.last_scaled_time);
		}
		this.postUpdate(this.last_scaled_time);
	}
	
	private preUpdate(scaledTime : number){
		// Apply timescale to lastTime for pre-update tickers
		for(let i = 0; i < this.allTickersPreUpdate.length; i++){
			this.allTickersPreUpdate[i].update(scaledTime);
		}
	}
	
	private postUpdate(scaledTime : number){
		// Apply timescale to lastTime for post-update tickers
		for(let i = 0; i < this.allTickersPostUpdate.length; i++){
			this.allTickersPostUpdate[i].update(scaledTime);
		}
	}
	
}



