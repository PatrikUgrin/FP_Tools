/*
*	Custom wrapper for howler
* prepare before load with callback to trigger after load
*
*
*
*	references
* https://github.com/joshwcomeau/use-sound/issues/20
*/

import { Macro } from "../../globals/Macro";
import { Howler, Howl } from "howler";
import { fpglobals, INTERRUPT_TYPE } from "../../globals/fpglobals";
import { string2hex } from "@pixi/utils";
import { log } from "../../globals/dev/log";
import { EventEmitter } from "ws";
import { SPIN_EVENT, UI_EVENT, events } from "../../globals/events";
import { SoundDirector } from "./SoundDirector";
import { AudioScheduler } from "./AudioScheduler";
import { BaseMusicDirector } from "./BaseMusicDirector";
import { BonusMusicDirector } from "./BonusMusicDirector";

declare global {
    interface Window { MyAudioSprite: any; }
}

window.MyAudioSprite = window.MyAudioSprite || {};

export enum SOUND_TYPE{
	NONE = "NONE", //DO NOT PLAY

	spin_click = "spin_click",
	spin_start = "spin_start",
//	bonus_spin = "bonus_spin", //deprecated, now using s1 s2 s3
	bonus_spin_s1 = "bonus_spin_s1",
	bonus_spin_s2 = "bonus_spin_s2",
	bonus_spin_s3 = "bonus_spin_s3",
	
	
	base_music_grind = "base_grind",
	base_music_intro = "base_intro",
	base_music_solo_bridge = "base_solo_bridge",
	
	bonus_intro = "bonus_award_celebration", //background music for bonus game intro 
	
	bonus_info = "bonus_info",
	
	splash_intro = "title",
//	spin_stop = "spinstop",
//	force_stop = "click_long",

//	symbols_drop_old = "symbols_drop_old",
//	symbols_drop_new = "symbols_drop_new",
	symbols_drop_new_ambience_1 = "symbols_drop_new_ambience_1",
	symbols_drop_new_ambience_2 = "symbols_drop_new_ambience_2",
	symbols_drop_old_ambience_1 = "symbols_drop_old_ambience_1",
	symbols_drop_old_ambience_2 = "symbols_drop_old_ambience_2",

	/////////////////////base game wins/////////////////////

	//win init
	base_win_init_1 = "base_win_init_1",
	base_win_init_2 = "base_win_init_2",
	base_win_init_3 = "base_win_init_3",
	base_win_init_4 = "base_win_init_4",
	
	//low wins
	base_win_low_1 = "base_win_low_1",
	base_win_low_2 = "base_win_low_2",
	//base_win_low_3 = "base_win_low_3",
	//base_win_low_4 = "base_win_low_4",
	
	//high wins
	base_win_high_1 = "base_win_high_1",
	base_win_high_2 = "base_win_high_2",
	//base_win_high_3 = "base_win_high_3",
	//base_win_high_4 = "base_win_high_4",
	
	// general
	weed_remove = "weed_remove", // when Buck removes weed
	weed_remove_slowmotion = "weed_remove_slowmo", // when Buck removes weed while in slow motion

	base_wild_create = "base_wild_create", // additional sound to be played over "base win high"
	base_wild_upgrade = "base_wild_upgrade", // additional sound to be played over "base win high"
	base_buck_clear = "base_buck_clear", // buck symbol removed by wave
	base_buck_clear_slowmo = "base_buck_clear_slowmo", // buck symbol removed by wave while in slow motion
	base_buck_collect_1 = "base_buck_collect_1", // short sounds on targets before Buck starts to collect (up to 8 possible in theory, played in quick 0.2 sec succession)
	base_buck_collect_2 = "base_buck_collect_2", // short sounds on targets before Buck starts to collect (up to 8 possible in theory, played in quick 0.2 sec succession)
	base_buck_collect_3 = "base_buck_collect_3", // short sounds on targets before Buck starts to collect (up to 8 possible in theory, played in quick 0.2 sec succession)
	base_buck_collect_4 = "base_buck_collect_4", // short sounds on targets before Buck starts to collect (up to 8 possible in theory, played in quick 0.2 sec succession)
	
	// SCATTER
	scatter_land_1 = "scatter_land_1", // lands, appears on reels (1st ascending sound)
	scatter_land_2 = "scatter_land_2", // lands, appears on reels (2nd ascending sound)
	scatter_land_3 = "scatter_land_3", // richer sound - with 3rd scatter the bonus is guaranteed, (3rd ascending sound, can combine previous)
	scatter_land_4 = "scatter_land_4", // richer sound - (4th ascending sound, can combine previous)
	scatter_land_5 = "scatter_land_5", // richer sound - (5th ascending sound, can combine previous)
	scatter_land_6 = "scatter_land_6", // richer sound - (6th ascending sound, can combine previous)
	scatter_land_slowmo = "scatter_land_slowmo", // thud-like sound for slow motion, a normal scatter land will play as time resumes
	bonus_award_thrill = "bonus_award_thrill", // as the bonus is awarded mid spin - this music/thrill replaces the base game music and serves as an intro into the "bonus award". Either a loop: 4 - 10 secs or Wheel beep type of deal for 15 secs. While this loop is playing - additional scatters might land. A celebratory/anticipation loop - the just awarded bonus might be upgraded with additional scatters.
	scatter_create = "scatter_create", // effect when cash symbols combine into a crate, followed by "scatter land"
	
