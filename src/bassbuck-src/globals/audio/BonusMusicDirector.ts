import { fpaudio, SOUND_TYPE } from "./fpaudio";
import { AudioScheduler } from "./AudioScheduler";
import { fpglobals } from "../fpglobals";
import { UI_EVENT, SPIN_EVENT } from "../events";
import { log } from "../dev/log";
import { SlowMotion } from "../../effects/SlowMotion";
import { fg_music_short_end_track_time } from "../../reelspin/timing/timingConst";
import { ggTween } from "../time/ggTween";


export enum BONUSMUSIC_PARAM {
	START, //init start
	NORMAL_LOOP, //we continue to next loop
	//REACT_INTERRUPT,
	START_END, //start end for last spin
	RESUME,
	STOP,
	
	START_AFTER_END, //start after end for last spin
	
	//Resume from last spin (recovery)
	RESUME_LAST_SPIN
}

enum MusicState {
	RUNNING_INTRO, //running _intro
	RUNNING_LOOP, //running _loop
	RUNNING_END, //running _end
	
	RUNNING_AFTER_END, //running after end music, waiting for interrupt or end
	
	RUNNING_REACT, //running react sting before advancing stage
	PAUSED, //Pause is for bonus react interrupt
	STOPPED //Stop is on bonus end or reset to S1
}
export class BonusMusicDirector {
    
	public static IS_RUNNING : boolean = false; //global flag for switching between base and bonus
	
    private static audioScheduler: AudioScheduler;
	private static _currentAudio : string | null = null;
	private static _currentState : MusicState = MusicState.STOPPED;
	
	//progress trackers
	private static _current_stage : number = 0;  //S1, S2, S3
	private static _current_loop_count : number = 0; //how many loops we played
	private static _current_progress : number = 0; //current loop progress
	
	private static verbose_logging : boolean = true;
	
	
	//If slow motion, we set a flag | meaning during slowmotion we got a win
	public static _resume_as_resume_last_spin : boolean = false; //true == means its a win 
	
	public static param_end_time : number = 0;
	
	//special case scenario for slowmotion with no wins
	public static _restart_music_after_slowmotion : boolean = true; //preden launchamo spin, nastavimo flag,
	// pod pogojem da Current spin counter == 1 in ta spin dataset je no wins -> da po slowmotionu ignore music restart
	
	public static getisCurrentAudioThrillEnd(): boolean {
		if(BonusMusicDirector._currentState == MusicState.RUNNING_END){
			return true;
		}
		return false;
	}
	
	public static getCurrentAudioState(): MusicState {
		return BonusMusicDirector._currentState;
	}
    public static init() {
        this.audioScheduler = new AudioScheduler("bonusGameMusic", fpglobals._GROUP, fpglobals.masterTicker);
		this.audioScheduler.addOnEachFrameCallback("bonusMusicDirector", this.onEachFrame);
    }
	
	public static onEachFrame(){
		if(BonusMusicDirector.IS_RUNNING){
			if(SlowMotion.getIsActive()){
				//get rate
				let rate = SlowMotion.getSlowMotionRate(); //rate will always be between 0.0 and 1.0
				
				if(rate < 0.5){
					rate = 0.5;
				}
				let diff = 1.0 - rate;
				let calm_rate = rate + diff*0.5;
				
				//if rate = 0.5, then diff = 0.5, rate = 0.75
				//if rate = 0.75, then diff = 0.25, rate = 0.875
				
				//change both volume and rate
				fpaudio.SetRatePerType(BonusMusicDirector._currentAudio as SOUND_TYPE, calm_rate);
				fpaudio.SetVolumePerType(BonusMusicDirector._currentAudio as SOUND_TYPE, rate);
			}
			else{
				fpaudio.SetVolumePerType(BonusMusicDirector._currentAudio as SOUND_TYPE, 1);
			}
		}
	}
	
