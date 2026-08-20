import { fpglobals } from "../fpglobals";



export class log{

	
		
	//LOGS//////////////////////////////////////////////////////////////////////////////
		
	private static VERBOSE_LOGS_ONLY = false;
	private static PERFORMANCE_LOGS = false;
	public static SPIN_TIMING_LOGS = false;
	public static ACCOUNTING_LOGS = true;
	public static SPINE_LOGS = true;
	public static SOUND_LOGS = false;
	
	
	private static allLogsCss : string = 
		"border-radius: 3px; font-size: 15px;"
	
//	private static ALL_LOGS : string[] = [];

	static type = {
		//general
		INFO : "" + log.allLogsCss, //leave blank
		WARNING :  log.allLogsCss + "background: yellow; color : black;",
		VERBOSE :  log.allLogsCss + "background: blue; color : white;",
		IMPORTANT :  log.allLogsCss + "background: red; color : white;",
		
		BIGWIN_VERBOSE :  log.allLogsCss + "background: red; color : white;font-size: 16px;border-radius: 10px;",
		
		//game related
		SPIN :  log.allLogsCss + "background: blue; color : white;",
		
		//loading related
		LOADING :  log.allLogsCss + "background: green; color : white;",
		SPINE_POOL :  log.allLogsCss + "background: green; color : white;",
		SPINE_ANIMATIONS :  log.allLogsCss + "background: green; color : white; underline: 1px solid white;",
		PERFORMANCE :  log.allLogsCss + "background: green; color : white;",
		
		SLOW_MOTION :  log.allLogsCss + "background: violet; color : white;",
		SLOW_MOTION_VERBOSE :  log.allLogsCss + "background: darkviolet; color : white;",
		
		BONUS_GAME_VERBOSE :  log.allLogsCss + "background: darkblue; color : white;",
		
		//zoom shift related
		ZOOM_SHIFT :  log.allLogsCss + "background: orange; color : black;",
		ZOOM_SHIFT_VERBOSE :  log.allLogsCss + "background: darkorange; color : white;",
		
		//Sounds
		SOUND_PLAYING :  log.allLogsCss + "background: green; color : white; font-size: 16px;   border-radius: 10px;",
		SOUND_STOPPED :  log.allLogsCss + "background: lightred; color : white; font-size: 5px; border-radius: 10px;",
		SOUND_REMOVE :   log.allLogsCss + "background: lightred; color : white; font-size: 5px; border-radius: 10px;",
		
		BONUS_MUSIC_LOG :  log.allLogsCss + "background: olive; color : white;",
		
		//spin timing
		SPIN_TIMING :  log.allLogsCss + "background: #1a1a2e; color: #e94560; font-size: 13px;",
		SPIN_TIMING_DETAIL :  log.allLogsCss + "background: #16213e; color: #0f3460; font-size: 12px;",
		
		//fatals
		ERROR :  log.allLogsCss + "background: red; color : white;",
		//TODO exception shouldnt be fatal
		EXCEPTION :  log.allLogsCss + "background: red; color : yellow;",
		
		ACCOUNTING :  log.allLogsCss + "background: green; color : white; font-size: 13px;",
		
	}
	public static last_log_time = 0;
	public static last_warn_time = 0;
	public static last_error_time = 0;
	
	public 	static log(msg : any, verbosity  = log.type.INFO){ //global log
		if(!log.PERFORMANCE_LOGS){
			if(verbosity == log.type.PERFORMANCE){return;}
		}
		if(!log.SPIN_TIMING_LOGS){
			if(verbosity == log.type.SPIN_TIMING || verbosity == log.type.SPIN_TIMING_DETAIL){return;}
		}
		if(!log.ACCOUNTING_LOGS){
			if(verbosity == log.type.ACCOUNTING){return;}
		}
		if(!log.SPINE_LOGS){
			if(verbosity == log.type.SPINE_POOL){return;}
			if(verbosity == log.type.SPINE_ANIMATIONS){return;}
		}
		if(!log.SOUND_LOGS){
			if(verbosity == log.type.SOUND_PLAYING){return;}
			if(verbosity == log.type.SOUND_STOPPED){return;}
			if(verbosity == log.type.SOUND_REMOVE){return;}
			if(verbosity == log.type.BONUS_MUSIC_LOG){return;}
		}
		if(!log.SOUND_LOGS){
			if(verbosity == log.type.SOUND_PLAYING || verbosity == log.type.SOUND_STOPPED || verbosity == log.type.SOUND_REMOVE){return;}
		}
		let time = new Date().getTime();
		if(log.VERBOSE_LOGS_ONLY){
			if(verbosity == log.type.INFO || verbosity == log.type.SPIN){return;}
		}
		
		if(verbosity ==  log.type.VERBOSE || 
			verbosity == log.type.IMPORTANT ||
			verbosity == log.type.WARNING){
			
			console.warn("%c"+msg + " @"+time + " ("+(time-log.last_warn_time)+"ms)", verbosity);
			log.last_warn_time = time;
		}
		else if(verbosity == log.type.ERROR ||
				verbosity == log.type.EXCEPTION){
			console.error("%c"+msg + " @"+time + " ("+(time-log.last_error_time)+"ms)", verbosity);
			log.last_error_time = time;
		}
		else{
			console.log("%c"+msg + " @"+time + " ("+(time-log.last_log_time)+"ms)", verbosity);
			log.last_log_time = time;
		}
//		this.ALL_LOGS.push(msg);
	}
}