	//Cash symbols (BASS)
	cash_chime_smallies_1 = "cash_chime_smallies_1", // 1st smallies chime (cash symbol - bass)
	cash_chime_smallies_2 = "cash_chime_smallies_2", // 2nd smallies chime (cash symbol - bass)
	cash_chime_smallies_3 = "cash_chime_smallies_3", // 3rd smallies chime (cash symbol - bass)
	cash_chime_smallies_4 = "cash_chime_smallies_4", // 4th smallies chime (cash symbol - bass)
	cash_chime_smallies_inert_1 = "cash_chime_smallies_inert_1", // 1 smallie chime muted / out of tune (locked cash symbol - green bass)
	cash_chime_smallies_inert_2 = "cash_chime_smallies_inert_2", // 1 smallie chime muted / out of tune (locked cash symbol - green bass)
	cash_chime_smallies_inert_3 = "cash_chime_smallies_inert_3", // 1 smallie chime muted / out of tune (locked cash symbol - green bass)
	cash_chime_fair_1 = "cash_chime_fair_1", // 1st fair chime (cash symbol - bass)
	cash_chime_fair_2 = "cash_chime_fair_2", // 2nd fair chime (cash symbol - bass)
	cash_chime_fair_3 = "cash_chime_fair_3", // 3rd fair chime (cash symbol - bass)
	cash_chime_fair_4 = "cash_chime_fair_4", // 4th fair chime (cash symbol - bass)
	//cash_chime_fair_5 = "cash_chime_fair_5", // 5th fair chime (cash symbol - bass)
	cash_chime_fair_inert_1 = "cash_chime_fair_inert_1", // 1 fair chime muted / out of tune (locked cash symbol - green bass)
	cash_chime_fair_inert_2 = "cash_chime_fair_inert_2", // 1 fair chime muted / out of tune (locked cash symbol - green bass)
	cash_chime_fair_inert_3 = "cash_chime_fair_inert_3", // 1 fair chime muted / out of tune (locked cash symbol - green bass)
	cash_chime_fair_slowmo = "cash_chime_fair_slowmo", // slowmo chime for 100, 250
	cash_chime_lunker = "cash_chime_lunker", // lunker chime for 500,1000,2000
	cash_chime_lunker_inert = "cash_chime_lunker_inert", // lunker chime muted for inert 500,1000,2000
	cash_chime_lunker_slowmo = "cash_chime_lunker_slowmo", // lunker chime for 500,1000,2000 in slowmo
	cash_chime_smallies_slowmo = "cash_chime_smallies_slowmo", // general slowmo chime (to be used for all other cash during the slow event)

	//Lunker Wave (not in the game yet)
	//lunker_wave_ambiance = "lunker_wave_ambiance", // ambient sound for lunker wave
	
	//Win counter
	base_win_small_countup = "base_win_small_countup", // 6 secs
	base_win_small_finish_low_1 = "base_win_small_finish_low_1", // countups up to 2 sec
	base_win_small_finish_low_2 = "base_win_small_finish_low_2", // countups up to 2 sec
	base_win_small_finish_med_1 = "base_win_small_finish_med_1", // countups up to 4 sec
	base_win_small_finish_med_2 = "base_win_small_finish_med_2", // countups up to 4 sec
	base_win_small_finish_high_1 = "base_win_small_finish_high_1", // countups up to 6 sec (x25 big win threshold)
	base_win_small_finish_high_2 = "base_win_small_finish_high_2", // countups up to 6 sec (x25 big win threshold)
	
	
	symbols_drop_tick_1 = "symbols_drop_tick_1",
	symbols_drop_tick_2 = "symbols_drop_tick_2",
	symbols_drop_tick_3 = "symbols_drop_tick_3",
	symbols_drop_tick_4 = "symbols_drop_tick_4",
	symbols_drop_tick_5 = "symbols_drop_tick_5",
	
	symbols_drop_tick_stack_1 = "symbols_drop_tick_stack_1",
	symbols_drop_tick_stack_2 = "symbols_drop_tick_stack_2",
	symbols_drop_tick_stack_3 = "symbols_drop_tick_stack_3",
	symbols_drop_tick_stack_4 = "symbols_drop_tick_stack_4",
	symbols_drop_tick_lunker = "symbols_drop_tick_lunker",
	symbols_drop_tick_fairgame = "symbols_drop_tick_fairgame",
	