	public static setPlayNext(param : BONUSMUSIC_PARAM) {
		
		if(!fpaudio._music_playing){
			return;
		}
		let resetTrackers = false;
		if(param == BONUSMUSIC_PARAM.START){
			resetTrackers = true;
		}
		if(param == BONUSMUSIC_PARAM.RESUME_LAST_SPIN){
			fpaudio.StopSoundByType(this._currentAudio as SOUND_TYPE);
		}
		if(param== BONUSMUSIC_PARAM.NORMAL_LOOP){ //means track naturally ended
			if(this._currentState == MusicState.RUNNING_END){
				this.stopBonusMusic();
				return; //After running end should be called, not auto-play next
			}
		}
		
		if(this.verbose_logging){
			fpglobals.GLog(
				"Setting play next: " + param +
				" stage: " + this._current_stage +
				" loop count: " + this._current_loop_count,
				 log.type.BONUS_GAME_VERBOSE
			);
		}
		if(resetTrackers){
			fpaudio.StopAllSouds();
			this.resetTrackers();
		}
		if(param == BONUSMUSIC_PARAM.START_END){
			this._current_progress = this.getCurrentTrackProgress();
			fpaudio.StopSoundByType(this._currentAudio as SOUND_TYPE);
		}
		let nextAudio = this.getNextBonusSound(param);
		fpaudio.PlaySound(nextAudio, false, "", 1, 
			function(){
				BonusMusicDirector.setPlayNext(BONUSMUSIC_PARAM.NORMAL_LOOP);
			}
		);
		if(this.verbose_logging){
			fpglobals.GLog("Playing next audio: " + nextAudio, log.type.BONUS_MUSIC_LOG);
		}
		this._currentAudio = nextAudio;
	}	
	
	public static stopBonusMusic(){
		//fpaudio.StopAllSouds();
		fpaudio.StopSoundByType(this._currentAudio as SOUND_TYPE);
		this.resetTrackers();
		this._currentState = MusicState.STOPPED; //reset to S1
		if(this.verbose_logging){
			fpglobals.GLog("Stopping bonus music", log.type.BONUS_MUSIC_LOG);
		}
	}
	public static pauseBonusMusic(){ //Pause is not a pause, its a bonus react interrupt
		if(this._currentState == MusicState.PAUSED){return;}
		if(this.verbose_logging){
			fpglobals.GLog("Pausing bonus music", log.type.BONUS_MUSIC_LOG);
		}
		let lessThanHalf = false;
		if(this._currentState == MusicState.RUNNING_INTRO){
			lessThanHalf = true;
		}else if(this._currentState == MusicState.RUNNING_LOOP){
			let currentTime = fpaudio.getCurrentTrackTime(this._currentAudio as SOUND_TYPE);
			let trackLength = fpaudio.getTrackLength(this._currentAudio as SOUND_TYPE);
			if(currentTime! < trackLength / 2){
				lessThanHalf = true;
			}
		}//else if intro is already advance stage
		fpaudio.StopSoundByType(this._currentAudio as SOUND_TYPE);
		if(lessThanHalf){
			if(this._current_loop_count == 0){
				this._current_loop_count++;
			}else{
				this._currentState = MusicState.PAUSED;
				this.setAdvanceStage();
			}
			this._currentState = MusicState.PAUSED;
			return;
		}else{
			this.setAdvanceStage();
		}
		this._currentState = MusicState.PAUSED;//TODO unhandled scenario?
	}
	
	public static reactBonusMusic(){
		if(this.verbose_logging){
			fpglobals.GLog("React bonus music - stage: " + this._current_stage, log.type.BONUS_MUSIC_LOG);
		}
		//fpaudio.StopSoundByType(this._currentAudio as SOUND_TYPE);
		fpaudio.FadeOutSoundByType(this._currentAudio as SOUND_TYPE, false, 500);
		let crrAudio = this._currentAudio;
		BonusMusicDirector.setCallback(()=>{
			fpaudio.StopSoundByType(crrAudio as SOUND_TYPE);
		}, 500);
		let reactAudio = this.getAudioReact(this._current_stage);
		this._currentState = MusicState.RUNNING_REACT;
		fpaudio.PlaySound(reactAudio, false, "", 1,
			function(){
				BonusMusicDirector.setAdvanceStage();
				BonusMusicDirector.setPlayNext(BONUSMUSIC_PARAM.RESUME);
			}
		);
		this._currentAudio = reactAudio;
		if(this.verbose_logging){
			fpglobals.GLog("Playing react audio: " + reactAudio, log.type.BONUS_MUSIC_LOG);
		}
	}
	
