import * as PIXI from "pixi.js";
import { fpglobals } from "../fpglobals";
import { log } from "../dev/log"
import { symbol_effect } from "../../effects/symbol_effect";


export class watcher {
    private static instance: watcher;
    private constructor() {
    }
    public static getInstance(): watcher {
        if (!watcher.instance) {
            watcher.instance = new watcher();
        }
        return watcher.instance;
    }
	//not using instance for now
	
	
	
	public static _overlay_layer : PIXI.Container;
	public static _overlay_timer : number = 0;
	public static _overlay_timer_max : number = 100;
	
	
	public static onEachFrame(){
		
		
		if(fpglobals.log_overlay_animation_logging){
			if(watcher._overlay_layer){
				watcher._overlay_timer++;
				if(watcher._overlay_timer >= watcher._overlay_timer_max){
					
					let all_children = watcher._overlay_layer!.children;
					for(let i = 0; i < all_children.length; i++){
						let child = all_children[i];
						if(child instanceof symbol_effect){
							let symbol_effect = child as symbol_effect;
							let symbol_effect_name = symbol_effect.name;
							
							let spine = (symbol_effect as any).spine;
							if(spine){
								let toLog = "[" + spine.libsym + "] \n "; 
								let spine_name = spine.name;
								let tracks = spine.state.tracks;
								for(let j = 0; j < tracks.length; j++){
									let track = tracks[j];
									if(track != undefined && track != null){
										let track_name = track.animation.name;
										toLog += "[track " + j.toString() + "] " + track_name + " \n ";
										
										
										
										
									}
								}
								
								
								log.log(toLog, log.type.INFO);
							}
							
							
						}
					}
					
					
					
					
					
					watcher._overlay_timer = 0;
				}
			}
		}
		
		
		
		
		
	}
}