	bonus_setup_icebox_activate = "bonus_setup_icebox_activate",
	bonus_setup_runner_badge = "bonus_setup_runner_badge",
	
	// LUNKER WAVE
	lunker_wave_intro = "lunker_wave_intro", // intro sound when lunker wave begins
	lunker_wave_bg = "lunker_wave_bg", // background music loop during lunker wave
	lunker_wave_stage_1 = "lunker_wave_stage_1", // stage 1 music
	lunker_wave_stage_2 = "lunker_wave_stage_2", // stage 2 music
	lunker_wave_stage_3 = "lunker_wave_stage_3", // stage 3 music
	lunker_wave_land = "lunker_wave_land",
	lunker_wave_bigsplash = "lunker_wave_bigsplash",
	lunker_wave_flyby_1 = "lunker_wave_flyby_1", // flyby sound 1
	lunker_wave_flyby_2 = "lunker_wave_flyby_2", // flyby sound 2
	lunker_wave_flyby_3 = "lunker_wave_flyby_3", // flyby sound 3
	lunker_wave_outro_1 = "lunker_wave_outro_1", // outro sound 1
	lunker_wave_outro_2 = "lunker_wave_outro_2", // outro sound 2
	lunker_wave_end = "lunker_wave_end", // end sound when lunker wave finishes
	
	bonus_lunker_rollup_1 = "bonus_lunker_rollup_1", //"it is getting interesting" music
	bonus_lunker_rollup_2 = "bonus_lunker_rollup_2",
	bonus_lunker_rollup_3 = "bonus_lunker_rollup_3",
	
	
	//eff_woosh = "eff_woosh",
	eff_slowmo = "slowmo_event", // Duration can be adjusted. 0.3 intro, 3 sec duration, 0.3 sec outro. During the event all cash symbols when landing - play a special slowed chime. Seaweeds removed during the event have a special weed remove sound.
	
	// Big Win sequence sounds
	bigwin_major_lvl1 = "bigwin_major_lvl1",
	bigwin_major_lvl2 = "bigwin_major_lvl2",
	bigwin_major_lvl3 = "bigwin_major_lvl3",
	bigwin_major_lvl4 = "bigwin_major_lvl4",
	bigwin_major_lvl5 = "bigwin_major_lvl5",
	bigwin_major_lvl6 = "bigwin_major_lvl6",
	
	
	bigwin_stinger_short = "bigwin_stinger_short",
	bigwin_stinger_long = "bigwin_stinger_long",
	bigwin_minor_lvl1 = "bigwin_minor_lvl1",
	bigwin_minor_lvl2 = "bigwin_minor_lvl2",
	bigwin_minor_lvl3 = "bigwin_minor_lvl3",
	bigwin_minor_lvl4 = "bigwin_minor_lvl4",
	
	coda_minor = "bigwin_minor_coda1",
	bigwin_major_lvl3_pass3 = "bigwin_major_lvl3_pass3",
	bigwin_major_lvl4_pass3 = "bigwin_major_lvl4_pass3",
	bigwin_major_coda1 = "bigwin_major_coda1",
	bigwin_minor_coda2 = "bigwin_minor_coda2",
	bigwin_major_coda2 = "bigwin_major_coda2",
	
	//Special symbol appear sounds, increasing intensity
	bonus_special_symbol_appear_1 = "bonus_special_symbol_appear_1",
	bonus_special_symbol_appear_2 = "bonus_special_symbol_appear_2",
	bonus_special_symbol_appear_3 = "bonus_special_symbol_appear_3",
	
	bonus_luckyboot = "bonus_luckyboot", //clown horn
	bonus_plus1spin = "bonus_plus1spin", //jerry can
	bonus_runner = "bonus_runner", //runner
	
	bonus_special_symbol_activate = "bonus_special_symbol_activate",
	bonus_buck_activate = "bonus_buck_activate",

	
	//sixpack sounds
	bonus_sixpack_bottle_clank = "bonus_sixpack_bottle_clank",
	bonus_sixpack_cap_pop = "bonus_sixpack_cap_pop",
	bonus_sixpack_empty = "bonus_sixpack_empty",
	bonus_sixpack_throw = "bonus_sixpack_throw",

	//Bonus game music
	bonus_S1_intro = "bonus_S1_intro",
	bonus_S1_loop = "bonus_S1_loop",
	bonus_S1_end1 = "bonus_S1_end1",
	bonus_S1_end2 = "bonus_S1_end2",
	
	//bonus_S2_intro = "bonus_S2_intro",
	bonus_S2_loop = "bonus_S2_loop",
	bonus_S2_end = "bonus_S2_end",
	
	bonus_spin_reset = "bonus_spin_reset",
	bonus_S3_loop = "bonus_S3_loop",
	bonus_S3_end1 = "bonus_S3_end1",
	bonus_S3_end2 = "bonus_S3_end2",
	
