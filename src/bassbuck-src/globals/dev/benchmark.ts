
import { Sprite, Container, Point } from "pixi.js";
import { Scene } from "../../scenes/Scene";
import { fpglobals } from "../fpglobals";
import { SymbolFactory } from "../../reelspin/Symbol/Core/SymbolFactory";
import { gfxsym } from "../../reelspin/Symbol/Core/GraphicSymbol";
import { log } from "../dev/log";
import { spine_player } from "../../spine/spine_player";
import { Macro } from "../Macro";

export class benchmark{
	
	public static BENCHMARK_MODE : boolean = false;
	public static benchmark_parent : Container;
	
	private static benchmark_container : Container;
	
	public static spines : Array<spine_player>;
	
	public static toggleBenchmarkMode(){
		if(this.BENCHMARK_MODE){this.stopBenchmark();}
			else{this.runBenchmark();}
		
	}
	
	public static runBenchmark(){
		this.BENCHMARK_MODE = true;
		if(this.benchmark_parent == null){
			this.benchmark_parent = fpglobals.FPScene.above_reels;
		}
		let prnt = this.benchmark_parent.addChild(new Container());
		this.benchmark_container = prnt;
		
		let res = Macro.getResourceByName("benchmark");
		if(res == null){
			fpglobals.GLog("benchmark resource not found", log.type.EXCEPTION);
			return;
		}
		
		//add symbols
		this.spines = new Array<spine_player>();
		for(let x = 0; x < fpglobals.grid_x; x++){
			for(let y = 0; y < fpglobals.grid_y; y++){
				let loc =  new Point(x,y);
				let spine = new spine_player(res.spineData!, "F", null)
				this.spines.push(spine);
				prnt.addChild(spine);
				spine.position.set(loc.x * fpglobals.sym_x, loc.y * fpglobals.sym_y);
			}
		}
	}
	
	/*
	
	public init_benchmark(){
		let spine_player = SpineController.getSpinePlayerBySym("benchmark");
		//this.setupSpine(spine_player, "animation", null, true);
		//this.setAnimationPlay("animation", true);
		this.setGetSpine();
		this._main_spine!.state.timeScale = 1.0;
		this._main_spine!.visible = true;
		this._main_spine!.state.setAnimation(0, "animation", true);
	}public remove_benchmark(){
		this.setRemoveSpinePlayer();
	}
	
	*/
	
	
	public static stopBenchmark(){
		this.BENCHMARK_MODE = false;
		this.spines.forEach(element => {
			//element.remove_benchmark();
			element.destroy();
		});
		this.benchmark_container.parent.removeChild(this.benchmark_container);
		
	}
	
	
}