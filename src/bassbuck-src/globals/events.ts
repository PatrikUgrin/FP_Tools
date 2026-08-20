import { effect } from "../effects/effects";
import { spin } from "../reelspin/BaseGame/spin";
import { SpinDataset } from "../reelspin/SpinDataset";
import { fpglobals } from "./fpglobals";
import { SOUND_TYPE, fpaudio } from "../globals/audio/fpaudio";
import { UIHandler } from "../window/UIHandler";
import { devpanel } from "./dev/devpanel";
import { fp_error, INTERRUPT_TYPE } from "./fp_error";
import { screenResizeHandler } from "../window/screenResizeHandler";
import { timing } from "../reelspin/timing/timing";
import { SpineController } from "../spine/SpineController";
import { SoundDirector } from "./audio/SoundDirector";
import { enableScreenWakeLock, requestScreenWakeLock } from "./wakeLock";

//standard spin event parameter interface
export interface SPIN_EV_PARAM{
	value : any,
	float : number,
	int : number,
} 

export enum SPIN_EVENT{

	TEST_HIT = "TEST_HIT",
	
	SPIN_START = "SPIN_START",
	BONUS_SPIN_START = "BONUS_SPIN_START",
	SPIN_END = "SPIN_END", //full spin end
	
	
	SPIN_FEATURE_WAIT = "SPIN_FEATURE_WAIT", //click to enter feature
	SPIN_BONUS_INTRO = "SPIN_BONUS_INTRO", //Animation before click to enter
	SPIN_FEATURE_END_WAIT = "SPIN_FEATURE_END_WAIT", //click to return to base game
	
	FG_ENTER = "FG_ENTER",
	//SPIN_FEATURE_END_WAIT before exit
	FG_EXIT = "FG_EXIT",
	OP_GRID_UPDATE = "OP_GRID_UPDATE",
	
	FG_SPINS_COUNTER_UPDATE = "FG_SPINS_COUNTER_UPDATE", //spins left
	FG_MP_COUNTER_UPDATE = "FG_MP_COUNTER_UPDATE",	//running total win
	
	FG_LAST_SPIN_THRILL_START = "FG_LAST_SPIN_THRILL_START", //0 spin counter
	FG_LAST_SPIN_THRILL_END = "FG_LAST_SPIN_THRILL_END", //end of last spin thrill
	
	FG_LAST_SPIN_THRILL_AFTER_END = "FG_LAST_SPIN_THRILL_AFTER_END", //after end of last spin thrill
	FG_LAST_SPIN_THRILL_AFTER_END_WITH_WINS = "FG_LAST_SPIN_THRILL_AFTER_END_WITH_WINS", //after end of last spin thrill with wins
	//Only emmited after a REAL last spin
	
	FG_DROPSHOT = "FG_DROPSHOT",
	
	FG_BONUS_SETUP_BASKET_ACTIVATE = "FG_BONUS_SETUP_BASKET_ACTIVATE",
	
	
	//================  WIN EVENTS || BASE GAME
	BG_WIN_INIT = "BG_WIN_INIT",
	
	BG_LOW_WINS_START = "BG_LOW_WINS_START",
	BG_LOW_WINS_END = "BG_LOW_WINS_END",
	
	BG_HIGH_WINS_START = "BG_HIGH_WINS_START", //any
	BG_HIGH_WINS_START_SOUND = "BG_HIGH_WINS_START_SOUND", //any
	BG_HIGH_WINS_END = "BG_HIGH_WINS_END",		//any
	
	BG_HIGH_WINS_GEN = "BG_HIGH_WINS_GEN",		//creating wild
	BG_HIGH_WINS_UPG = "BG_HIGH_WINS_UPG",		//upgrading wild
	
	
	BG_COLL_WINS_START = "BG_COLL_WINS_START", //collector
	BG_COLL_WINS_END = "BG_COLL_WINS_END",		//collector
	
	BG_SCAT_WINS_START = "BG_SCAT_WINS_START", //scatter
	BG_SCAT_WINS_END = "BG_SCAT_WINS_END",		//scatter
	
	BG_END_EVENT_START = "BG_END_EVENT_START",
	BG_END_EVENT_END = "BG_END_EVENT_END",
	
	//end event specific
	BG_END_EVENT_TAGTEAM_START = "BG_END_EVENT_TAGTEAM_START",
	BG_END_EVENT_TAGTEAM_END = "BG_END_EVENT_TAGTEAM_END",
	