	bonus_S1_react = "bonus_S1_react",
	bonus_S2_react = "bonus_S2_react",
	bonus_S3_react = "bonus_S3_react",
	//bonus_react = "bonus_react_2",
	
	bonus_after_last_spin = "bonus_after_last_spin",
	bonus_collect_wave = "bonus_collect_wave",
	bonus_row_expand = "bonus_row_expand",
	
	
	
	//Generics
	spins_left_reset = "spins_left_reset",
	spins_left_hit = "spins_left_hit",
	bonus_bell_3x = "bonus_bell_3x",
	bonus_buck_catchboost_spin_3 = "bonus_buck_catchboost_spin_3",
	bonus_buck_catchboost_spin_2 = "bonus_buck_catchboost_spin_2",
	bonus_buck_catchboost_spin_1 = "bonus_buck_catchboost_spin_1",
	
	
	
	
	
	//SOUND EFFECTS
//	eff_beer = "eff_beer",
//	eff_countingup_1 = "eff_countingup_1",
//	eff_countingup_2 = "eff_countingup_2",
	//eff_generic_add = "eff_generic_add",
//	eff_generic_add_2 = "eff_generic_add_2",
	eff_trail_shoot = "eff_trail_shoot",
	eff_trail_hit = "eff_trail_hit",
	//eff_greenbass = "eff_greenbass",
	
	weed_appear = "weed_appear",
	
	eff_hit_2 = "eff_hit_2",
	eff_hit_3 = "eff_hit_3",
//	eff_woosh2 = "eff_woosh",
	//eff_modern_appear = "eff_modern_appear",
	eff_truck_2 = "eff_truck_2",
	eff_truck_short = "eff_truck_short",
//	eff_boat = "eff_boat",
	eff_boat_multiplier = "eff_boat_multiplier",
	bonus_cash_collect_1 = "bonus_cash_collect_1",
	bonus_cash_collect_2 = "bonus_cash_collect_2",
	bonus_cash_collect_3 = "bonus_cash_collect_3",
	
	total_win_counter_tick = "total_win_counter_tick", //1 by 1 jump
	total_win_counter_chime_1 = "total_win_counter_chime_1",
	total_win_counter_chime_2 = "total_win_counter_chime_2",
	total_win_counter_chime_3 = "total_win_counter_chime_3",
	total_win_counter_chime_4 = "total_win_counter_chime_4",
	
	
	//total_win_counter_jump_short = "total_win_counter_jump_short", //quick jummps for larger nums
	total_win_counter_accent_1 = "total_win_counter_accent_1", //start sound for counter
	total_win_counter_accent_2 = "total_win_counter_accent_2", //start sound for counter
	total_win_counter_accent_3 = "total_win_counter_accent_3", //start sound for counter
	
	
}

/*ločeni zvoki za evente v igri: 
spin (click) 					-> spinclick.wav
spin actual start of gfx		-> spinstart.wav
spin stop @ gfx end				-> spinstop.wav
force stop (click)				-> click_long.wav
win								-> win_cadd.wav
cascade							-> cascade.wav
*/



/*		playing sounds manager
*	FIFO
*	first of its kind first out (on stop)
*	Array<SoundPlaying>
*	
*
*/

//Class is just to connect CONTEXT with SOUND_TYPE
class SoundPlaying{
	
	context : number;
	type : SOUND_TYPE;
	param : any; //TODO param should be interface type
	onEnd : any;
	constructor(ctx : number, tp : SOUND_TYPE, p : any, onEnd : any = null){
		this.context = ctx;
		this.type= tp;
		this.param = p;
		this.onEnd = onEnd;
	}
	
	global_pause : boolean = false; //why is this here?
}
export class fpaudio{
	
	//protected static allHowls : Array<Howl>;
	public static _Howl : Howl; //TODO should be protected
	private static _to_load_count = 0;
	private static _after_load_callback : any;
	private static _jsonFile : any;
	private static _allSoundsPlaying : Array<SoundPlaying>;
	
	private static _MUTED = false;
	
	static param_GAME_WIN = "game_win";
	
	private static logSoundEffects = false;
	
	public static _audioSprite : any;
	
	private static _globalVolume: number = 1;
	
	public static _music_playing = true;
	
	public static getIsMuted(){
		return fpaudio._MUTED;
	}
	
	public static getIsAudioUnlocked(){
		let howl : any = fpaudio._Howl;
		let ret = !howl._playLock;
		return ret;
	}
	
	public static getGlobalVolume(): number {
		return fpaudio._globalVolume;
	}
	
	public static setGlobalVolume(volume: number) {
		fpaudio._globalVolume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
		fpaudio._Howl.volume(fpaudio._globalVolume); // Set global Howler volume
	}
	
