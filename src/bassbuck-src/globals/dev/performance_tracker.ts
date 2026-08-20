import { log } from "./log";

export class performance_tracker{
	public  deltaSum = 0;
	public  all_deltas = new Array<number>();
	public  time = 0.0;
	public  last_time = 0.0;
	
	private  every_bs_frames_tracker = 0; //every buffer size frame tracker
	private  buffer_size = 1023;
	
	private name = "";
	
	constructor(name : string){
		this.name = name;
		this.RESET();
	}
	
	public RecordDelta(delta : number){
		//save difference between last TIME and current TIME
		this.time = performance.now();
		this.all_deltas.push(	this.time - 	this.last_time);
		this.deltaSum += 		this.time - 	this.last_time;
		this.last_time = 		this.time;
		
		this.every_bs_frames_tracker++;
		
		if(this.all_deltas.length > this.buffer_size){
			let toDel = this.all_deltas.shift();
			this.deltaSum -= toDel!;

		}
		if(	this.every_bs_frames_tracker > this.buffer_size){
			this.REPORT();
			let strToRet = this.GetAverageDelta().toString();
			//shorten to 5 chars
			if(strToRet.length > 5){
				strToRet = strToRet.substring(0,5);
			}
			this.every_bs_frames_tracker = 0;
			return strToRet; 
		}
		else {return "NaN";}
	}
	public GetAverageDelta(){
		//get avg delta
		return this.deltaSum / this.all_deltas.length;
	}
	public REPORT(){
		log.log("AVG DELTA: " +		this.GetAverageDelta(), log.type.PERFORMANCE);
		log.log("AVG FPS: " + 1000 / this.GetAverageDelta(), log.type.PERFORMANCE);
		//get top 10% of deltas
		let top10 = this.all_deltas.sort((a,b) => b-a).slice(0,this.all_deltas.length/10);
		let top10sum = 0;
		for(let i = 0; i < top10.length; i++){
			top10sum += top10[i];
		}
		log.log("TOP 10% AVG DELTA: " + top10sum / top10.length, log.type.PERFORMANCE);
		//get top 1% of deltas
		let top1 = this.all_deltas.sort((a,b) => b-a).slice(0,this.all_deltas.length/100);
		let top1sum = 0;
		for(let i = 0; i < top1.length; i++){
			top1sum += top1[i];
		}
		log.log("TOP 1% AVG DELTA: " + top1sum / top1.length, log.type.PERFORMANCE);
		//get top 0.1% of deltas
		let top01 = this.all_deltas.sort((a,b) => b-a).slice(0,this.all_deltas.length/1000);
		let top01sum = 0;
		for(let i = 0; i < top01.length; i++){
			top01sum += top01[i];
		}
		log.log("TOP 0.1% AVG DELTA: " + top01sum / top01.length, log.type.PERFORMANCE);
		
	}
	
	public RESET(){
		this.deltaSum = 0;
		this.all_deltas = new Array<number>();
		this.time = performance.now();
		this.last_time = 0.0;
	}
	
}