	BG_END_EVENT_BASSFRENZY_START = "BG_END_EVENT_BASSFRENZY_START",
	BG_END_EVENT_BASSFRENZY_END = "BG_END_EVENT_BASSFRENZY_END",
	BG_END_EVENT_ADD_LOW = "BG_END_EVENT_ADD_LOW",
	BG_END_EVENT_ADD_MED = "BG_END_EVENT_ADD_MED",
	BG_END_EVENT_ADD_HIG = "BG_END_EVENT_ADD_HIG",
	
	
	//Event per reel?
	BG_THRILL_START_REEL1 = "BG_THRILL_START_REEL1", //thrill starts on reel 1
	BG_THRILL_LAND_REEL1 = "BG_THRILL_LAND_REEL1", //scatter lands on reel 1
	//TODO
	
	
	
	//================================================
	
	BG_CASCADE_START = "BG_CASCADE_START",
	BG_NEW_SYMBOLS_DROP = "BG_NEW_SYMBOLS_DROP",
	BG_CASCADE_END = "BG_CASCADE_END",
	
	
	//symbols reaching end position
	//BG_SYM_ENDPOS = "BG_SYM_ENDPOS", // any normal symbol
	//BG_CASH_SYM_ENDPOS = "BG_CASH_SYM_ENDPOS", // any cash symbol
	//BG_HIGH_CASH_SYM_ENDPOS = "BG_HIGH_CASH_SYM_ENDPOS", // any cash symbol >=50
	BG_BASKET_SYM_ENDPOS = "BG_BASKET_SYM_ENDPOS", // any basket symbol
	

	//ReDone events for blink and chime / bass appear
	BG_BLINK_CHIME_SMALLIES = "BG_BLINK_CHIME_SMALLIES",
	BG_BLINK_CHIME_FAIR = "BG_BLINK_CHIME_FAIR",
	BG_BLINK_CHIME_LUNKER = "BG_BLINK_CHIME_LUNKER",
	BG_BLINK_CHIME_SMALLIES_INERT = "BG_BLINK_CHIME_SMALLIES_INERT",
	BG_BLINK_CHIME_FAIR_INERT = "BG_BLINK_CHIME_FAIR_INERT",
	BG_BLINK_CHIME_LUNKER_INERT = "BG_BLINK_CHIME_LUNKER_INERT",
	BG_COLLECTOR_BEFORE_COLLECT_MARK = "BG_COLLECTOR_BEFORE_COLLECT_MARK", //Oznaka preden collector collecta v BG
	
	
	BG_COLLECTOR_WEED_REMOVE = "BG_COLLECTOR_WEED_REMOVE", //Weed remove event
	BG_COLLECTOR_WEEDBASS_REMOVE = "BG_COLLECTOR_WEEDBASS_REMOVE", //Weed bass remove event
	BG_COLLECTOR_BUCK_CLEAR = "BG_COLLECTOR_BUCK_CLEAR", // BUCK CLEAR EVENT
	
	
	//Start positions reached | Only one is triggered per symbol
	//BG_SYM_STARTPOS = "BG_SYM_STARTPOS",
	//BG_CASH_SYM_STARTPOS = "BG_CASH_SYM_STARTPOS",
	//BG_HIGH_CASH_SYM_STARTPOS = "BG_HIGH_CASH_SYM_STARTPOS",
	//BG_BASKET_SYM_STARTPOS = "BG_BASKET_SYM_STARTPOS",
	//BG_WEEDFISH_HIGH_CASH_SYM_STARTPOS = "BG_WEEDFISH_HIGH_CASH_SYM_STARTPOS",
	//BG_WEEDFISH_HIGH_CASH_SYM_ENDPOS = "BG_WEEDFISH_HIGH_CASH_SYM_ENDPOS",
	
	//When symbol or multiple symbols drop / spinstart/symbols cascade / symbols spin new
	BG_COLUMN_DROP_TICK = "BG_COLUMN_DROP_TICK",
	
	BG_COLUMN_DROP_STACK = "BG_COLUMN_DROP_STACK",
	BG_COLUMN_DROP_FAIRGAME = "BG_COLUMN_DROP_FAIRGAME",
	BG_COLUMN_DROP_LUNKER = "BG_COLUMN_DROP_LUNKER",
	
	
	BG_SCATTER_1_ENDPOS = "BG_SCATTER_1_ENDPOS",
	BG_SCATTER_2_ENDPOS = "BG_SCATTER_2_ENDPOS",
	BG_SCATTER_3_ENDPOS = "BG_SCATTER_3_ENDPOS",
	BG_SCATTER_4_ENDPOS = "BG_SCATTER_4_ENDPOS",
	BG_SCATTER_5_ENDPOS = "BG_SCATTER_5_ENDPOS",
	BG_SCATTER_6_ENDPOS = "BG_SCATTER_6_ENDPOS",
	//after sixth we play sixth
	