	//parse audio file, static as we only need one file
	public static parseAudioFileAndCreateHowler( callback : any){
		//this is before global on load
		
		if(fpglobals.getURIParamValue("novideo") == true){
			this._music_playing = false;
		}
		if(fpglobals.getURIParamValue("nomusic") == true){
			this._music_playing = false;
		}
		
		//fpaudio.allHowls = new Array<Howl>();
		this._after_load_callback = callback;
		
		//get resource
		fpaudio._jsonFile = Macro.getResourceByName("mainaudio_sprite");
		//fpaudio._audioFile = Macro.getResourceByName("mainaudio");
		
		if(fpaudio._jsonFile == undefined){
			throw "Error missing audio files!"; //TODO fp wrapper for errors
		}
		
		fpaudio._audioSprite = fpaudio._jsonFile.data.data.audioSprite; //To have a collection of all sounds
		fpaudio.validateAllSoundsExist();
		
		//parse json to window
		let textToEval= "";
		textToEval += "window.MyAudioSprite = JSON.parse('{";
		
		for(let snd of fpaudio._jsonFile.data.data.audioSprite){
			textToEval+= "\"" + String(snd.id) + "\": [" + String(snd.startTime) + "," + snd.duration + "],";
		}
		textToEval = textToEval.substring(0,textToEval.length-1);
		
		textToEval += "}');"; //end
		eval(textToEval);
		
		fpaudio._allSoundsPlaying = new Array<SoundPlaying>();
		
		Howler.autoUnlock = true;
		Howler.usingWebAudio = true;
		
		//create HOWLS
//		for(let i = 0; i < sprite.data.data.audioSprite.length; i++){
			fpaudio._to_load_count++;
			let instance : Howl =
			new Howl({
				//src: fpaudio._audioFile.url,//this.soundFile.nativeUrl,
				src: "./audio/mainaudio.mp3",
				html5: false, //this is evil
				autoplay: false,
	//			onload: this.onLoadedSprite,
	//			onplay: this.onPlaySprite,
	//			onend: this.onPlayEndSprite,
				//loop: false,
				//sprite: eval(textToEval),
				//sprite: sprite.data.data.audioSprite,//window.MyAudioSprite,
				sprite: window.MyAudioSprite,
				//autoSuspend: false,
				volume: 0.5,
				
	//			stereo : 1
			});
			//fpaudio.allHowls.push(instance);
			fpaudio._Howl = instance;
			
			instance.on('load', fpaudio.afterHowlerLoadUpdate);
			instance.on('end', fpaudio.onSoundEnd);
			instance.on('stop', fpaudio.onSoundEnd);
//		}
		
		SoundDirector.init();
		//fpaudio._howler.on("load", callback);
		
	}
	private static afterHowlerLoadUpdate(){
		fpaudio._to_load_count--;
		if(fpaudio._to_load_count == 0){
			fpaudio.ToggleMute(fpaudio._MUTED);
			fpaudio._after_load_callback();
		}
	}
	
