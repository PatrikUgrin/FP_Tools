import { fpaudio, SOUND_TYPE } from "./fpaudio";
import { AudioScheduler } from "./AudioScheduler";
import { fpglobals } from "../fpglobals";
import { UI_EVENT, SPIN_EVENT } from "../events";
import { SoundDirector } from "./SoundDirector";

export enum BGMUSIC_PARAM {
	RESUME,
    SCHEDULED_REPEAT,
    INIT_START,
    INTERRUPTED_START,
	POST_BONUS_START //afgter bonus we force playback of INTRO 
}

enum MusicState {
	RUNNING,
	PAUSED,
	STOPPED
}
export class BaseMusicDirector {
    
	private static _currentBaseGameSound: SOUND_TYPE | null = null;
    private static _nextBaseGameAudio: string | null = null;
    private static baseGameScheduler: AudioScheduler;
	private static bonusGameScheduler: AudioScheduler;
	
	private static _nextBaseGameAudio_id : string | null = null;
	
	private static _currentState : MusicState = MusicState.STOPPED;
	private static _pausedProgress : number = 0;
	
	public static IS_RUNNING : boolean = false; //global flag for switching between base and bonus
	
	
    public static init() {
        this.baseGameScheduler = new AudioScheduler("baseGameMusic", fpglobals._GROUP, fpglobals.masterTicker);
    }

    public static startBaseGameMusic(param: BGMUSIC_PARAM) {
		if(!fpaudio._music_playing){
			return;
		}
		if(param == BGMUSIC_PARAM.RESUME&&this._currentState!=MusicState.PAUSED){
			param = BGMUSIC_PARAM.INTERRUPTED_START; //it was stopped
		}
        if (param == BGMUSIC_PARAM.INIT_START
            || param == BGMUSIC_PARAM.INTERRUPTED_START
        ) {
            BaseMusicDirector.stopBaseGameMusic();
			this._nextBaseGameAudio_id = null;
        }
        // Get the next sound to play
        const nextSound = this.getNextBaseGameSound(param);
		this._currentBaseGameSound = nextSound;
		
		if(param == BGMUSIC_PARAM.RESUME){
			fpaudio.ResumeSoundByType(nextSound);
			fpaudio.setFadeInPerType(nextSound, 300);
			//fpaudio.setSeekPerTypeMS(nextSound, this._pausedProgress * fpaudio.getTrackLength(nextSound));
		}else{
			// Play the sound
			const ctx = fpaudio.PlaySound(nextSound, false, "", 1);
		}
        // Get the duration of the track
        let trackDuration = fpaudio.getTrackLength(nextSound);
		if(param == BGMUSIC_PARAM.RESUME){
			//alternatively get current track time?
			let _pausedTime = fpaudio.getCurrentTrackTime(nextSound);
			if(_pausedTime != null){
				//accurate track time
				trackDuration = trackDuration - _pausedTime;
				trackDuration = trackDuration - 2000;
			}else{
				this._pausedProgress = 1.0 - this._pausedProgress;
				trackDuration = this._pausedProgress * (trackDuration - 2000);
			}
			
		}else{
			trackDuration -= 2000;//2000ms is track offset
		}

        // Generate a unique ID for this audio schedule
        this._nextBaseGameAudio = `basegame_${nextSound}_${Date.now()}`;

        // Schedule the next sound to play when this one ends
       this._nextBaseGameAudio_id =
		this.baseGameScheduler.scheduleCallback(
            this._nextBaseGameAudio,
            () => {
                this._nextBaseGameAudio = null;
                this.startBaseGameMusic(BGMUSIC_PARAM.SCHEDULED_REPEAT);
            },
            trackDuration
        );
		this._currentState = MusicState.RUNNING;
    }

    public static pauseBaseGameMusic(durationMs : number = 500) {
		
		//for pausing we need to get the current progress of the tween
		//fade out sound
		// then when resuming reinstate scheduler and resume sound from where it was paused
		
		if(this._nextBaseGameAudio_id){
			//from audioscheduler get current progress
			this._pausedProgress = this.baseGameScheduler.getCurrentProgress(this._nextBaseGameAudio_id!);
			if(this._pausedProgress > 0.9){
				//cancel music and stop it
				BaseMusicDirector.stopBaseGameMusic();
				this._currentState = MusicState.STOPPED;
				return;
			}
			this.baseGameScheduler.cancelAll();
			fpaudio.FadeOutSoundByType(this._currentBaseGameSound as SOUND_TYPE, true, durationMs);
			//fpaudio.PauseSoundByType(this._currentBaseGameSound as SOUND_TYPE);
			this._currentState = MusicState.PAUSED;
			this.baseGameScheduler.scheduleCallback(
				this._nextBaseGameAudio_id!,() => {
					//pause audio after fadeout
					fpaudio.PauseSoundByType(this._currentBaseGameSound as SOUND_TYPE);
				},
				durationMs
			);
			this._currentState = MusicState.PAUSED;
		}
    }

    public static resumeBaseGameMusic() {
        this.startBaseGameMusic(BGMUSIC_PARAM.RESUME);
    }
	
    public static stopBaseGameMusic() {
		this._currentState = MusicState.STOPPED;
		this._pausedProgress = 0;
        if (this._nextBaseGameAudio) {
            this.baseGameScheduler.cancelScheduledCallback(this._nextBaseGameAudio);
            this._nextBaseGameAudio = null;
        }
        fpaudio.StopSoundByType(this._currentBaseGameSound as SOUND_TYPE);
        this._currentBaseGameSound = null;
		this._nextBaseGameAudio_id = null;
    }