	BG_BONUS_INTRO = "BG_BONUS_INTRO",
	BG_BONUS_AWARDED = "BG_BONUS_AWARDED",
	FG_BONUS_INTRO_WAIT = "FG_BONUS_INTRO_WAIT",
	
	BG_MID_FG_WON = "BG_MID_FG_WON", //Won bonus mid-game
	
	GAME_START = 	"game_start",
	GAME_END = 		"game_end", //full spin end
	
	// ========================== BONUS GAME SYMBOLS ==========================
	
	FG_SPIN_START = "FG_SPIN_START",
	FG_SETUP_START = "FG_SETUP_START",
	
	/// WIN SPIN DRAW APPEAR
	
	FG_BUCK_APPEAR = "FG_BUCK_APPEAR",
	FG_SP_APPEAR = "FG_SP_APPEAR",
	FG_BASS_APPEAR = "FG_BASS_APPEAR",
	FG_LUNKER_APPEAR = "FG_LUNKER_APPEAR",
	FG_BOAT_APPEAR = "FG_BOAT_APPEAR",
	FG_TRUCK_APPEAR = "FG_TRUCK_APPEAR",
	FG_PLUSONE_APPEAR = "FG_PLUSONE_APPEAR",
	FG_GREENBASS_APPEAR = "FG_GREENBASS_APPEAR",
	FG_GREENLUNKER_APPEAR = "FG_GREENLUNKER_APPEAR",
	FG_LUCKYBOOT_APPEAR = "FG_LUCKYBOOT_APPEAR",
	
	/// WIN ACTIONS
	
	//collect add covers all buck symbols (collector, dropshot, fullsweep, catchboost)
	FG_BUCK_COLLECT_ADD = "FG_BUCK_COLLECT_ADD", //Buck collect (any) number add
	FG_BUCK_REVIVE = "FG_BUCK_REVIVE", //Buck revive (any buck symbol)

	FG_ROW_EXPAND = "FG_ROW_EXPAND", //Row expand
	FG_BOAT_COLLECT_WAVE = "FG_BOAT_COLLECT_WAVE",
	
	FG_SIXPACK_ACTIVATION = "FG_SIXPACK_ACTIVATION", //Sixpack activation for each symbol
	FG_SIXPACK_RUNOUT = "FG_SIXPACK_RUNOUT", //Sixpack runout (last beer thrown)
	FG_BUCK_CLEAR = "FG_BUCK_CLEAR", //Buck clear (any buck symbol)
	FG_PLUSONE_ACTIVATION = "FG_PLUSONE_ACTIVATION", //Plus one symbol activation
	FG_BASKET_CREATE = "FG_BASKET_CREATE", //Basket create, should be same as base game
	
	FG_BOAT_ACTIVATION = "FG_BOAT_ACTIVATION",
	FG_BOAT_COLLECT_SYMBOL = "FG_BOAT_COLLECT_SYMBOL",
	FG_BOAT_MULTIPLIER = "FG_BOAT_MULTIPLIER",
	FG_TRUCK_ACTIVATION = "FG_TRUCK_ACTIVATION",
	
	FG_DRAW_WIN_ANY = "FG_DRAW_WIN_ANY",
	FG_DRAW_WIN_ANY_CATCHBOOST = "FG_DRAW_WIN_ANY_CATCHBOOST", //catchboost win action | only difference it stops previous sound
	
	FG_TOTAL_WIN_COUNTER_JUMP = "FG_TOTAL_WIN_COUNTER_JUMP",
	FG_TOTAL_WIN_COUNTER_JUMP_SHORT = "FG_TOTAL_WIN_COUNTER_JUMP_SHORT",
	FG_TOTAL_WIN_COUNTER_JUMP_START_NONE = "FG_TOTAL_WIN_COUNTER_JUMP_START_NONE",
	FG_TOTAL_WIN_COUNTER_JUMP_START_1 = "FG_TOTAL_WIN_COUNTER_JUMP_START_1",
	FG_TOTAL_WIN_COUNTER_JUMP_START_2 = "FG_TOTAL_WIN_COUNTER_JUMP_START_2",
	FG_TOTAL_WIN_COUNTER_JUMP_START_3 = "FG_TOTAL_WIN_COUNTER_JUMP_START_3",
	
	FG_LUCKY_BOOT_ACTIVATE = "FG_LUCKY_BOOT_ACTIVATE", //This also restarts music
	FG_LUCKY_BOOT_START_ACTIVATE = "FG_LUCKY_BOOT_START_ACTIVATE", //before activate animation
	