	public static setFadeInPerType(type : SOUND_TYPE, fadein : number = 500){
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].type == type){
				fpaudio._Howl.fade(0, 1, fadein, fpaudio._allSoundsPlaying[i].context);
				return;
			}
		}
	}
	public static getCurrentTrackTime(type : SOUND_TYPE) : number | null {
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].type == type){
				//similar to seek, we need to ajust based on whole track
				
				let track_strart_time = fpaudio.getTrackStartTime(type);
				return fpaudio._Howl.seek(fpaudio._allSoundsPlaying[i].context)*1000 - track_strart_time;
			}
		}
		return null;
	}
	
	
	public static PlaySound(type : SOUND_TYPE, stop_previous : boolean = true, param : string = "", volume : number | undefined = undefined, onEnd : any = null){
		//debug output
		//Print Start Playing : name
		//List of Currently playing:
		
		if(type == SOUND_TYPE.NONE){
			return; //Do not play //TODO LOG
		}
		
		//let snd : Howl | undefined = this.getSoundPerType(type);
		let snd : string | undefined = fpaudio.getSoundIDPerType(type);
		if(snd != undefined){
			if(stop_previous){
				fpaudio.StopSoundByType(type);
			}
			let mute = param.includes("mute");
			let fadein = param.includes("fadein");
			
			let _context : number;
			
			_context = fpaudio._Howl.play(snd); /////// main howler play
			
			if(volume != undefined){
				fpaudio._Howl.volume(volume, _context);
			}else{
				fpaudio._Howl.volume(fpaudio.getVolumePerType(type, mute), _context);
			}
			if(fadein){
				fpaudio._Howl.volume(fpaudio.getVolumePerType(type, true), _context);
				fpaudio._Howl.fade(0, 1, 500, _context);
			}
			let newsnd = new SoundPlaying(_context, type, param, onEnd);
			fpaudio._allSoundsPlaying.push(newsnd);
			
			if(fpglobals.log_audio_events){
				let isSoundEffect = fpaudio.isAudioEffect(type);
				if(fpaudio.logSoundEffects || !isSoundEffect){
					fpglobals.GLog("started sound: " + (type).toString() + " context: " + _context , log.type.SOUND_PLAYING);
				}
			}
			return _context;
		}
		return undefined;
	}
	public static getTrackLength(type : SOUND_TYPE, plusStartTime : boolean = false) : number{
		let snd : any | undefined = fpaudio.getSoundSpritePerType(type);
		if(snd != undefined){
			if(plusStartTime){
				return snd.duration + snd.startTime; //return in miliseconds
			}
			return snd.duration; //return in miliseconds
		}
		return 0;
	}
	public static getTrackStartTime(type : SOUND_TYPE) : number{
		let snd : any | undefined = fpaudio.getSoundSpritePerType(type);
		if(snd != undefined){
			return snd.startTime; //return in miliseconds
		}
		return 0;
	}
	public static setSeekPerTypeMS(type : SOUND_TYPE, seek : number){
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].type == type){
				let len = fpaudio.getTrackLength(type);
				let seek_ms = len+ seek;
				fpaudio.setSeekMS(fpaudio._allSoundsPlaying[i].context, seek_ms);
				return;
			}
		}
	}
	public static setSeekPerType(type : SOUND_TYPE, seek : number){
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].type == type){
				let len = fpaudio.getTrackStartTime(type);
				let seek_ms = (len/1000)+(seek/1000);
				fpaudio.setSeek(fpaudio._allSoundsPlaying[i].context, seek_ms);
				return;
			}
		}
	}
	private static setSeekMS(context : number, seek : number){
		fpaudio._Howl.seek(seek*1000.0, context);
		return;
	}
	private static setSeek(context : number, seek : number){
		fpaudio._Howl.seek(seek, context);
		return;
	}
	
	
	public static SetVolumePerType(type : SOUND_TYPE, volume : number = -1) : boolean{
		if(volume == -1){
			volume = fpaudio.getVolumePerType(type);
		}
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].type == type){
				fpaudio._Howl.volume(volume, fpaudio._allSoundsPlaying[i].context);
				return true;
			}
		}
		return false;
	}
	
	public static SetRatePerType(type : SOUND_TYPE, rate : number) {
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].type == type){
				fpaudio._Howl.rate(rate, fpaudio._allSoundsPlaying[i].context);
			}
		}
	}
	
	private static getVolumePerType(type : SOUND_TYPE, mute : boolean = false) : number{
		if(mute){return 0;}
		let baseVolume: number;
		let music_volume = 0.5;
		if(!fpaudio._music_playing){
			music_volume = 0;
		}
		switch(type){
			default:
				baseVolume = 1;
		}
		return baseVolume;
	}
	
	public static StopSoundByType(type : SOUND_TYPE){
		let all = true;
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].type == type){
				if(fpaudio._allSoundsPlaying[i].param.includes("loop")){
					//remove loop from param
					let newparam = (fpaudio._allSoundsPlaying[i].param as string).replace("loop", "");
					fpaudio._allSoundsPlaying[i].param = newparam;
				}
				if(fpglobals.log_audio_events){
					fpglobals.GLog("STOPPING sound: " +
					 (type).toString() +
					  " context: " +
					   fpaudio._allSoundsPlaying[i].context, log.type.SOUND_STOPPED );
				}
				fpaudio._Howl.stop(fpaudio._allSoundsPlaying[i].context);
				if(!all){break;}
			}
		}
		while(true){
			let found = false;
			for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
				if(fpaudio._allSoundsPlaying[i].type == type){
					fpaudio._allSoundsPlaying.splice(i, 1);
					found = true;
					break;
				}
			}
			if(!found){break;}
		}
	}
	public static FadeOutSoundByType(type : SOUND_TYPE, removeLoop = true, fadeoutMs : number = 500){
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].type == type){
				if(fpglobals.log_audio_events){
					fpglobals.GLog("FADING OUT sound: " +
					 (type).toString() +
					  " context: " +
					   fpaudio._allSoundsPlaying[i].context, log.type.SOUND_STOPPED );
				}
				fpaudio._Howl.fade(fpaudio.getVolumePerType(type, false), 0, fadeoutMs, fpaudio._allSoundsPlaying[i].context);
				if(removeLoop){
					if((fpaudio._allSoundsPlaying[i].param as string).includes("loop")){
						let newparam = (fpaudio._allSoundsPlaying[i].param as string).replace("loop", "");
						fpaudio._allSoundsPlaying[i].param = newparam;
					}
				}
				break;
			}
		}
	}
	public static PauseSoundByType(type : SOUND_TYPE){
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].type == type){
				fpaudio._Howl.pause(fpaudio._allSoundsPlaying[i].context);
			}
		}
	}
	public static ResumeSoundByType(type : SOUND_TYPE){
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].type == type){
				fpaudio._Howl.play(fpaudio._allSoundsPlaying[i].context);
			}
		}
	}
	public static StopSoundByContext(context : number){
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].context == context){
				if(fpaudio._allSoundsPlaying[i].param.includes("loop")){
					//remove loop from param
					let newparam = (fpaudio._allSoundsPlaying[i].param as string).replace("loop", "");
					fpaudio._allSoundsPlaying[i].param = newparam;
				}
				if(fpglobals.log_audio_events){
					fpglobals.GLog("STOPPING sound: " +
					 (fpaudio._allSoundsPlaying[i].type).toString() +
					  " context: " +
					   fpaudio._allSoundsPlaying[i].context, log.type.SOUND_STOPPED );
				}
				fpaudio._Howl.stop(fpaudio._allSoundsPlaying[i].context);
				//splice from array
				fpaudio._allSoundsPlaying.splice(i, 1);
				break;
			}
		}
	}
	public static StopAllSouds(){
		BaseMusicDirector.stopBaseGameMusic();
		BonusMusicDirector.stopBonusMusic();
		let copy = [...fpaudio._allSoundsPlaying]; // Create a proper copy
		for(let i = 0; i < copy.length; i++){
			fpaudio.StopSoundByContext(copy[i].context);
		}
		
		// Force sync with Howler's internal state by stopping all sounds if any remain
		fpaudio._Howl.stop();
		fpaudio._allSoundsPlaying = [];
	}
	public static ToggleMute(mute : false | null | true = null){
		if(mute == null){
			if(fpaudio._MUTED){
				fpaudio._MUTED = false;
				if(fpglobals._DEBUG_){fpglobals.GLog("ALL SOUNDS UNMUTED!");}
			}else{
				fpaudio._MUTED = true;
				if(fpglobals._DEBUG_){fpglobals.GLog("ALL SOUNDS MUTED!");}
			}
		}
		else{
			if(mute){
//				(this._Howl as any)._volume = 0;
				fpaudio._MUTED = true;
				if(fpglobals._DEBUG_){fpglobals.GLog("ALL SOUNDS MUTED!");}
			}else{
//				(this._Howl as any)._volume = 1;
				fpaudio._MUTED = false;
				if(fpglobals._DEBUG_){fpglobals.GLog("ALL SOUNDS UNMUTED!");}
			}
		}
		
		fpaudio._Howl.mute(fpaudio._MUTED); //mute all
		
		//emmit ui event
		fpglobals.UIEE.emit(UI_EVENT.MUTE, fpaudio._MUTED);
		
		return fpaudio._MUTED;
	}
	
	public static getIsPlaying(type : SOUND_TYPE) : boolean{
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].type == type){
				if(fpaudio._Howl.playing(fpaudio._allSoundsPlaying[i].context)){
					return true;
				}
				//ignore if paused
				continue;
			}
		}
		return false;
	}
	
	public static getIsPlayingOrPaused(type : SOUND_TYPE) : boolean{
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			if(fpaudio._allSoundsPlaying[i].type == type){
				return true;
			}
		}
		return false;
	}
	
	public static isAudioEffect(type : SOUND_TYPE) : boolean{
		switch(type){
			case SOUND_TYPE.symbols_drop_old_ambience_1:
			case SOUND_TYPE.symbols_drop_old_ambience_2:
			case SOUND_TYPE.symbols_drop_new_ambience_1:
			case SOUND_TYPE.symbols_drop_new_ambience_2:
			case SOUND_TYPE.symbols_drop_tick_lunker:
			case SOUND_TYPE.symbols_drop_tick_1:
			case SOUND_TYPE.symbols_drop_tick_2:
			case SOUND_TYPE.symbols_drop_tick_3:
			case SOUND_TYPE.symbols_drop_tick_4:
			case SOUND_TYPE.symbols_drop_tick_5:
			case SOUND_TYPE.symbols_drop_tick_stack_1:
			case SOUND_TYPE.symbols_drop_tick_stack_2:
			case SOUND_TYPE.symbols_drop_tick_stack_3:
			case SOUND_TYPE.symbols_drop_tick_stack_4:
			case SOUND_TYPE.symbols_drop_tick_fairgame:
				return true;
			default:
				return false;
		}
	}
	
	
	
	
	
	
	
	
	
	
	//https://stackoverflow.com/questions/7238586/do-i-need-to-be-concerned-with-race-conditions-with-asynchronous-javascript/7238663#7238663
	private static onSoundEnd(snd_ctx : number){ 
		//match with array and remove
		//let arr_sndsToLoop = new Array<SOUND_TYPE>();
		let arr_sndsToLoop_Param = new Array<{type: SOUND_TYPE, param: string, volume: number, muted: boolean}>();
		let new_arr = new Array<SoundPlaying>(); 
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			let current_snd = fpaudio._allSoundsPlaying[i];
			if(current_snd.context == snd_ctx){
				//do not add to new arr
				//if(fpglobals._DEBUG_){
				//	fpglobals.GLog("removing sound: " 
				//	+ (current_snd.type).toString() 
				//	+ " context: " 
				//	+ current_snd.context );
				//}
				//if param is not undefined
				if(current_snd.param != undefined){
					if(current_snd.param.includes("loop")){
						//arr_sndsToLoop.push(current_snd.type);
						//get if current sound is muted
						let muted = fpaudio.isMutedByContext(current_snd.context);
						let volume = fpaudio.getVolumeByContext(current_snd.context);
						
						arr_sndsToLoop_Param.push(
							{type: current_snd.type,
							param: current_snd.param,
							volume: volume,
							muted: muted}
						);
					}
				}if(current_snd.onEnd != null){
					current_snd.onEnd();
				}
			}else{
				new_arr.push(current_snd);
			}
		}
		fpaudio._allSoundsPlaying = new_arr; //no race conditions here, single threaded
		for(let i = 0; i < arr_sndsToLoop_Param.length; i++){
			let toPlay = arr_sndsToLoop_Param[i];
			if(toPlay.muted){toPlay.param = toPlay.param + "|mute";}
			fpaudio.PlaySound(toPlay.type, false, toPlay.param);
			//fpaudio.PlaySound(arr_sndsToLoop[i], false, "loop"); //TODO check if this looping is ok
		}
	}
	
		
	public static doesSoundExist(type : SOUND_TYPE) : boolean{
		if(type == SOUND_TYPE.NONE){
			return true;
		}
		if(fpaudio._audioSprite == undefined){
			return false;
		}
		let toSearch = type.toString().toLowerCase();
		for(let snd of fpaudio._audioSprite){
			if((snd.id).toLowerCase() == toSearch){
				return true;
			}
		}
		return false;
	}
	
	private static validateAllSoundsExist(){
		let missing : Array<string> = [];
		for(let type of Object.values(SOUND_TYPE)){
			if(type == SOUND_TYPE.NONE){
				continue;
			}
			if(!fpaudio.doesSoundExist(type as SOUND_TYPE)){
				missing.push(String(type));
			}
		}
		if(missing.length > 0){
			fpglobals.GLog("Missing audiosprite sounds (" + missing.length + "): " + missing.join(", "), log.type.ERROR);
		}else if(fpglobals._DEBUG_){
			fpglobals.GLog("All SOUND_TYPE entries found in audiosprite", log.type.LOADING);
		}
	}
	
	private static getSoundIDPerType(type : SOUND_TYPE) : string | undefined{
		let toRet = this.getSoundSpritePerType(type);
		if(toRet != undefined){
			return toRet.id;
		}
		return undefined;
	}
	
	private static getSoundSpritePerType(type : SOUND_TYPE) : any | undefined{
		
		let toSearch : string = "";
		try{
			toSearch = String(type);
		}
		catch(param : any){
			fpglobals.GLog("ERROR cannot convert enum to string!", log.type.ERROR);
		}
		
		toSearch = type.toString(); //seems to work
		
		//search
		for(let snd of fpaudio._jsonFile.data.data.audioSprite){
			if((snd.id).toLowerCase() == (toSearch).toLowerCase()){
				return snd;
			}
		}
		fpglobals.GLog("cannot find audio: " + toSearch, log.type.EXCEPTION);
		return undefined;
	}
	
	
	
	
	
	public static PAUSE_ALL(type : INTERRUPT_TYPE){
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			let this_iter = fpaudio._allSoundsPlaying[i];
			let ctx = this_iter.context;
			
			if(type == INTERRUPT_TYPE.GAME_WIN){
				if(this_iter.param.includes(fpaudio.param_GAME_WIN)){
					continue;
				}
			}
			
			if(fpaudio._Howl.playing(ctx)){
				fpaudio._Howl.pause(ctx);
				fpaudio._allSoundsPlaying[i].global_pause = true;
			}
		}
	}
	public static RESUME_ALL(){
		for(let i = 0; i < fpaudio._allSoundsPlaying.length; i++){
			let ctx = fpaudio._allSoundsPlaying[i].context;
			
			if(fpaudio._allSoundsPlaying[i].global_pause){
				fpaudio._Howl.play(ctx);
				fpaudio._allSoundsPlaying[i].global_pause = false;
			}
		}
	}
	
	
	//invoked once by events
	public static bindEvents(ee : any, spinee = true){
		if(spinee){
			SoundDirector.bindEvents(ee, true);
		} else{
			SoundDirector.bindEvents(ee, false);
		}
	}
	
	public static getVolumeByContext(context: number): number {
		let toReturn = fpaudio._Howl.volume(context);
		if(typeof toReturn === 'number'){
			return toReturn;
		}
		return 1;
	}

	public static isMutedByContext(context: number): boolean {
		return fpaudio._Howl.volume(context) === 0;
	}
	
	
	
	
}