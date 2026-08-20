import { fpaudio, SOUND_TYPE } from "./fpaudio";
import { fpglobals } from "../fpglobals";
import { spin } from "../../reelspin/BaseGame/spin";
import { SPIN_EVENT, UI_EVENT } from "../events";
import { log } from "../../globals/dev/log";
import { AudioScheduler } from "./AudioScheduler";
import { BaseMusicDirector, BGMUSIC_PARAM } from "./BaseMusicDirector";
import { BonusMusicDirector } from "./BonusMusicDirector";
import { SlowMotion } from "../../effects/SlowMotion";
import { ggTween } from "../time/ggTween";
import { fp_error } from "../fp_error";

export class SoundDirector{
	
	private static currentBigWinAudio : SOUND_TYPE | null = null;
	private static nextScheduledAudio: string | null = null;
	
	//public static _canPlay_baseGameMusic : boolean = true;
	//public static _canPlay_bonusGameMusic : boolean = false;
	
	// Audio schedulers for different purposes
	private static bigWinScheduler: AudioScheduler;
	
	//Scatter land still needs to play after slowmotion
	private static _slowmo_audio_queue : Array<SOUND_TYPE> = [];
	private static _special_symbol_appear_intensity_index : number = 0;
	
	
	//public static canItPlay(type : SOUND_TYPE){
	//	if(type == SOUND_TYPE.ambient){
	//		return this._canPlay_baseGameMusic;
	//	}else if(type == SOUND_TYPE.ambient_bonus){
	//		return this._canPlay_bonusGameMusic;
	//	}
	//	return true;
	//}
	
	public static init(){
		// Initialize the sound director
		SoundDirector.bigWinScheduler = new AudioScheduler("bigWin");
		BaseMusicDirector.init();
		BonusMusicDirector.init();
		SoundDirector._slowmo_audio_queue = new Array<SOUND_TYPE>();
	}
	

	public static setFadeInPerType(soundType : SOUND_TYPE, duration : number){
		fpaudio.setFadeInPerType(soundType, duration);
	}
	
	
	public static stopBigWinAudio(){
		if(this.currentBigWinAudio != null){
			fpaudio.StopSoundByType(this.currentBigWinAudio);
			this.currentBigWinAudio = null;
		}
		
		// Cancel any scheduled audio
		if (this.nextScheduledAudio) {
			this.bigWinScheduler.cancelScheduledCallback(this.nextScheduledAudio);
			this.nextScheduledAudio = null;
		}
	}
	
	/**
	 * Play a sound with high precision timing and schedule a callback when it ends
	 * @param audioname The name of the sound to play
	 * @param callback Function to call when the sound finishes
	 * @param seekTo Optional position (in ms) to start playing from
	 * @returns The Howler context ID of the played sound
	 */
	public static playBigWinAudio(audioname: string, callback: () => void, seekTo: number = 0) {
		// Stop any currently playing big win audio
		if (this.currentBigWinAudio != null) {
			fpaudio.StopSoundByType(this.currentBigWinAudio);
		}
		
		// Cancel any previously scheduled callback
		if (this.nextScheduledAudio) {
			this.bigWinScheduler.cancelScheduledCallback(this.nextScheduledAudio);
		}
		
		// Set the current audio
		this.currentBigWinAudio = audioname as SOUND_TYPE;
		
		// Generate a unique ID for this audio schedule
		this.nextScheduledAudio = `bigwin_${audioname}_${Date.now()}`;
		
		// Play the sound
		const ctx = SoundDirector.playSound(audioname as SOUND_TYPE, false, "", 1);
		
		// Set the seek position if needed
		if (seekTo > 0) {
			fpaudio.setSeekPerType(audioname as SOUND_TYPE, seekTo);
		}
		
		// Get the exact duration of the track
		const trackDuration = fpaudio.getTrackLength(audioname as SOUND_TYPE);
		
		let time_to_schedule = trackDuration - 16 - seekTo;
		
		// Schedule the callback with precise timing
		// We subtract 16ms as a buffer to ensure we trigger the callback slightly before the audio truly ends
		this.bigWinScheduler.scheduleCallback(this.nextScheduledAudio, callback, time_to_schedule);
		
		if (fpglobals.log_audio_events) {
			fpglobals.GLog(`Scheduled audio callback for ${audioname} with duration ${time_to_schedule}ms`, log.type.SOUND_PLAYING);
		}
		
		return ctx;
	}
	public static stopSoundByType(soundType : SOUND_TYPE){
		fpaudio.StopSoundByType(soundType);
	}
	
	public static startSplashAudio(){
		SoundDirector.playSound(SOUND_TYPE.splash_intro, false);
	}
	