	FG_FEATURE_COLLECT_WAVE_START = "FG_FEATURE_COLLECT_WAVE_START",
	
	
	FG_BONUS_REACT_WIN = "FG_BONUS_REACT_WIN",
	FG_BONUS_REACT_WIN_BASS = "FG_BONUS_REACT_WIN_BASS",
	FG_BONUS_REACT_WIN_BUCKCOLLECT = "FG_BONUS_REACT_WIN_BUCKCOLLECT",
	FG_BONUS_REACT_WIN_CATCHBOOST = "FG_BONUS_REACT_WIN_CATCHBOOST",
	FG_BONUS_REACT_WIN_DROPSHOT = "FG_BONUS_REACT_WIN_DROPSHOT",
	FG_BONUS_REACT_WIN_FULLSWEEP = "FG_BONUS_REACT_WIN_FULLSWEEP",
	//FG_BONUS_REACT_WIN_SIXPACK = "FG_BONUS_REACT_WIN_SIXPACK",
	FG_BONUS_REACT_WIN_TRUCK = "FG_BONUS_REACT_WIN_TRUCK",
	FG_BONUS_REACT_WIN_BOAT = "FG_BONUS_REACT_WIN_BOAT",
	
	
	FG_BONUS_REACT_WIN_END = "FG_BONUS_REACT_WIN_END",
	
	FG_COLLECTOR_WEED_REMOVE = "FG_COLLECTOR_WEED_REMOVE", //Weed remove event
	FG_COLLECTOR_WEEDBASS_REMOVE = "FG_COLLECTOR_WEEDBASS_REMOVE", //Weed bass remove event
	
	FG_CATCHBOOST_EFFECT_START = "FG_CATCHBOOST_EFFECT_START", //Catchboost start effect
	
	FG_CATCHBOOST_SPIN_START = "FG_CATCHBOOST_SPIN_START", //Catchboost spin start //reqwuires order param
	
	
	// BONUS SETUP INTRO AND anhlich sachen
	// BONUS SETUP INTRO AND anhlich sachen
	// BONUS SETUP INTRO AND anhlich sachen
	
	/* sound eventi na bonus setup
		-vsak icebox ki se aktivira (buck collect 1-4 iz base)
		-vsaka energija ki odleti na reele (lunker_wave_land.wav)
		-nastavitev okvirja (kot runner row expand)
		-nastavitev vsake runner ikone (bonus_plus1spin.wav)
		-collectwave (lunker_wave_bigsplash.wav)
	*/
	
	FG_BONUS_SETUP_ICEBOX_ACTIVATE_1 = "FG_BONUS_SETUP_ICEBOX_ACTIVATE_1",
	FG_BONUS_SETUP_ICEBOX_ACTIVATE_2 = "FG_BONUS_SETUP_ICEBOX_ACTIVATE_2",
	FG_BONUS_SETUP_ICEBOX_ACTIVATE_3 = "FG_BONUS_SETUP_ICEBOX_ACTIVATE_3",
	FG_BONUS_SETUP_ICEBOX_ACTIVATE_4 = "FG_BONUS_SETUP_ICEBOX_ACTIVATE_4",
	FG_BONUS_SETUP_ICEBOX_ACTIVATE_5 = "FG_BONUS_SETUP_ICEBOX_ACTIVATE_5",
	FG_BONUS_SETUP_ICEBOX_ACTIVATE_6 = "FG_BONUS_SETUP_ICEBOX_ACTIVATE_6",
	
	FG_BONUS_SETUP_ICEBOX_ROWCLEAR_1 = "FG_BONUS_SETUP_ICEBOX_ROWCLEAR_1",
	FG_BONUS_SETUP_ICEBOX_ROWCLEAR_2 = "FG_BONUS_SETUP_ICEBOX_ROWCLEAR_2",
	FG_BONUS_SETUP_ICEBOX_ROWCLEAR_3 = "FG_BONUS_SETUP_ICEBOX_ROWCLEAR_3",
	FG_BONUS_SETUP_ICEBOX_ROWCLEAR_4 = "FG_BONUS_SETUP_ICEBOX_ROWCLEAR_4",
	FG_BONUS_SETUP_ICEBOX_ROWCLEAR_5 = "FG_BONUS_SETUP_ICEBOX_ROWCLEAR_5",
	FG_BONUS_SETUP_ICEBOX_ROWCLEAR_6 = "FG_BONUS_SETUP_ICEBOX_ROWCLEAR_6",
	
	FG_BONUS_SETUP_FINAL_ROW_3 = "FG_BONUS_SETUP_FINAL_ROW_3", //Game setup done with 3 rows cleared
	FG_BONUS_SETUP_FINAL_ROW_4 = "FG_BONUS_SETUP_FINAL_ROW_4", //Game setup done with 4 rows cleared
	FG_BONUS_SETUP_FINAL_ROW_5 = "FG_BONUS_SETUP_FINAL_ROW_5", //Game setup done with 5 rows cleared
	FG_BONUS_SETUP_FINAL_ROW_6 = "FG_BONUS_SETUP_FINAL_ROW_6", //Game setup done with 6 rows cleared
	
	
	