	public static setEnd(time : number, win : boolean, totalTime? : number){
		//this is for last spin
		//this is started on last spin
		//param time is for end of last spin

		
		BonusMusicDirector.param_end_time = (time == -1 && totalTime != undefined) ? totalTime : time;
		BonusMusicDirector.setPlayNext(BONUSMUSIC_PARAM.START_END);
		
		
		if(time == -1){
			return; //THIS IS LUCKY OLD BOOT override, it will be handled in the win sequence
		}
		
		let callback_win = ()=>{
			if(!SlowMotion.getIsActive()){
				BonusMusicDirector.setPlayNext(BONUSMUSIC_PARAM.RESUME_LAST_SPIN);
			}else{
				BonusMusicDirector._resume_as_resume_last_spin = true; //true == means its a win 
			}
		}
		let callback_lose = ()=>{
			//BonusMusicDirector.stopBonusMusic();
		}
		let callback = win ? callback_win : callback_lose;
		
		
		
		if(time < 1){
			//run now
			callback();
		}else{
			//schedule
			this.audioScheduler.scheduleCallback("end_callback", callback, time);
		}
	}
	
	
	public static getNextBonusSound(param : BONUSMUSIC_PARAM) : SOUND_TYPE {
		let setFlags = true; //TODO for advance stage
		let crrState = this._currentState;
		let crrStage = this._current_stage;
		if(param == BONUSMUSIC_PARAM.RESUME_LAST_SPIN){
			this._currentState = MusicState.RUNNING_INTRO;
			return SOUND_TYPE.bonus_spin_reset; //Win interrupting ending
		}
		if(param == BONUSMUSIC_PARAM.START) {
			//we start looping
			//start with intro
			if(setFlags){
				this._current_stage = 1;
				this._currentState = MusicState.RUNNING_INTRO;
			}
			return SOUND_TYPE.bonus_S1_intro;
		}
		if(param == BONUSMUSIC_PARAM.NORMAL_LOOP){
			this._current_loop_count = 0; //reset interrupt count
			if(crrState == MusicState.RUNNING_INTRO){
				if(setFlags){
					this._currentState = MusicState.RUNNING_LOOP;
				}
				return this.getAudioLoop(this._current_stage);
			}
			else if(crrState == MusicState.RUNNING_LOOP){
				//advance stage
				this.setAdvanceStage();
				return this.getAudioLoop(this._current_stage);
			}
			else if(crrState == MusicState.RUNNING_END){
				//Shouldnt auto advance, only be called
				
				//Start running after end
				this._currentState = MusicState.RUNNING_AFTER_END;
				return SOUND_TYPE.bonus_after_last_spin;
			}
			else if(crrState == MusicState.RUNNING_AFTER_END ){//|| crrState == MusicState.RUNNING_END){
			//	this.setAdvanceStage();
			//	if(setFlags){
			//		this._currentState = MusicState.RUNNING_INTRO;
			//	}
			//	return this.getAudioIntro(this._current_stage); //TODO unhandled scenario?
				this._currentState = MusicState.RUNNING_INTRO;
				return SOUND_TYPE.bonus_after_last_spin; //loop repeat
			}else{ //is paused and slowmo with no win
				return this.getAudioLoop(this._current_stage);
			}
		}
		else if(param == BONUSMUSIC_PARAM.RESUME){
			if(setFlags){
				this._currentState = MusicState.RUNNING_INTRO; //Stage should be already set
			}
			return this.getAudioIntro(this._current_stage);
		}
		else if(param == BONUSMUSIC_PARAM.START_END){
			this._currentState = MusicState.RUNNING_END;
			
			//determine which end is played based on param_end_time
			//bonus_S1_end1  --> 4000ms
			//bonus_S2_end   --> 5000ms
			//bonus_S3_end2  --> >5000ms
			if(this.param_end_time < fg_music_short_end_track_time){
				if(crrStage == 1){
					if(this._current_progress < 0.5){
						return SOUND_TYPE.bonus_S1_end1;
					}else{
						return SOUND_TYPE.bonus_S1_end2;
					}
				}
				else if(crrStage == 2){
					return SOUND_TYPE.bonus_S2_end;
				}
				else if(crrStage == 3){
					return SOUND_TYPE.bonus_S3_end1;
				}
			}
			else{
				return SOUND_TYPE.bonus_S3_end2;
			}
			//default long 10s
		//	return SOUND_TYPE.bonus_S3_end2;
		}
		return SOUND_TYPE.bonus_intro; //should never hit
		//currently it can hit if spin len is higher than outro len (end)
	}
	private static getCurrentTrackProgress() : number {
		let currentTime = fpaudio.getCurrentTrackTime(this._currentAudio as SOUND_TYPE);
		let trackLength = fpaudio.getTrackLength(this._currentAudio as SOUND_TYPE);
		return currentTime! / trackLength; //should return 0-1
	}
	private static setAdvanceStage(){
		this._current_loop_count = 0; //reset interrupt count
		this._current_stage++;
		if(this._current_stage > 3){
			this._current_stage = 1;
		}
	}
	private static getAudioLoop(stage : number){
		if(stage == 1){
			return SOUND_TYPE.bonus_S1_loop;
		}
		else if(stage == 2){
			return SOUND_TYPE.bonus_S2_loop;
		}
		else if(stage == 3){
			return SOUND_TYPE.bonus_S3_loop;
		}
		return SOUND_TYPE.bonus_S1_loop;
	}
	private static getAudioIntro(stage : number){
		if(stage == 1){
			return SOUND_TYPE.bonus_S1_intro;
		}
		else if(stage == 2){
			return SOUND_TYPE.bonus_spin_reset;
		}
		else if(stage == 3){
			return SOUND_TYPE.bonus_spin_reset;
		}
		return SOUND_TYPE.bonus_spin_reset;
	}
	private static getAudioReact(stage : number){
		if(stage == 1){
			return SOUND_TYPE.bonus_S1_react;
		}
		else if(stage == 2){
			return SOUND_TYPE.bonus_S2_react;
		}
		else if(stage == 3){
			return SOUND_TYPE.bonus_S3_react;
		}
		return SOUND_TYPE.bonus_S1_react;
	}
	