	private static playSpecialSymbolAppearSound(){
		SoundDirector._special_symbol_appear_intensity_index++;
		if(SoundDirector._special_symbol_appear_intensity_index > 3){
			SoundDirector._special_symbol_appear_intensity_index = 3;
		}
		SoundDirector.playSound("bonus_special_symbol_appear_" + SoundDirector._special_symbol_appear_intensity_index as SOUND_TYPE, false);
	}
	
	
	public static testAudioLoop(delay : number){
		//fpglobals.SpinEE.emit(SPIN_EVENT.BIGWINSEQ_START, {total_win_in_currency : 230, baseGame : true, bonusGame : false});
		for (let i = 0; i < 3; i++) {
			setTimeout(() => fpaudio.PlaySound(SOUND_TYPE.cash_chime_fair_inert_1, false), i * delay); // 'click' is the sprite label
		}		  
	}

	
	public static playSound(soundType : SOUND_TYPE, stop_previous : boolean = false, param : string = "", volume : number | undefined = undefined, onEnd : any = null){
		let toPlay = SoundDirector.replaceSoundConditionally(soundType);
		if(toPlay.includes("slowmo")){
			stop_previous = true;
			
			if(toPlay == SOUND_TYPE.cash_chime_fair_slowmo){
				//if lunker is playing, dont play this
				if(fpaudio.getIsPlaying(SOUND_TYPE.cash_chime_lunker_slowmo)){
					return;
				}
				SoundDirector.stopSoundByType(SOUND_TYPE.cash_chime_smallies_slowmo);
			}else if(toPlay == SOUND_TYPE.cash_chime_lunker_slowmo){
				SoundDirector.stopSoundByType(SOUND_TYPE.cash_chime_smallies_slowmo);
				SoundDirector.stopSoundByType(SOUND_TYPE.cash_chime_fair_slowmo);
			}
			else if(toPlay == SOUND_TYPE.cash_chime_smallies_slowmo){
				if(fpaudio.getIsPlaying(SOUND_TYPE.cash_chime_lunker_slowmo) || fpaudio.getIsPlaying(SOUND_TYPE.cash_chime_fair_slowmo)){
					return;
				}
			}
		}
		fpaudio.PlaySound(toPlay, stop_previous, param, volume, onEnd);
	}
	
	
	
	public static replaceSoundConditionally(soundType : SOUND_TYPE) : SOUND_TYPE {
		if(SlowMotion.getIsActive()){
			if(
				soundType == SOUND_TYPE.cash_chime_fair_1 ||
				soundType == SOUND_TYPE.cash_chime_fair_2 ||
				  soundType == SOUND_TYPE.cash_chime_fair_3 ||
				  soundType == SOUND_TYPE.cash_chime_fair_4
				){
				return SOUND_TYPE.cash_chime_fair_slowmo;
			}
			else if(soundType == SOUND_TYPE.cash_chime_lunker){
				return SOUND_TYPE.cash_chime_lunker_slowmo;
			}
			else if(soundType == SOUND_TYPE.cash_chime_smallies_1 ||
				 soundType == SOUND_TYPE.cash_chime_smallies_2 ||
				  soundType == SOUND_TYPE.cash_chime_smallies_3 ||
				   soundType == SOUND_TYPE.cash_chime_smallies_4
				){
				return SOUND_TYPE.cash_chime_smallies_slowmo;
			}
			else if(soundType == SOUND_TYPE.base_buck_clear){
				return SOUND_TYPE.base_buck_clear_slowmo;
			}
			else if(soundType == SOUND_TYPE.scatter_land_1 ||
				 soundType == SOUND_TYPE.scatter_land_2 ||
				  soundType == SOUND_TYPE.scatter_land_3 ||
				   soundType == SOUND_TYPE.scatter_land_4 ||
				    soundType == SOUND_TYPE.scatter_land_5 ||
					soundType == SOUND_TYPE.scatter_land_6
					){
				SoundDirector._slowmo_audio_queue.push(soundType);
				return SOUND_TYPE.scatter_land_slowmo;
			}
			else if(soundType == SOUND_TYPE.weed_remove){
				return SOUND_TYPE.weed_remove_slowmotion;
			}
		}
		return soundType;
	}
	
	
	
	
	
	
	