	FG_ROW_4_BADGE_SHOW = "FG_ROW_4_BADGE_SHOW",
	FG_ROW_5_BADGE_SHOW = "FG_ROW_5_BADGE_SHOW",
	FG_ROW_6_BADGE_SHOW = "FG_ROW_6_BADGE_SHOW",
	
	FG_ROW_4_BADGE_HIDE = "FG_ROW_4_BADGE_HIDE",
	FG_ROW_5_BADGE_HIDE = "FG_ROW_5_BADGE_HIDE",
	FG_ROW_6_BADGE_HIDE = "FG_ROW_6_BADGE_HIDE",
	
	


	// ========================== LUNKER WAVE EVENTS (BOTH BONUS/BASE) ==========================
	LUNKER_WAVE_ROLLUP_FADEIN = "LUNKER_WAVE_ROLLUP_FADEIN", //Starts a fade in of any rollup
	LUNKER_WAVE_ROLLUP_WAVE_1 = "LUNKER_WAVE_ROLLUP_WAVE_1", //start rollup silently
	LUNKER_WAVE_ROLLUP_WAVE_2 = "LUNKER_WAVE_ROLLUP_WAVE_2", //start rollup silently
	LUNKER_WAVE_ROLLUP_WAVE_3 = "LUNKER_WAVE_ROLLUP_WAVE_3", //start rollup silently
	LUNKER_WAVE_ROLLUP_WAVE_1_AUDIBLE = "LUNKER_WAVE_ROLLUP_WAVE_1_AUDIBLE", //start rollup audible
	LUNKER_WAVE_ROLLUP_WAVE_2_AUDIBLE = "LUNKER_WAVE_ROLLUP_WAVE_2_AUDIBLE", //start rollup audible
	LUNKER_WAVE_ROLLUP_WAVE_3_AUDIBLE = "LUNKER_WAVE_ROLLUP_WAVE_3_AUDIBLE", //start rollup audible
	
	LUNKER_WAVE_OUTRO_START = "LUNKER_WAVE_OUTRO_START",
	
	LUNKER_WAVE_UPGRADE_EVENT = "LUNKER_WAVE_UPGRADE_EVENT",
	
	// ========================== LUNKER WAVE EVENTS (BONUS GAME) ==========================
	
	FG_LUNKER_WAVE_START = "FG_LUNKER_WAVE_START",
	FG_LUNKER_WAVE_END = "FG_LUNKER_WAVE_END",
	
	//Stages
	FG_LUNKER_WAVE_1_START = "FG_LUNKER_WAVE_1_START",
	FG_LUNKER_WAVE_1_END = "FG_LUNKER_WAVE_1_END",
	FG_LUNKER_WAVE_2_START = "FG_LUNKER_WAVE_2_START",
	FG_LUNKER_WAVE_2_END = "FG_LUNKER_WAVE_2_END",
	FG_LUNKER_WAVE_3_START = "FG_LUNKER_WAVE_3_START",
	FG_LUNKER_WAVE_3_END = "FG_LUNKER_WAVE_3_END",
	
	//Actions
	FG_LUNKER_WAVE_SYMBOL_ADD = "FG_LUNKER_WAVE_SYMBOL_ADD",
	FG_LUNKER_WAVE_SYMBOL_DEWEED = "FG_LUNKER_WAVE_SYMBOL_DEWEED",
	
	// ========================== LUNKER WAVE EVENTS (BASE GAME VERSION) ==========================
	BG_LUNKER_WAVE_START = "BG_LUNKER_WAVE_START",
	BG_LUNKER_WAVE_END = "BG_LUNKER_WAVE_END",
	
	//Stages
	BG_LUNKER_WAVE_1_START = "BG_LUNKER_WAVE_1_START",
	BG_LUNKER_WAVE_1_END = "BG_LUNKER_WAVE_1_END",
	BG_LUNKER_WAVE_2_START = "BG_LUNKER_WAVE_2_START",
	BG_LUNKER_WAVE_2_END = "BG_LUNKER_WAVE_2_END",
	BG_LUNKER_WAVE_3_START = "BG_LUNKER_WAVE_3_START",
	BG_LUNKER_WAVE_3_END = "BG_LUNKER_WAVE_3_END",
	
	//Actions
	BG_LUNKER_WAVE_SYMBOL_ADD = "BG_LUNKER_WAVE_SYMBOL_ADD",
	BG_LUNKER_WAVE_SYMBOL_DEWEED = "BG_LUNKER_WAVE_SYMBOL_DEWEED",
	
	
	
	
	// ========================== SMALL WIN SEQUENCE ==========================
	