	public static bonusMusicDirector_tweens : Array<ggTween> = new Array<ggTween>();
	public static setCallback(callback : any, time : number = 0){
		let timer = {timer : 0};
		let tween = new ggTween(timer, fpglobals._GROUP);
		tween.to(timer, time);
		tween.onComplete(callback as any);
		tween.start(fpglobals.masterTicker.last_scaled_time);
		BonusMusicDirector.bonusMusicDirector_tweens.push(tween);
	}
	public static clearCallbacks(){
		while(BonusMusicDirector.bonusMusicDirector_tweens.length > 0){
			BonusMusicDirector.bonusMusicDirector_tweens.pop()?.stop();
		}
		BonusMusicDirector.bonusMusicDirector_tweens = new Array<ggTween>();
	}
	
	private static resetTrackers() {
		this._current_stage = 0;
		this._current_loop_count = 0;
		this._current_progress = 0;
	}
	
	
	public static bindEvents(ee : any, spinee = true) {
		if(spinee){
			ee.addListener(SPIN_EVENT.FG_SETUP_START, ()=>{
				fpaudio.StopAllSouds();
				BonusMusicDirector.IS_RUNNING = true;
				this.setPlayNext(BONUSMUSIC_PARAM.START);
			});
			ee.addListener(SPIN_EVENT.FG_EXIT, ()=>{
				BonusMusicDirector.IS_RUNNING = false;
			});
			ee.addListener(SPIN_EVENT.BIGWINSEQ_START, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					BonusMusicDirector.IS_RUNNING = false; //disable since its over
					BonusMusicDirector.stopBonusMusic();
				}
				fpaudio.StopSoundByType(SOUND_TYPE.bonus_after_last_spin);
			});
			