	public static bindEvents(ee : any, spinee = true){ //spinee is Spin Event Emitter
		if(spinee){
			//Spine triggered events
			const soundTypes = Object.values(SOUND_TYPE)
				.filter(value => typeof value === 'string') // Filter out numeric values
				.map(value => value as string);

			// Add listener for each sound type
			soundTypes.forEach(soundType => {
				// Get the actual enum value name from SOUND_TYPE
				const enumKey = Object.keys(SOUND_TYPE).find(key => 
					SOUND_TYPE[key as keyof typeof SOUND_TYPE] === soundType
				);
				
				if (enumKey) {
					const eventName = `audio_${enumKey}`;
					ee.addListener(eventName, () => {
						SoundDirector.playSound(SOUND_TYPE[enumKey as keyof typeof SOUND_TYPE]);
					});
				}
			});
			if(fpaudio._audioSprite == undefined){
				//log error
				fpglobals.GLog("fpaudio._audioSprite is undefined when initing audio event listeners", log.type.ERROR);
			}
			else{
				//add listeners for each sound in audioSprite
				for(let snd of fpaudio._audioSprite){
					ee.addListener("audio_" + snd.id, ()=>{
						SoundDirector.playSound(snd.id);
					});
				}
			}
			ee.addListener(SPIN_EVENT.BG_BONUS_INTRO, ()=>{
				fpaudio.StopAllSouds();
				SoundDirector.playSound(SOUND_TYPE.bonus_intro, false);
			});
			
			ee.addListener(SPIN_EVENT.EFF_SLOWMO_END, ()=>{
				let soundcount = SoundDirector._slowmo_audio_queue.length;
				for(let i = soundcount-1; i >= 0; i--){
					let snd = SoundDirector._slowmo_audio_queue[i];
					SoundDirector.callbackAfter(200, ()=>{
						SoundDirector.playSound(snd, false);
					}); //no need to splice since we are playing all and clearing queue
				}
				SoundDirector._slowmo_audio_queue = [];
			});
			
			
			
			
			
			ee.addListener(SPIN_EVENT.BG_WIN_INIT, ()=>{
				// Handle BG_WIN_INIT event
			}); 
			
			ee.addListener(SPIN_EVENT.BG_LOW_WINS_START, (param : number)=>{
				// Handle BG_LOW_WINS_START event
				switch(param){
					case 1:
						SoundDirector.playSound(SOUND_TYPE.base_win_low_1, false);
						break;
					default:
						SoundDirector.playSound(SOUND_TYPE.base_win_low_2, false);
						break;
				}
			});
			//ee.addListener(SPIN_EVENT.BG_HIGH_WINS_START, (param : number)=>{
			//	// Handle BG_LOW_WINS_START event
			//	switch(param){
			//		case 1:
			//			SoundDirector.playSound(SOUND_TYPE.base_win_high_1, false);
			//			break;
			//		default:
			//			SoundDirector.playSound(SOUND_TYPE.base_win_high_2, false);
			//			break;
			//	}
			//});
			ee.addListener(SPIN_EVENT.BG_HIGH_WINS_START_SOUND, (param : number)=>{
				// Handle BG_LOW_WINS_START event
				switch(param){
					case 1:
						SoundDirector.playSound(SOUND_TYPE.base_win_high_1, false);
						break;
					default:
						SoundDirector.playSound(SOUND_TYPE.base_win_high_2, false);
						break;
				}
			});
			
			ee.addListener(SPIN_EVENT.BG_LOW_WINS_END, ()=>{
				// Handle BG_LOW_WINS_END event
			});
			
			ee.addListener(SPIN_EVENT.BG_HIGH_WINS_END, ()=>{
				// Handle BG_HIGH_WINS_END event
			});
			
			ee.addListener(SPIN_EVENT.BG_HIGH_WINS_GEN, ()=>{
				// Handle BG_HIGH_WINS_GEN event
				SoundDirector.playSound(SOUND_TYPE.base_wild_create, false);
			});
			
			ee.addListener(SPIN_EVENT.BG_HIGH_WINS_UPG, ()=>{
				// Handle BG_HIGH_WINS_UPG event
				SoundDirector.playSound(SOUND_TYPE.base_wild_upgrade, false);
			});
			
			ee.addListener(SPIN_EVENT.BG_COLL_WINS_END, ()=>{
				// Handle BG_COLL_WINS_END event
			});
			
			ee.addListener(SPIN_EVENT.BG_SCAT_WINS_START, ()=>{
				// Handle BG_SCAT_WINS_START event
				SoundDirector.playSound(SOUND_TYPE.scatter_create, false);
			});
			
			ee.addListener(SPIN_EVENT.BG_SCAT_WINS_END, ()=>{
				// Handle BG_SCAT_WINS_END event
			});
			
			ee.addListener(SPIN_EVENT.BG_CASCADE_START, ()=>{ //Dropping old symbols
				// Handle BG_CASCADE_START event
				//SoundDirector.playSound(SOUND_TYPE.symbols_drop_old, false);
				//random betweeen symbols_drop_old_ambience_1 and symbols_drop_old_ambience_2
				let rnd = fpglobals.randInstance.getRandomInt(0, 1);
				if(rnd == 0){
					SoundDirector.playSound(SOUND_TYPE.symbols_drop_old_ambience_1, false);
				}
				else{
					SoundDirector.playSound(SOUND_TYPE.symbols_drop_old_ambience_2, false);
				}
			});
			ee.addListener(SPIN_EVENT.BG_NEW_SYMBOLS_DROP, ()=>{ //Dropping new symbols
				// Handle BG_CASCADE_START event
				//SoundDirector.playSound(SOUND_TYPE.symbols_drop_new);
				//random betweeen symbols_drop_new_ambience_1 and symbols_drop_new_ambience_2
				let rnd = fpglobals.randInstance.getRandomInt(0, 1);
				if(rnd == 0){
					SoundDirector.playSound(SOUND_TYPE.symbols_drop_new_ambience_1, false);
				}
				else{
					SoundDirector.playSound(SOUND_TYPE.symbols_drop_new_ambience_2, false);
				}
			});
			
			ee.addListener(SPIN_EVENT.BG_COLUMN_DROP_TICK, ()=>{
				
				let rnd = fpglobals.randInstance.getRandomInt(1, 5);
				SoundDirector.playSound("symbols_drop_tick_" + rnd as SOUND_TYPE, true);
			});
			
			ee.addListener(SPIN_EVENT.BG_COLUMN_DROP_STACK, ()=>{
				
				let rnd = fpglobals.randInstance.getRandomInt(1, 4);
				SoundDirector.playSound("symbols_drop_tick_stack_" + rnd as SOUND_TYPE, true);
				
				
				//SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_1);
				//SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_2);
				//SoundDirector.playSound(SOUND_TYPE.symbols_drop_stack, true);
			});
			ee.addListener(SPIN_EVENT.BG_COLUMN_DROP_FAIRGAME, ()=>{
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_1);
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_2);
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_stack_1);
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_stack_2);
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_stack_3);
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_stack_4);
				SoundDirector.playSound(SOUND_TYPE.symbols_drop_tick_fairgame, true);
			});
			ee.addListener(SPIN_EVENT.BG_COLUMN_DROP_LUNKER, ()=>{
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_1);
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_2);
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_stack_1);
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_stack_2);
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_stack_3);
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_stack_4);
				SoundDirector.stopSoundByType(SOUND_TYPE.symbols_drop_tick_fairgame);
				SoundDirector.playSound(SOUND_TYPE.symbols_drop_tick_lunker, true);
			});
			
			
			ee.addListener(SPIN_EVENT.BG_CASCADE_END, ()=>{
				// Handle BG_CASCADE_END event
			});
			ee.addListener(SPIN_EVENT.SPIN_START, ()=>{
				SoundDirector.playSound(SOUND_TYPE.spin_start);
			});
			
			ee.addListener(SPIN_EVENT.BG_BASKET_SYM_ENDPOS, ()=>{
				// Handle BG_BASKET_SYM_ENDPOS event
				
			});
			
			ee.addListener(SPIN_EVENT.BG_WIN_INIT, (param : number)=>{
				if(param == undefined){
					param = fpglobals.randInstance.getRandomInt(1, 4);
				}
				// Handle BG_WIN_INIT_HIGH event
				switch(param){
					case 1:
						SoundDirector.playSound(SOUND_TYPE.base_win_init_1, false);
						break;
					case 2:
						SoundDirector.playSound(SOUND_TYPE.base_win_init_2, false);
						break;
					case 3:
						SoundDirector.playSound(SOUND_TYPE.base_win_init_3, false);
						break;
					default:
						SoundDirector.playSound(SOUND_TYPE.base_win_init_4, false);
						break;
				}
			});
			ee.addListener(SPIN_EVENT.BG_END_EVENT_BASSFRENZY_START, ()=>{
				SoundDirector.playSound(SOUND_TYPE.base_buck_clear);
			});
			ee.addListener(SPIN_EVENT.BG_END_EVENT_TAGTEAM_START, ()=>{
				SoundDirector.playSound(SOUND_TYPE.base_buck_clear);
			});
			
			ee.addListener(SPIN_EVENT.BG_BLINK_CHIME_SMALLIES, (param : number)=>{
				if(param == undefined){
					param = fpglobals.randInstance.getRandomInt(0, 3);
				}
				switch(param){
					case 0:
						SoundDirector.playSound(SOUND_TYPE.cash_chime_smallies_1, false);
						break;
					case 1:
						SoundDirector.playSound(SOUND_TYPE.cash_chime_smallies_2, false);
						break;
					case 2:
						SoundDirector.playSound(SOUND_TYPE.cash_chime_smallies_3, false);
						break;
					default:
						SoundDirector.playSound(SOUND_TYPE.cash_chime_smallies_4, true); //default on deweed
						break;
				}
			});
			ee.addListener(SPIN_EVENT.BG_BLINK_CHIME_FAIR, (param : number)=>{
				if(param == undefined){
					param = fpglobals.randInstance.getRandomInt(0, 3);
				}
				switch(param){
					case 0:
						SoundDirector.playSound(SOUND_TYPE.cash_chime_fair_1, false);
						break;
					case 1:
						SoundDirector.playSound(SOUND_TYPE.cash_chime_fair_2, false);
						break;
					case 2:
						SoundDirector.playSound(SOUND_TYPE.cash_chime_fair_3, false);
						break;
					default:
						SoundDirector.playSound(SOUND_TYPE.cash_chime_fair_4, true); //default on deweed
						break;
				}
			});
			ee.addListener(SPIN_EVENT.BG_COLLECTOR_BEFORE_COLLECT_MARK, (param : number)=>{
				if(param == undefined){
					param = fpglobals.randInstance.getRandomInt(0, 3);
				}
				switch(param){
					case 0:
						SoundDirector.playSound(SOUND_TYPE.base_buck_collect_1, false);
						break;
					case 1:
						SoundDirector.playSound(SOUND_TYPE.base_buck_collect_2, false);
						break;
					case 2:
						SoundDirector.playSound(SOUND_TYPE.base_buck_collect_3, false);
						break;
					default:
						SoundDirector.playSound(SOUND_TYPE.base_buck_collect_4, true); //default on deweed
						break;
				}
			});
			ee.addListener(SPIN_EVENT.BG_BLINK_CHIME_LUNKER, ()=>{
				SoundDirector.playSound(SOUND_TYPE.cash_chime_lunker, false);
			});
			
			ee.addListener(SPIN_EVENT.BG_COLLECTOR_BUCK_CLEAR, ()=>{
				SoundDirector.playSound(SOUND_TYPE.base_buck_clear, true);
			});
			
			//inerts
			ee.addListener(SPIN_EVENT.BG_BLINK_CHIME_SMALLIES_INERT, ()=>{
				//pick random num 1 2 or 3
				let num = fpglobals.randInstance.getRandomInt(1, 4);
				SoundDirector.playSound("cash_chime_smallies_inert_" + num as SOUND_TYPE, true);
			});
			ee.addListener(SPIN_EVENT.BG_BLINK_CHIME_FAIR_INERT, ()=>{
				//pick random num 1 2 or 3
				let num = fpglobals.randInstance.getRandomInt(1, 4);
				SoundDirector.playSound("cash_chime_fair_inert_" + num as SOUND_TYPE, true);
			});
			ee.addListener(SPIN_EVENT.BG_BLINK_CHIME_LUNKER_INERT, ()=>{
				SoundDirector.playSound(SOUND_TYPE.cash_chime_lunker_inert, true); //lunker inert only one
			});
			
			ee.addListener(SPIN_EVENT.BG_SCATTER_1_ENDPOS, ()=>{
				SoundDirector.playSound(SOUND_TYPE.scatter_land_1);
			});
			ee.addListener(SPIN_EVENT.BG_SCATTER_2_ENDPOS, ()=>{
				SoundDirector.playSound(SOUND_TYPE.scatter_land_2);
			});
			ee.addListener(SPIN_EVENT.BG_SCATTER_3_ENDPOS, ()=>{
				SoundDirector.playSound(SOUND_TYPE.scatter_land_3);
			});
			ee.addListener(SPIN_EVENT.BG_SCATTER_4_ENDPOS, ()=>{ 
			//	SoundDirector.stopSoundByType(SOUND_TYPE.scatter_land_3);
				SoundDirector.playSound(SOUND_TYPE.scatter_land_4, true);
			});
			ee.addListener(SPIN_EVENT.BG_SCATTER_5_ENDPOS, ()=>{
			//	SoundDirector.stopSoundByType(SOUND_TYPE.scatter_land_4);
				SoundDirector.playSound(SOUND_TYPE.scatter_land_5,  true);
			});
			ee.addListener(SPIN_EVENT.BG_SCATTER_6_ENDPOS, ()=>{
			//	SoundDirector.stopSoundByType(SOUND_TYPE.scatter_land_5);
			//	SoundDirector.stopSoundByType(SOUND_TYPE.scatter_land_6); //after 6th we play 6th
				SoundDirector.playSound(SOUND_TYPE.scatter_land_6,  true);
			});
			
			
			
			
			
			// For both (weed clear?)
			ee.addListener(SPIN_EVENT.BG_COLLECTOR_WEED_REMOVE, ()=>{
				SoundDirector.playSound(SOUND_TYPE.weed_remove,  true);
			});
			// For both (weed clear?)
			ee.addListener(SPIN_EVENT.BG_COLLECTOR_WEEDBASS_REMOVE, ()=>{
				SoundDirector.playSound(SOUND_TYPE.weed_remove,  false);
			});
			// For both (weed clear?)
			ee.addListener(SPIN_EVENT.FG_COLLECTOR_WEED_REMOVE, ()=>{
				SoundDirector.playSound(SOUND_TYPE.weed_remove,  true);
			});
			// For both (weed clear?)
			ee.addListener(SPIN_EVENT.FG_COLLECTOR_WEEDBASS_REMOVE, ()=>{
				SoundDirector.playSound(SOUND_TYPE.weed_remove,  true);
			});
			
			
			
			
			//Small win sequence
			ee.addListener(SPIN_EVENT.SMALL_WIN_START,()=>{
				SoundDirector.playSound(SOUND_TYPE.base_win_small_countup);
			});
			ee.addListener(SPIN_EVENT.SMALL_WIN_COUNTUP_END,(param : number)=>{
				SoundDirector.stopSoundByType(SOUND_TYPE.base_win_small_countup);
				switch(param){
					case 0:
						{
							let rndlist = [SOUND_TYPE.base_win_small_finish_low_1, SOUND_TYPE.base_win_small_finish_low_2];
							let rnd = fpglobals.randInstance.getRandomInt(0, rndlist.length - 1);
							SoundDirector.playSound(rndlist[rnd], true);
						}
					break;
					case 1:
						{
							let rndlist = [SOUND_TYPE.base_win_small_finish_med_1, SOUND_TYPE.base_win_small_finish_med_2];
							let rnd = fpglobals.randInstance.getRandomInt(0, rndlist.length - 1);
							SoundDirector.playSound(rndlist[rnd], true);
						}
					break;
					default:
						{
							let rndlist = [SOUND_TYPE.base_win_small_finish_high_1, SOUND_TYPE.base_win_small_finish_high_2];
							let rnd = fpglobals.randInstance.getRandomInt(0, rndlist.length - 1);
							SoundDirector.playSound(rndlist[rnd], true);
						}
					break;
				}
			});
			
			
			
			
			//TODO FG SPin start only
			ee.addListener(SPIN_EVENT.FG_SPIN_START, ()=>{
				SoundDirector._special_symbol_appear_intensity_index = 0;
			});

			// Lunker wave rollup events

			ee.addListener(SPIN_EVENT.LUNKER_WAVE_ROLLUP_FADEIN, ()=>{
				SoundDirector.setFadeInPerType(SOUND_TYPE.bonus_lunker_rollup_1, 500);
				SoundDirector.setFadeInPerType(SOUND_TYPE.bonus_lunker_rollup_2, 500);
				SoundDirector.setFadeInPerType(SOUND_TYPE.bonus_lunker_rollup_3, 500);
			});

			ee.addListener(SPIN_EVENT.LUNKER_WAVE_ROLLUP_WAVE_1, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_lunker_rollup_1, false, undefined, 0);
			});
			ee.addListener(SPIN_EVENT.LUNKER_WAVE_ROLLUP_WAVE_2, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_lunker_rollup_2, false, undefined, 0);
			});
			ee.addListener(SPIN_EVENT.LUNKER_WAVE_ROLLUP_WAVE_3, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_lunker_rollup_3, false, undefined, 0);
			});
			ee.addListener(SPIN_EVENT.LUNKER_WAVE_ROLLUP_WAVE_1_AUDIBLE, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_lunker_rollup_1);
			});
			ee.addListener(SPIN_EVENT.LUNKER_WAVE_ROLLUP_WAVE_2_AUDIBLE, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_lunker_rollup_2);
			});
			ee.addListener(SPIN_EVENT.LUNKER_WAVE_ROLLUP_WAVE_3_AUDIBLE, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_lunker_rollup_3);
			});
			ee.addListener(SPIN_EVENT.LUNKER_WAVE_OUTRO_START, ()=>{
				SoundDirector.stopSoundByType(SOUND_TYPE.lunker_wave_bg);
			});
			ee.addListener(SPIN_EVENT.LUNKER_WAVE_UPGRADE_EVENT, ()=>{
				SoundDirector.playSound(SOUND_TYPE.base_wild_upgrade);
			});
			ee.addListener(SPIN_EVENT.BG_LUNKER_WAVE_START, ()=>{
				SoundDirector.playSound(SOUND_TYPE.lunker_wave_bg, false, "loop");
				if(spin.getSpinInstance().isFreeGamesWonThisSpin){
					fpaudio.SetVolumePerType(SOUND_TYPE.bonus_award_thrill, 0.0);
				}
			});
			ee.addListener(SPIN_EVENT.BG_LUNKER_WAVE_END, ()=>{
				if(spin.getSpinInstance().isFreeGamesWonThisSpin){
					//fpaudio.SetVolumePerType(SOUND_TYPE.bonus_award_thrill, 1.0);
					fpaudio.setFadeInPerType(SOUND_TYPE.bonus_award_thrill, 500);
				}
			});
			ee.addListener(SPIN_EVENT.FG_LUNKER_WAVE_START, ()=>{
				SoundDirector.playSound(SOUND_TYPE.lunker_wave_bg, false, "loop");
			});
			
			ee.addListener(SPIN_EVENT.BIGWINSEQ_END, ()=>{
				if(spin.getSpinInstance().isFreeGamesWonThisSpin){
					//fpaudio.SetVolumePerType(SOUND_TYPE.bonus_award_thrill, 1.0);
					fpaudio.setFadeInPerType(SOUND_TYPE.bonus_award_thrill, 500);
				}
			});
			ee.addListener(SPIN_EVENT.BIGWINSEQ_START, ()=>{
				if(spin.getSpinInstance().isFreeGamesWonThisSpin){
					fpaudio.SetVolumePerType(SOUND_TYPE.bonus_award_thrill, 0.0);
				}
			});



			
			//Bonus symbol land events
			
			ee.addListener(SPIN_EVENT.FG_BUCK_APPEAR, ()=>{
				//SoundDirector.playSound(SOUND_TYPE.eff_generic_add);
				SoundDirector.playSpecialSymbolAppearSound();
			});
			ee.addListener(SPIN_EVENT.FG_SP_APPEAR, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_sixpack_bottle_clank);
				SoundDirector.playSpecialSymbolAppearSound();
			});
			ee.addListener(SPIN_EVENT.FG_BASS_APPEAR, ()=>{
				//Sound replaced by blink and chime
				//SoundDirector.playSound(SOUND_TYPE.cash_chime_fair_1);
			});
			ee.addListener(SPIN_EVENT.FG_LUNKER_APPEAR, ()=>{
				SoundDirector.playSound(SOUND_TYPE.cash_chime_lunker);
			});
			ee.addListener(SPIN_EVENT.FG_BOAT_APPEAR, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_runner);
				SoundDirector.playSpecialSymbolAppearSound();
			});
			ee.addListener(SPIN_EVENT.FG_LUCKYBOOT_APPEAR, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_luckyboot);
				SoundDirector.playSpecialSymbolAppearSound();
			});
			ee.addListener(SPIN_EVENT.FG_LUCKY_BOOT_START_ACTIVATE, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_luckyboot);
			});
			ee.addListener(SPIN_EVENT.FG_TRUCK_APPEAR, ()=>{
				SoundDirector.playSound(SOUND_TYPE.eff_truck_short);
				SoundDirector.playSpecialSymbolAppearSound();
			});
			ee.addListener(SPIN_EVENT.FG_PLUSONE_APPEAR, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_plus1spin);
				SoundDirector.playSpecialSymbolAppearSound();
			});
			ee.addListener(SPIN_EVENT.FG_GREENBASS_APPEAR, ()=>{
				SoundDirector.playSound(SOUND_TYPE.weed_appear, false);
			});
			ee.addListener(SPIN_EVENT.FG_GREENLUNKER_APPEAR, ()=>{
				this.callbackAfter(150, ()=>{
					SoundDirector.playSound(SOUND_TYPE.weed_appear, false);
				});
				SoundDirector.playSound(SOUND_TYPE.cash_chime_lunker_inert, false);
			});
			
			//BONUS Sound effects for win actions
			
			ee.addListener(SPIN_EVENT.FG_BUCK_COLLECT_ADD, ()=>{
				SoundDirector.playSound(SOUND_TYPE.eff_hit_2);
			});
			ee.addListener(SPIN_EVENT.FG_ROW_EXPAND, ()=>{
		//		SoundDirector.playSound(SOUND_TYPE.eff_boat);
			});
			ee.addListener(SPIN_EVENT.FG_SIXPACK_ACTIVATION, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_sixpack_throw);
			});
			ee.addListener(SPIN_EVENT.FG_LUCKY_BOOT_START_ACTIVATE, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_sixpack_throw);
			});
			ee.addListener(SPIN_EVENT.FG_SIXPACK_RUNOUT, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_sixpack_empty);
			});
			ee.addListener(SPIN_EVENT.FG_BUCK_REVIVE, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_sixpack_cap_pop);
			});
			ee.addListener(SPIN_EVENT.FG_BUCK_CLEAR, ()=>{
				//SoundDirector.playSound(SOUND_TYPE.eff_woosh);
				SoundDirector.playSound(SOUND_TYPE.base_buck_clear);
			});
			ee.addListener(SPIN_EVENT.FG_PLUSONE_ACTIVATION, ()=>{
				SoundDirector.playSound(SOUND_TYPE.eff_hit_3);
			});
			ee.addListener(SPIN_EVENT.FG_BASKET_CREATE, ()=>{
				SoundDirector.playSound(SOUND_TYPE.scatter_create, false);
			});
			ee.addListener(SPIN_EVENT.FG_BOAT_ACTIVATION, ()=>{
				//SoundDirector.playSound(SOUND_TYPE.eff_swoosh);
				//SoundDirector.playSound(SOUND_TYPE.bonus_row_expand);
				//TODO
			});
			ee.addListener(SPIN_EVENT.FG_ROW_EXPAND, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_row_expand);
			});
			ee.addListener(SPIN_EVENT.FG_TRUCK_ACTIVATION, ()=>{
				SoundDirector.playSound(SOUND_TYPE.eff_truck_2);
			});
			ee.addListener(SPIN_EVENT.FG_DRAW_WIN_ANY, ()=>{
				let rnd = fpglobals.randInstance.getRandomInt(1, 3);
				SoundDirector.playSound(SOUND_TYPE[`bonus_cash_collect_${rnd}` as keyof typeof SOUND_TYPE] as SOUND_TYPE);
			});
			ee.addListener(SPIN_EVENT.FG_DRAW_WIN_ANY_CATCHBOOST, ()=>{
				//cancel previous sound
				SoundDirector.stopSoundByType(SOUND_TYPE.bonus_cash_collect_1);
				SoundDirector.stopSoundByType(SOUND_TYPE.bonus_cash_collect_2);
				SoundDirector.stopSoundByType(SOUND_TYPE.bonus_cash_collect_3);
				let rnd = fpglobals.randInstance.getRandomInt(1, 3);
				SoundDirector.playSound(SOUND_TYPE[`bonus_cash_collect_${rnd}` as keyof typeof SOUND_TYPE] as SOUND_TYPE);
			});
			
			
			ee.addListener(SPIN_EVENT.BONUS_INFO_START, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_info);
				///SoundDirector.stopSoundByType(SOUND_TYPE.bonus_intro);
			});
			ee.addListener(SPIN_EVENT.BONUS_INFO_END, ()=>{
				SoundDirector.stopSoundByType(SOUND_TYPE.bonus_info);
			});
			
			ee.addListener(SPIN_EVENT.FG_CATCHBOOST_SPIN_START, (order : number)=>{
				//divide order by 3 and get the remainder
				let remainder = 0;
				if(order == undefined){
					order = 0;
				}else if(order !=0){
					remainder = order % 3;
				}
				SoundDirector.playSound(SOUND_TYPE[`bonus_buck_catchboost_spin_${remainder}` as keyof typeof SOUND_TYPE] as SOUND_TYPE);
			});
			ee.addListener(SPIN_EVENT.FG_BONUS_SETUP_BASKET_ACTIVATE, (value : number)=>{
				let remainder = 1;
				if(value == undefined){
					remainder = 1;
				}else if(value != 0){
					remainder = value % 4 || 4; // 1-4 cycle; %4==0 must map to 4 (no base_buck_collect_0)
				}
				SoundDirector.playSound(SOUND_TYPE[`base_buck_collect_${remainder}` as keyof typeof SOUND_TYPE] as SOUND_TYPE);
				
				
			});
			ee.addListener(SPIN_EVENT.EFF_TRAIL_MOVE, ()=>{
				SoundDirector.playSound(SOUND_TYPE.eff_trail_shoot);
			});
			ee.addListener(SPIN_EVENT.EFF_TRAIL_HIT, ()=>{
				SoundDirector.playSound(SOUND_TYPE.eff_trail_hit);
			});
			
			
			//Bonus setup events
			ee.addListener(SPIN_EVENT.FG_BONUS_SETUP_ICEBOX_ACTIVATE_1, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_setup_icebox_activate);
			});
			ee.addListener(SPIN_EVENT.FG_BONUS_SETUP_ICEBOX_ACTIVATE_2, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_setup_icebox_activate);
			});
			ee.addListener(SPIN_EVENT.FG_BONUS_SETUP_ICEBOX_ACTIVATE_3, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_setup_icebox_activate);
			});
			ee.addListener(SPIN_EVENT.FG_BONUS_SETUP_ICEBOX_ACTIVATE_4, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_setup_icebox_activate);
			});
			ee.addListener(SPIN_EVENT.FG_BONUS_SETUP_ICEBOX_ACTIVATE_5, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_setup_icebox_activate);
			});
			ee.addListener(SPIN_EVENT.FG_BONUS_SETUP_ICEBOX_ACTIVATE_6, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_setup_icebox_activate);
			});
			
			
			ee.addListener(SPIN_EVENT.FG_ROW_4_BADGE_SHOW, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_setup_runner_badge);
			});
			ee.addListener(SPIN_EVENT.FG_ROW_5_BADGE_SHOW, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_setup_runner_badge);
			});
			ee.addListener(SPIN_EVENT.FG_ROW_6_BADGE_SHOW, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_setup_runner_badge);
			});
			
			
			
			
			//Counter events
			
			ee.addListener(SPIN_EVENT.FG_TOTAL_WIN_COUNTER_JUMP, (param : {prop: number})=>{
				//play either way
				SoundDirector.playSound(SOUND_TYPE.total_win_counter_tick, false);
				switch(param.prop){
					case 1:
						SoundDirector.playSound(SOUND_TYPE.total_win_counter_chime_1, false);
						break;
					case 2:
						SoundDirector.playSound(SOUND_TYPE.total_win_counter_chime_2, false);
						break;
					case 3:
						SoundDirector.playSound(SOUND_TYPE.total_win_counter_chime_3, false);
						break;
					case 4:
						SoundDirector.playSound(SOUND_TYPE.total_win_counter_chime_4, false);
						break;
					default:
						fp_error.onerror("FG_TOTAL_WIN_COUNTER_JUMP: unknown prop: " + param.prop);
						break;
				}
			});
		//	ee.addListener(SPIN_EVENT.FG_TOTAL_WIN_COUNTER_JUMP_SHORT, ()=>{
		//		SoundDirector.playSound(SOUND_TYPE.total_win_counter_tick, false);
		//	});
			
		//	ee.addListener(SPIN_EVENT.FG_TOTAL_WIN_COUNTER_JUMP_START_NONE, ()=>{
		//	});
			ee.addListener(SPIN_EVENT.FG_TOTAL_WIN_COUNTER_JUMP_START_1, ()=>{
				SoundDirector.playSound(SOUND_TYPE.total_win_counter_accent_1, false);
			});
			ee.addListener(SPIN_EVENT.FG_TOTAL_WIN_COUNTER_JUMP_START_2, ()=>{
				SoundDirector.playSound(SOUND_TYPE.total_win_counter_accent_2, false);
			});
			ee.addListener(SPIN_EVENT.FG_TOTAL_WIN_COUNTER_JUMP_START_3, ()=>{
				SoundDirector.playSound(SOUND_TYPE.total_win_counter_accent_3, false);
			});
			
			
			
			
			
			
		}
		else{
			
			//is UI
			ee.addListener(UI_EVENT.FAST_PLAY_ON, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_luckyboot);
			});
			ee.addListener(UI_EVENT.FAST_PLAY_OFF, ()=>{
				SoundDirector.playSound(SOUND_TYPE.bonus_luckyboot);
			});
			ee.addListener(UI_EVENT.TAB_UNFOCUS, ()=>{
				//fade out whole howler volume
				//fpaudio._Howl.fade(0.5, 0, 1000);
				//fpaudio.SetVolumePerType(SOUND_TYPE.ambient, 0);
				//fpaudio._music_playing = false;
			});
			ee.addListener(UI_EVENT.TAB_FOCUS, ()=>{
				//fpaudio._music_playing = true;
				if(fpaudio._music_playing){
					//fpaudio._Howl.fade(0, 0.5, 1000); //BUG: ambient when looping is back to loud
					//fpaudio.SetVolumePerType(SOUND_TYPE.ambient, 0.5);
					//setVolumeAmbient();
				}
			});
			
			ee.addListener(UI_EVENT.AUDIO_MUSIC_TOGGLE, ()=>{
				fpaudio._music_playing = !fpaudio._music_playing;
				if(!fpaudio._music_playing){
					fpaudio.StopAllSouds();
				}
				//TODO
			});
		}
		BaseMusicDirector.bindEvents(ee, spinee);
		BonusMusicDirector.bindEvents(ee, spinee);
	}
	
	public static callbackAfter(time : number, callback : any){
		let timer = {time : 0};
		let twe = new ggTween(timer, fpglobals._GROUP);
		twe.to({time : 1},time);
		twe.onComplete(()=>{
			callback();
		});
		//TODO maybe save tween
		twe.start(fpglobals.masterTicker.last_scaled_time);
		return;
	}
	
}