	SMALL_WIN_START = "SMALL_WIN_START",
	SMALL_WIN_COUNTUP_END = "SMALL_WIN_COUNTUP_END",
	SMALL_WIN_END = "SMALL_WIN_END",
	
	// ========================== BIG WIN SEQUENCE ==========================
	
	BIGWINSEQ_START = "BIGWINSEQ_START", //EXTRA PARAMS NEEDED!
	BIGWINSEQ_OUTRO = "BIGWINSEQ_OUTRO", //End of stages
	BIGWINSEQ_END = "BIGWINSEQ_END",
	BIGWINSEQ_SKIP = "BIGWINSEQ_SKIP",
	
	//stages
	BIGWINSEQ_STAGE_1 = "BIGWINSEQ_STAGE_1", //emitted by BigWinSequence
	BIGWINSEQ_STAGE_2 = "BIGWINSEQ_STAGE_2", //emitted by BigWinSequence
	BIGWINSEQ_STAGE_3 = "BIGWINSEQ_STAGE_3", //emitted by BigWinSequence
	BIGWINSEQ_STAGE_4 = "BIGWINSEQ_STAGE_4", //emitted by BigWinSequence
	BIGWINSEQ_STAGE_5 = "BIGWINSEQ_STAGE_5", //emitted by BigWinSequence
	
	//End
	BIGWINSEQ_END_SCENE = "BIGWINSEQ_END_SCENE", //Start of end scene animation -> fires the BigWinSeq.ts
	BIGWINSEQ_END_SCENE_LOSE = "BIGWINSEQ_END_SCENE_LOSE",  //Bonus game is lose and this manually fires the end screen animation
	
	
	// ========================== END OF BIG WIN SEQUENCE ==========================
	
	//Various
	BONUS_INFO_START = "BONUS_INFO_START", //Start bonus info screen
	BONUS_INFO_END = "BONUS_INFO_END", //End bonus info screen
	
	BONUS_TRANSITION_TO_BASEGAME = "BONUS_TRANSITION_TO_BASEGAME", //Start bonus transition to base game
	
	//Music commands
	FG_BONUS_MUSIC_STOP = "FG_BONUS_MUSIC_STOP",
	
	
	//Happenings
	FG_SPINS_COUNTER_HIT = "FG_SPINS_COUNTER_HIT",
	FG_SPINS_COUNTER_UPGRADE = "FG_SPINS_COUNTER_UPGRADE",
	
	
	//EFFECTS
	ZOOM_STOP = "ZOOM_STOP",
	PAN_STOP = "PAN_STOP",
	SHAKE_STOP = "SHAKE_STOP",
	RUMBLE_STOP = "RUMBLE_STOP",
	
	//Spine derived
	EFF_ZOOM = "eff_zoom",
	EFF_ZOOM_FULL = "eff_zoom_full",
	EFF_ZOOM_RETURN = "eff_zoom_return",
	EFF_PAN = "eff_pan",
	EFF_PAN_RETURN = "eff_pan_return",
	
	EFF_SHAKE = "eff_shake", //left/right shake
	EFF_RUMBLE = "eff_rumble", //all directions shake (earthquake)
	
	//REELHOLDER EFF
	EFF_REELS_FADE_IN = "eff_reels_fade_in",
	EFF_REELS_FADE_OUT = "eff_reels_fade_out",
	
	EFFECT_SHOCKWAVE = "effect_shockwave", //needs params
	
	//AUDIO
	//AUDIO_VORTEX_SWOOSH = "audio_vortex_swoosh",
	
	VFX_LINES_COLL_REMOVE = "vfx_lines_coll_remove",
	
	EFF_SLOWMO_START = "eff_slowmo_start",
	EFF_SLOWMO_END = "eff_slowmo_end",
	
	EFF_LUNKER_FOCUS = "eff_lunker_focus",
	EFF_BLINK_AND_CHIME = "eff_blink_and_chime",
	
	EFF_ROW_EXPAND = "eff_row_expand",
	
	//EFF_SYMBOL_MOVE = "eff_symbol_move", //sym moving (catchboost, boat, basket?)
	EFF_TRAIL_MOVE = "eff_trail_move", //when trail moves (collector, dropshot, fullsweep, truck)
	EFF_TRAIL_HIT = "eff_trail_hit", //when trail hits (collector, dropshot, fullsweep, truck)
	EFF_SYMBOL_HIT = "eff_symbol_hit", //when trail/symbol hits (collector, dropshot, fullsweep, catchboost, truck, boat)
	
	EFF_COINS_WIN = "eff_coins_win", //Coins wins started
	EFF_COINS_START_SMALLWIN = "eff_coins_start_smallwin", //special for smallwin
	EFF_COINS_START = "eff_coins_start", //Init coins win effect for x duration
	