			ee.addListener(SPIN_EVENT.FG_BONUS_MUSIC_STOP, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					BonusMusicDirector.IS_RUNNING = false; //disable since its over
					BonusMusicDirector.stopBonusMusic();
				}
			});
			
			ee.addListener(SPIN_EVENT.EFF_LUNKER_FOCUS, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					//BonusMusicDirector.stopBonusMusic();
//					BonusMusicDirector.pauseBonusMusic(); //TEMP for slowmotion music test
				}
			});
			ee.addListener(SPIN_EVENT.EFF_SLOWMO_START, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
				//	BonusMusicDirector.pauseBonusMusic();
					fpaudio.PlaySound(SOUND_TYPE.eff_slowmo);
				}
			});
			ee.addListener(SPIN_EVENT.FG_BONUS_REACT_WIN, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					BonusMusicDirector.reactBonusMusic();
				}
			});
			ee.addListener(SPIN_EVENT.FG_BONUS_REACT_WIN_END, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					if(BonusMusicDirector._currentState == MusicState.RUNNING_REACT){
						//React still playing — cut it short, advance stage and resume
						fpaudio.StopSoundByType(BonusMusicDirector._currentAudio as SOUND_TYPE);
						BonusMusicDirector.setAdvanceStage();
						BonusMusicDirector.setPlayNext(BONUSMUSIC_PARAM.RESUME);
					}
					//If not RUNNING_REACT, react already completed and handled the transition
				}
			});
			ee.addListener(SPIN_EVENT.EFF_SLOWMO_END, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
				//	if(!BonusMusicDirector._restart_music_after_slowmotion){
				//		BonusMusicDirector._restart_music_after_slowmotion = true;
				//		return;
				//	}
					if(BonusMusicDirector._resume_as_resume_last_spin){ //this is win scenario
						BonusMusicDirector.pauseBonusMusic();//stop music
						BonusMusicDirector.setPlayNext(BONUSMUSIC_PARAM.RESUME_LAST_SPIN); //with intro
						BonusMusicDirector._resume_as_resume_last_spin = false;
					}else{
					//	BonusMusicDirector.setAdvanceStage();
	//					BonusMusicDirector.setPlayNext(BONUSMUSIC_PARAM.RESUME); //without intro
						//now we resume music from slowmotion on slowmotion using rate
					}
				}
			});
			
			ee.addListener(SPIN_EVENT.FG_LUCKY_BOOT_ACTIVATE, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					BonusMusicDirector.setPlayNext(BONUSMUSIC_PARAM.RESUME_LAST_SPIN);
				}
			});
			ee.addListener(SPIN_EVENT.FG_SPINS_COUNTER_UPDATE, (param : any)=>{
				if(param == 3 || param == 4){
					//fpaudio.PlaySound(SOUND_TYPE.spins_left_reset, false);
				}
			});
			ee.addListener(SPIN_EVENT.FG_SPINS_COUNTER_HIT, (param : any)=>{
				fpaudio.PlaySound(SOUND_TYPE.spins_left_hit, false);
			});
			ee.addListener(SPIN_EVENT.FG_SPINS_COUNTER_UPGRADE, (param : any)=>{
				fpaudio.PlaySound(SOUND_TYPE.bonus_bell_3x, false);
			});
			
			ee.addListener(SPIN_EVENT.FG_LAST_SPIN_THRILL_START, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					if(param.last_active != undefined){
						BonusMusicDirector.setEnd(param.last_active, param.isWin, param.total);
					}
				}
			});
			
		//	ee.addListener(SPIN_EVENT.FG_LAST_SPIN_THRILL_END, (param : any)=>{
		//		if(BonusMusicDirector.IS_RUNNING){
		//			fpaudio.StopSoundByType(SOUND_TYPE.);
		//		}
		//	});
			
			//not sure if placing it here is ok
			ee.addListener(SPIN_EVENT.FG_LAST_SPIN_THRILL_AFTER_END_WITH_WINS, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					//fpaudio.PlaySound(SOUND_TYPE.bonus_after_last_spin, false, "loop");
					BonusMusicDirector.setPlayNext(BONUSMUSIC_PARAM.START_AFTER_END);
				}
			});
			
			
			ee.addListener(SPIN_EVENT.FG_BOAT_COLLECT_WAVE, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					fpaudio.PlaySound(SOUND_TYPE.bonus_collect_wave,false);
				}
			});
			ee.addListener(SPIN_EVENT.FG_BOAT_COLLECT_SYMBOL, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					fpaudio.PlaySound(SOUND_TYPE.bonus_runner);
				}
			});
			ee.addListener(SPIN_EVENT.FG_BOAT_MULTIPLIER, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					fpaudio.PlaySound(SOUND_TYPE.eff_boat_multiplier);
				}
			});
			
			ee.addListener(SPIN_EVENT.BONUS_SPIN_START, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					if(this._current_stage == 1){
						fpaudio.PlaySound(SOUND_TYPE.bonus_spin_s1);
					}else if(this._current_stage == 2){
						fpaudio.PlaySound(SOUND_TYPE.bonus_spin_s2);
					}else if(this._current_stage == 3){
						fpaudio.PlaySound(SOUND_TYPE.bonus_spin_s3);
					}
				}
			});
			
			//Add events for lunker wave BONUS
			ee.addListener(SPIN_EVENT.FG_LUNKER_WAVE_START, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					BonusMusicDirector.stopBonusMusic();
				}
			});
			ee.addListener(SPIN_EVENT.FG_LUNKER_WAVE_END, (param : any)=>{
				if(BonusMusicDirector.IS_RUNNING){
					BonusMusicDirector.setPlayNext(BONUSMUSIC_PARAM.START_AFTER_END);
				}
			});
			
			
			
			
			
			
		}
	}
}