    private static getNextBaseGameSound(param: BGMUSIC_PARAM): SOUND_TYPE {
		
		//on interrupted start we rtestar with 
		//solo bridge or grind
		if(param == BGMUSIC_PARAM.INTERRUPTED_START){
			return Math.random() < 0.5 ? SOUND_TYPE.base_music_solo_bridge : SOUND_TYPE.base_music_grind;
		}
		
		if(param == BGMUSIC_PARAM.POST_BONUS_START){
			return SOUND_TYPE.base_music_intro;
		}
		if(param == BGMUSIC_PARAM.RESUME){
			if(this._currentBaseGameSound == null){
				return SOUND_TYPE.base_music_intro;
			}
			return this._currentBaseGameSound!;
		}
        if (this._currentBaseGameSound == null) {
            return SOUND_TYPE.base_music_intro;
        } else if (this._currentBaseGameSound == SOUND_TYPE.base_music_intro) {
            //50% solo_bridge, 50% grind
            return Math.random() < 0.5 ? SOUND_TYPE.base_music_solo_bridge : SOUND_TYPE.base_music_grind;
        } else if (this._currentBaseGameSound == SOUND_TYPE.base_music_solo_bridge) {
            return SOUND_TYPE.base_music_grind;
        } else if (this._currentBaseGameSound == SOUND_TYPE.base_music_grind) {
            //33% solo_bridge, 33% intro, 33% grind
            const list = [SOUND_TYPE.base_music_solo_bridge, SOUND_TYPE.base_music_intro, SOUND_TYPE.base_music_grind];
            return list[Math.floor(Math.random() * list.length)];
        }else return this._currentBaseGameSound;
    }
	
	
	
	
	public static bindEvents(ee : any, spinee = true){
		
		if(spinee){
			ee.addListener(SPIN_EVENT.FG_ENTER, ()=>{
				BaseMusicDirector.IS_RUNNING = false;
				SoundDirector.stopSoundByType(SOUND_TYPE.bonus_award_thrill);
				BaseMusicDirector.stopBaseGameMusic();
				//fpaudio.FadeOutSoundByType(SOUND_TYPE.bonus_intro, true);
				//fpaudio.PlaySound(SOUND_TYPE.ambient_bonus, true,"loop");
			});
			ee.addListener(SPIN_EVENT.SPIN_FEATURE_END_WAIT, ()=>{
				fpaudio.StopAllSouds();
				BaseMusicDirector.IS_RUNNING = true;
				BaseMusicDirector.startBaseGameMusic(BGMUSIC_PARAM.POST_BONUS_START);
			});
			ee.addListener(SPIN_EVENT.FG_EXIT, ()=>{
				BaseMusicDirector.IS_RUNNING = true;
			});
			
			ee.addListener(SPIN_EVENT.BIGWINSEQ_START, (param : any)=>{
				if(BaseMusicDirector.IS_RUNNING){
					BaseMusicDirector.stopBaseGameMusic();
				}
			});
			ee.addListener(SPIN_EVENT.BG_LUNKER_WAVE_START, (param : any)=>{
				if(BaseMusicDirector.IS_RUNNING){
					BaseMusicDirector.stopBaseGameMusic();
				}
			});
			ee.addListener(SPIN_EVENT.BG_LUNKER_WAVE_END, (param : any)=>{
				if(BaseMusicDirector.IS_RUNNING){
					BaseMusicDirector.startBaseGameMusic(BGMUSIC_PARAM.INTERRUPTED_START);
				}
			});
			ee.addListener(SPIN_EVENT.BIGWINSEQ_END, (param : any)=>{
				if(BaseMusicDirector.IS_RUNNING){
					BaseMusicDirector.startBaseGameMusic(BGMUSIC_PARAM.INTERRUPTED_START);
				}
			});
			ee.addListener(SPIN_EVENT.EFF_SLOWMO_START, (param : any)=>{
				if(BaseMusicDirector.IS_RUNNING){
					BaseMusicDirector.pauseBaseGameMusic(200);
					fpaudio.PlaySound(SOUND_TYPE.eff_slowmo);
				}
			});
			ee.addListener(SPIN_EVENT.EFF_SLOWMO_END, (param : any)=>{
				if(BaseMusicDirector.IS_RUNNING){
					BaseMusicDirector.resumeBaseGameMusic();
				}
			});
			ee.addListener(SPIN_EVENT.BG_MID_FG_WON, (param : any)=>{ //Won bonus mid-game
				if(BaseMusicDirector.IS_RUNNING){ //Todo slow motion exceptions?
					BaseMusicDirector.stopBaseGameMusic();
					BaseMusicDirector.IS_RUNNING = false;
					SoundDirector.playSound(SOUND_TYPE.bonus_award_thrill, false, "loop");
				}
			});
		}
		else{
			//UI EVENT
			fpglobals.UIEE.addListener(UI_EVENT.SPLASH_HIDE, ()=>{
				fpaudio.FadeOutSoundByType(SOUND_TYPE.splash_intro);
				BaseMusicDirector.IS_RUNNING = true;
				BaseMusicDirector.startBaseGameMusic(BGMUSIC_PARAM.INIT_START);
			});
		}
	}
}