	THROW_BEER = "throw_beer",
	THROW_PLUSONE_SPIN = "throw_plusonespin",
	THROW_LUCKY_BOOT = "throw_luckyboot",
	THROW_BONUS_SETUP_ENERGY = "throw_bonus_setup_energy",
	
}
export enum UI_EVENT{
	SPLASH_HIDE = "splash_hide",
	SPLASH_SHOW = "splash_show",
	
	CREDIT_UPDATE = "credit_update",
	BET_UPDATE = "bet_update",
	
	VIEW_CHANGE = "view_change",
	WINDOW_RESIZE = "window_resize",
	WINDOW_ORIENT_CHANGE = "window_orientation_change",
	
	TOUCH_ANY = "touch_any", //any touch on screen/interaction
	
	MUTE = "mute",
	
	SPIN_PRESS = "spin_press",
	
	FAST_PLAY_TOGGLE = "fast_play_toggle",
	FAST_PLAY_ON = "fast_play_on",
	FAST_PLAY_OFF = "fast_play_off",
	AUTOPLAY_TOGGLE = "autoplay_toggle",
	
	GAME_START = 	"game_start",
	GAME_END = 		"game_end", //full spin end
	
	
	TAB_UNFOCUS = "TAB_BLUR",
    TAB_FOCUS = "TAB_FOCUS",
	
	
	//AUDIO
	AUDIO_MUSIC_TOGGLE = "audio_music_toggle",
}







export const events ={

//We bind events here for stuff like audio play, audio stop, etc
	bindEvents : function(){ //adding listeners to events
		
		const scene = fpglobals.FPScene;
		
		effect.BindEvents(fpglobals.SpinEE);
		
		
		
		/////////////////////////////////////////////////////////////////
		//////////////////       GENERAL      ///////////////////////////
		/////////////////////////////////////////////////////////////////
		
		fpaudio.bindEvents(fpglobals.SpinEE, true);
		fpaudio.bindEvents(fpglobals.UIEE, false);
		
		
		if(fpglobals.SpinEE.listenerCount(SPIN_EVENT.BG_CASCADE_START) === 0) {
			fp_error.onerror("No listeners for BG_CASCADE_START");
		}
		
		fpglobals.SpinEE.addListener(SPIN_EVENT.OP_GRID_UPDATE, (param)=>{
			scene.onOPGridUpdate(param);
		});	
		fpglobals.SpinEE.addListener(SPIN_EVENT.SPIN_START, (param)=>{
			//debug info
			let seed = devpanel.LAST_SEED;
			let index = devpanel.LAST_INDEX;
			fpglobals.FPScene.onDebugIndexSeedUpdate(index, seed);
			
		});
		
		
		
		
		//event listener for view change on ui event listener
		fpglobals.UIEE.addListener(UI_EVENT.VIEW_CHANGE, (view)=>{
			scene.onViewChange(view);
			screenResizeHandler.enterFullscreen();
		});
		fpglobals.UIEE.addListener(UI_EVENT.WINDOW_RESIZE, ()=>{
			scene.onWindowResize();
			//screenResizeHandler.enterFullscreen();
		});
		fpglobals.UIEE.addListener(UI_EVENT.WINDOW_ORIENT_CHANGE, ()=>{
			scene.onWindowResize();
			//screenResizeHandler.enterFullscreen();
		});
		
		fpglobals.UIEE.addListener(UI_EVENT.SPLASH_HIDE, ()=>{ 
			screenResizeHandler.enterFullscreen();
			enableScreenWakeLock();
		});
		
		fpglobals.UIEE.addListener(UI_EVENT.TOUCH_ANY, ()=>{
			screenResizeHandler.enterFullscreen();
			enableScreenWakeLock();
		});

		// Wake lock is dropped when the tab hides — re-request on focus
		fpglobals.UIEE.addListener(UI_EVENT.TAB_FOCUS, ()=>{
			void requestScreenWakeLock();
		});
		
		
		fpglobals.UIEE.addListener(UI_EVENT.CREDIT_UPDATE, (credits)=>{
			UIHandler.updateCredits(credits);
		});
		
		fpglobals.UIEE.addListener(UI_EVENT.FAST_PLAY_TOGGLE, ()=>{
			fpglobals.FastPlayToggle();
			if(UIHandler.FASTPLAY){
				fpglobals.UIEE.emit(UI_EVENT.FAST_PLAY_ON);
			}else{
				fpglobals.UIEE.emit(UI_EVENT.FAST_PLAY_OFF);
			}
		});
		
		fpglobals.UIEE.addListener(UI_EVENT.GAME_START, ()=>{
			UIHandler.setGameStart();
		});
		fpglobals.UIEE.addListener(UI_EVENT.GAME_END, ()=>{
			UIHandler.setGameEnd();
		});
		
		
		
		
		
		
		
		
		
		
		
		
		/////////////////////////////////////////////////////////////////
		//////////////////      BASE GAME     ///////////////////////////
		/////////////////////////////////////////////////////////////////
		
		
		
		fpglobals.SpinEE.addListener(SPIN_EVENT.BONUS_INFO_START, (param)=>{
//			UIHandler.setUIHide(false, 250);
		});
		//fpglobals.SpinEE.addListener(SPIN_EVENT.SPIN_FEATURE_WAIT, (param)=>{
		//	UIHandler.setUIHide(true);
		//});
		fpglobals.SpinEE.addListener(SPIN_EVENT.FG_EXIT, ()=>{
			UIHandler.setUIShow(true);
		});
		fpglobals.SpinEE.addListener(SPIN_EVENT.BG_MID_FG_WON, ()=>{
			spin.getSpinInstance().isFreeGamesWonThisSpin = true;
		});
		fpglobals.SpinEE.addListener(SPIN_EVENT.FG_ENTER, (param)=>{
			spin.getSpinInstance().isFreeGamesWonThisSpin = false; //reset
//			UIHandler.setUIShow(false, 250);
		});
		fpglobals.UIEE.addListener(UI_EVENT.FAST_PLAY_OFF, ()=>{
			timing.setTimesFastPlayOff();
		});
		fpglobals.UIEE.addListener(UI_EVENT.FAST_PLAY_ON, ()=>{
			timing.setTimesFastPlayOn();
		});
		
		
		
		/////////////////////////////////////////////////////////////////
		//////////////////      FREE GAMES    ///////////////////////////
		/////////////////////////////////////////////////////////////////
		
	//	fpglobals.SpinEE.addListener(SPIN_EVENT.FG_SPINS_COUNTER_UPDATE, (param)=>{
	//		scene.onFGSpinsCounterUpdate(param);
	//	});
	//	fpglobals.SpinEE.addListener(SPIN_EVENT.FG_MP_COUNTER_UPDATE, (param)=>{
	//		let toUpdate = 0;
	//		let type : "add" | "set" | "get";
	//		//add we add to current number (eg on win)
	//		//set we set to supplied number 
	//		//get we get current number from spin dataset (eg force stop) 
	//		if(param == null){ type = "get"; }
	//		else{ type = param.type; }
	//		if(type == "get"){
	//			let crr_step = spin.spin_staticInstance.current_spin_dataset.getCurrentStep();
	//			toUpdate = SpinDataset.getFeatureRunningTotalWin(crr_step);
	//			toUpdate = accounting.getWinAsMultiplier(toUpdate);
	//		}
	//		else if(type == "set"){
	//			toUpdate = param.value; //TODO format?
	//		}
	//		else if(type == "add"){
	//			toUpdate = scene.FG_MPCounter_value + accounting.getWinAsMultiplier(param.value);
	//		}
	//		scene.onFGMPCounterUpdate(toUpdate);
	//	});
		
		
		fpglobals.SpinEE.addListener(SPIN_EVENT.FG_SETUP_START, ()=>{
			scene.onFGEnter();
		});
		fpglobals.SpinEE.addListener(SPIN_EVENT.FG_BONUS_INTRO_WAIT, ()=>{
			scene.onFGBonusIntroWait();
			scene.particle_holder.visible = false;
		});
		
		fpglobals.SpinEE.addListener(SPIN_EVENT.FG_EXIT, ()=>{
			scene.onFGExit();
			scene.particle_holder.visible = true;
		});
		
		
		
		
		
		
		// Add tab visibility listeners
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				// Tab lost focus
				fpglobals.UIEE.emit(UI_EVENT.TAB_UNFOCUS);
			} else {
				// Tab gained focus
				fpglobals.UIEE.emit(UI_EVENT.TAB_FOCUS);
			}
		});

		// Alternative focus/blur events for older browsers
	//	window.addEventListener('blur', () => {
	//		fpglobals.SpinEE.emit(SPIN_EVENT.TAB_BLUR);
	//		SpineController.PAUSE_SPINE_PLAYERS(INTERRUPT_TYPE.TAB_BLUR);
	//		fpaudio.PAUSE_ALL(INTERRUPT_TYPE.TAB_BLUR);
	//	});
//
	//	window.addEventListener('focus', () => {
	//		fpglobals.SpinEE.emit(SPIN_EVENT.TAB_FOCUS);
	//		SpineController.RESUME_SPINE_PLAYERS();
	//		fpaudio.RESUME_ALL();
	//	});
		
	}
	
	
}


