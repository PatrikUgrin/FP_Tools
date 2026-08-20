import * as PIXI from "pixi.js";

//import { Spine, AttachmentType, Vector2 } from "pixi-spine";
import { Tween, Easing, Group } from "@tweenjs/tween.js";
import { Graphics, Point, Sprite } from "pixi.js";


import { FG_SPIN_TYPE, fpglobals } from "../../../globals/fpglobals";
import {truck_symbol, basket_symbol, blank_symbol, debug_colours,
	 fish_symbol, weedfish_symbol, weed_symbol,
	  smallwild_symbol, largewild_symbol, collector_symbol, sixpack_symbol,
	  boat_symbol,
	  catchboost_symbol,
	  fullsweep_symbol,
	  dropshot_symbol,
	  getLibSymPerMissEvent,
	  getLibSymPerWinEvent,
	  luckyboot_symbol
	  } from "../../SpinDataset";
	  
	  
//import { spin } from "../BaseGame/spin";


import { sym_res, getFeatureSpriteName } from "../../../globals/assets";
//import { Macro } from "../../globals/Macro";

import { fp_error } from "../../../globals/fp_error";

import { SpineController } from "../../../spine/SpineController";
import { spine_player } from "../../../spine/spine_player";
//import { ReelSymbol } from "../ReelSymbol";
//import { FPMask } from "../../effects/Masks";


//import { timing } from "../timing";
import * as timingConst from "../../timing/timingConst";

import { AnimNumber } from "../../WinElements/AnimNumber";


import { SymbolProperty } from "./SymbolProperty";

import { log } from "../../../globals/dev/log";
import { getTextureFromDisplayObject, Macro } from "../../../globals/Macro";
import { CollSYM } from "../../BaseGame/BGWin";
import { ggTween } from "../../../globals/time/ggTween";
import { SpineCounter } from "../../WinElements/SpineCounter";
import { SPIN_EVENT } from "../../../globals/events";
import { feature_symbol_spin_event } from "../../bonus_step";
import { timing } from "../../timing/timing";
import { additionalTimeMpForBottominit } from "../../timing/timingConst";
import { symbol_effect } from "../../../effects/symbol_effect";
import { container } from "webpack";

export enum SYMBOL_STATE { //Deprecated, only used in base game and legacy BGWin code
	REMOVE_DELAY 				= -2,
	REMOVE 						= -1,
	STATIC						= 0,
	REMOVED						= 1,
	SPIN_DELAY 					= 100,
	SPIN 						= 101,
	WIN_INIT 					= 150, //loop wait
	WIN_INIT_REMOVE				= 155, //loop end
	WIN_MARKING_DELAY 			= 200,
	WIN_MARKING 				= 201,
	WIN_MARKING_END 			= 202,
	WIN_CASCADE_DELAY 			= 300,
	WIN_CASCADE 				= 301,
	WIN_CASCADE_END 			= 302,
	WIN_MARKING_INSERT_DELAY	= 350,
	WIN_MARKING_INSERT 			= 351,
	WIN_MARKING_INSERT_END		= 352, //end delay
	
	WIN_MARKING_INSERTPATH_DELAY= 360,
	WIN_MARKING_INSERTPATH		= 361,
	WIN_MARKING_INSERT_PATH_END	= 362, //end
	
	WIN_HIDE					= 400, //new Hide for specific time
	CALLBACK					= 401, //new Hide for specific time
	
	
	//feature
	
	FEATURE_SPIN 				= 500,
	
}
export namespace SYMBOL_STATE {
	export function after(value: SYMBOL_STATE): SYMBOL_STATE {
		return value + 1;
	}
}



export class gfxsym extends PIXI.Container{
	
	//a graphical repsresentation of a symbol on screen/reel
	
	static readonly ANIM_APPEAR : string = "appear";
	static readonly ANIM_APPEAR_LOOP : string = "appear_loop";
	static readonly ANIM_APPEAR_LOOP_BASE : string = "appear_loop_base";
	static readonly ANIM_APPEAR_LOOP_GREEN_BASE : string = "appear_loop_green_base";
	static readonly ANIM_OVERLAY_APPEAR : string = "overlay_appear";
	static readonly ANIM_OVERLAY_GREEN_LOOP : string = "overlay_green_loop";
	static readonly ANIM_OVERLAY_APPEAR_GREEN : string = "overlay_appear_green";
	
	protected static WEED_ANIM_INDEX_ITER = 0;
	protected getWeedAnimationIndex() : string{
		//(Math.floor(Math.random() * 4) + 1
		const max = 4;
		gfxsym.WEED_ANIM_INDEX_ITER++;
		if(gfxsym.WEED_ANIM_INDEX_ITER > max){
			gfxsym.WEED_ANIM_INDEX_ITER = 1;
		}
		if(gfxsym.WEED_ANIM_INDEX_ITER > 9)
			return ""+gfxsym.WEED_ANIM_INDEX_ITER;
		return "0"+gfxsym.WEED_ANIM_INDEX_ITER;
	}
	
	public LibSym : string = "BL";
	public pos = new PIXI.Point(0,0); // pos in coordinates not pixels
	public cashvalue : number = 0;
	public isInsidePlayfield = true;
	
	public isDummy = false;
	public dummy_removeAfterAnimate = false;
	
	public isBuckSymbol = false;

	protected _zIndexWinsOffset : number = 1500;
	
	public SymState : SYMBOL_STATE = SYMBOL_STATE.STATIC;
	protected _twin : any; //main Tween object
	
	//twwens for dummies
	protected _ex_tweens : Array<any> = new Array<any>(); //all expendable animation tweens
	protected _ex_tweens_showhide : Array<any> = new Array<any>(); //all expendable animation tweens
	public _ex_animationDelays : Array<any> = new Array<any>(); //all expendable animation times
	public _ex_cashValue_increments : Array<number> = new Array<number>(); //all expendable cash value increments
	
	//TODO ex tweens should probably have some force stop function?
	
	private _zindex_win_tween : ggTween | null = null;
	
	protected destroy_on_remove : boolean = false;
	/** Set when Destroy() runs — guards delayed callbackAfter / setAnimationPlay from re-acquiring spines on zombies */
	protected _symbolDestroyed : boolean = false;
	public useTweenWinMarkingTiming = false;
	public CascadeRemove : boolean = false; //TODO refactor
	
	public _texture_name_spin : string = "";
	
	//Speical requirements for symbol
	protected isFish = false;
	protected isSmallWild = false;
	protected isLargeWild = false;
	protected isWeedFish = false;
	protected isWeed = false;
	protected isBasket = false;		//holds cashvalue
	protected isCollector = false;	//holds cashvalue
	protected isTruck = false;		//holds cashvalue
	protected isBoat = false;			//holds cashvalue
	protected isSixPack = false;		//holds charges as cashvalue
	protected isCatchboost = false;
	protected isFullsweep = false;
	protected isDropshot = false;
	protected isBlank = false;
	protected isLuckyBoot = false;
	public isPersistent = false;
	
	public isOversized = false; ///Different Wins Parent
	
	
	public WEED_ANIM_INDEX = "NaN"; //14.11.24 no longer index but animation name
	
	//Reformating -> Symbol property carries visual effects
	//public SymProperty.ScatterProperty : any = null; //Array<number> cash values
	public SymProperty : SymbolProperty;
	public scatter_isLoppingFGWon = false; //a lazy implementation to see if scatter animation loop is playing after free games won
	public scatter_shouldStartLoopingFGWon = false; //if true, will start looping after free games won on spin animator end
	
	protected overlay_symbol_effect : symbol_effect | undefined;
	
	//animation parameters
	param_dest = new PIXI.Point(0,0);
	param_spine_animation_mixin_after = "";
	param_spine_animation_mixin_duration = 0.00;
	starting_spine_animation = "";
	//param_overlay_set_above = false; //param to set overlay symbol effect above lunkerwave -> in 16.6.2026 we use anim number holder
	
	param_moving_cascade_places = 0;
	
	protected param_spin_cascade = false;
	
	param_num_from = 0;
	param_num_to = 0;
	param_anim_property : any = null;
	
	param_spine_animation_track_time = 0;
	
	//debug properties
	debug_txt : PIXI.Text;
	
	//For events timing
	_end_pos_time = 0;
	_start_pos_time = 0;
	_start_pos : PIXI.Point;
	_end_pos : PIXI.Point;
	
	
	//Sprite&Spine
	protected _main_spine : spine_player | undefined;
	protected main_sprite : any;
	//protected main_bg : any;
	protected main_txt : any;
	
	protected feature_spin_container : any;
	protected feature_spin_gradient : Sprite | null = null;
	
	protected txt_y_offset = 15;
	
	//tween for hiding/showing main_sprite
	protected main_sprite_tween : any;
	
	protected win_animators : Array<Tween<any>> = new Array<Tween<any>>();
	
	
	protected text_node : any;
	protected text_prop_node : any; //six pack charge or multiplier
	protected text_basket_number : AnimNumber | null = null;
	protected text_property_number : AnimNumber | null = null;
	protected _img_format = ".png";
	
	public _spine_WinAnimName : string 							= "collected";
	public _spine_WinBonusInitAnimName : string					= "bonus_award";
	public _spine_WinGenAnimName : string 						= "action_wild_create";
	public _spine_WinGenAnimNameLunkerWave : string				= "wf_remove_lunkerwave";
	public _spine_deweed_outsideplayfield_animation_name : string = "wf_remove_green";
	public _spine_WinEndEventAnimName : string 					= "appear";
	public _spine_ClearWeedEndAnimName : string 				= "deactivate";
	public _spine_ActivateStartnimName : string 				= "activate";
	public _spine_WinCollectorAnimName : string 				= "collected";
	public _spine_WinCollectedAnimName : string 				= "collected";
	public _spine_WinCollectedAnimName_activated : string 		= "collected_active";
	public _spine_WinCollectorAnimName_static : string 			= "collected";
	public _spine_WinCollectorAnimName_remove : string 			= "remove";//"remove_collector";
	public _spine_buck_clear_AnimName : string 					= "buck_clear";
	public _spine_WinCollectorAnimName_remove_noweed : string 	= "remove";
	public _spine_ConvertToBlankAnimName : string 				= "convert_to_blank";
	//protected _spine_WinUpgradeAnimName : string = "upgrade";
	protected _text_cashvalue : PIXI.Text;

	public _spine_appear_animation_name : string = "appear";
	public _spine_appear_loop_animation_name : string = "appear_loop";
	
	public _spine_WinInitAnimName : string = "loop";
	public _spine_WinMarkingInsertPath : string = "move";
	
	public _feature_spin_container_name : string = "feature_spin";
	public _feature_spin_sprite_parent_name : string = "feature_spin_parent";
	
	//TODO rename bait to new animations name when they come
	public _feature_bait_spine_animation_loop : string 		= "loop";
	public _feature_bait_spine_animation_end : string 		= "win";
	public _feature_bait_spine_animation_off : string 		= "off";
	
	public _spine_static_spin = "static_appear";
	
	// FEATURE SPIN
	protected isFeature = false; //if symbol is spawned in feature spin
	
	protected fs_parent : PIXI.Container;
	protected fs_sprite_pair : Array<PIXI.Sprite>;
	protected fs_tween : any;
	
	protected fs_reelstrip : Array<string>;
	protected fs_reelstrip_index : number = 0;
	
	protected fs_infinite_spin = false; //TODO
	
	protected fs_spin_time_single = 16.667*4.0;
	protected fs_intertia_overshoot_px = 50.0;
	protected fs_intertia_overshoot_time = 100.0;
	
	protected fs_spin_time_end = 0; //does not reset
	
	public _feature_event : feature_symbol_spin_event | null = null;
	
	public _lambda_func_fire_on_bg_appear : (() => void) | null = null;
	
	// Feature Spin END
	
	protected static getDoesResourceExistTEX(resname : string, res : string){
		let _res = PIXI.Loader.shared.resources[resname] as any;
		return _res.data.frames[res] != undefined;
	}
	protected static getDoesResourceExist(resname : string){
		let _res = PIXI.Loader.shared.resources[resname] as any;
		if(_res == undefined){return false;}
		return _res.data != undefined;
	}
	protected static getDoesResourceSpineExist(resname : string){
		let _res = PIXI.Loader.shared.resources[resname] as any;
		if(_res == undefined){return false;}
		return _res.spineData != undefined;
	}
	
	
	//cashValue -1 = Symbol is not a cash symbol, 0 = symbol is a cash symbol but has no value
	constructor(_LibSym : string, _pos : PIXI.Point, cashValue : number = 0, isFeature : boolean, dummy = false,
		 SymProp : SymbolProperty | null = null){
		super(); //init inheritance
		
		this.pos = _pos;
		this.LibSym = _LibSym;
		this.cashvalue = cashValue;
		this.isDummy = dummy;
		this.isFeature = isFeature;
		//this.parent = _parent;
		//additional params that are gfx can be set in other constructor
		
		this._texture_name_spin = _LibSym.toLocaleLowerCase() + "_appear";
		
		//if cashvalue is not number type convert to number
		if(typeof this.cashvalue != "number"){
			this.cashvalue = Number(cashValue);
		}
		
		this.setSymbolType(_LibSym);
		
		if(this.isCollector){
			this._spine_WinCollectorAnimName = this._spine_WinAnimName; //TODO remove
		}
		
		if(this.isFeature == false){
			this._spine_WinCollectorAnimName = "collected";
		}
		
		if(SymProp == null){
			this.SymProperty = new Object() as SymbolProperty;
			this.SymProperty.Used = false;
		}else{
			this.SymProperty = SymProp as SymbolProperty; 
		}
		
		this.setZIndex(null);
		this.setSymbolSprite();
		
		this.y = fpglobals.sym_y * -1; //- size in px
		this.x = this.getPosInPixels().x;
		
		this.setNodeName(); //for debugging
		
		if(this.isDummy){
			this.setDummyProperties();
		}
	}
	public getIsFeature(){
		return this.isFeature;
	}
	
	public setSymbolProperty<K extends keyof SymbolProperty>(key: K, value: SymbolProperty[K], update = true): void {
        this.SymProperty = {
            ...this.SymProperty,
            [key]: value
        };
		if(update){
			if(key == "NumProp" ){ //update text
				this.setUpPropTextNode(this.text_prop_node, value);
			}
			else{
				this.setRemoveSpinePlayer();
				this.setSymbolSprite(); //update sprite
			}
		}
    }
	
	
	public setZIndex(z : number | null = null){
		if(z == null){ //init
			this.zIndex = 
			(((this.pos.y - fpglobals.grid_y)+50)*10)
			 	+ this.pos.x + this.getZIndexOffset();
		}else{
			this.zIndex = z;
		}
	}
	
	public setZIndexWins(active : boolean, offset : number = 0){
		if(active){
			if(this.zIndex < 1500){
				this.zIndex += 1500 + offset;
			}
		}else{
			if(this.zIndex > 1500){ //only over 1000 is wins
				this.zIndex -= 1500 + offset;
			}
		}
	}
	public setZIndexDummyWins(active : boolean, offset : number = 0){
		if(active){
			this.zIndex += 100 + offset;
		}else{
			this.zIndex -= 100 + offset;
		}
	}
	
	///set active for period of time then disable
	public setZIndexWinFor(time : number, delay : number = 0){ //theoretically this should work for any symbol and should be unstoppable
		if(this._zindex_win_tween != null){
			this._zindex_win_tween.stop();
			if(this.zIndex > this._zIndexWinsOffset){
				this.zIndex -= this._zIndexWinsOffset;
			}
		}
		let timer = {time : 0};
		let twe = new ggTween(timer, fpglobals._GROUP);
		if(delay!= 0){
			twe.delay(delay);
		}else{
			this.setZIndexWins(true);
		}
		twe.onStart(()=>{
			this.setZIndexWins(true);
		});
		twe.to({time : 1},time);
		twe.onComplete(()=>{
			this.setZIndexWins(false);
		});
		this._zindex_win_tween = twe;
		twe.start(fpglobals.masterTicker.last_scaled_time);
		return time + delay;
	}
	public setZIndexWinsAfter(time : number){
		if(this._zindex_win_tween != null){
			this._zindex_win_tween.stop();
			if(this.zIndex > this._zIndexWinsOffset){
				this.zIndex -= this._zIndexWinsOffset;
			}
		}
		let timer = {time : 0};
		let twe = new ggTween(timer, fpglobals._GROUP);
		if(time== 0){
			this.setZIndexWins(true);
			return 0;
		}
		twe.to({time : 1},time);
		twe.onComplete(()=>{
			this.setZIndexWins(true);
		});
		this._zindex_win_tween = twe;
		twe.start(fpglobals.masterTicker.last_scaled_time);
		return time;
	}
	
	public getTxtYOffset(){
		return this.txt_y_offset;
	}
	
	public getMainSpine() : spine_player | undefined{
		return this._main_spine;
	}
	
	protected setSymbolType(_LibSym : string){
		if(_LibSym == fish_symbol){
			this.isFish = true;
		}else if(_LibSym == basket_symbol){
			this.isBasket = true; //TODO change
		}else if(_LibSym == weedfish_symbol){
			this.isWeedFish = true;
		}else if(_LibSym == blank_symbol){
			this.isBlank = true;
		}else if(_LibSym == weed_symbol){
			this.isWeed = true;
		}else if(_LibSym == smallwild_symbol){
			this.isSmallWild = true;
		}else if(_LibSym == largewild_symbol){
			this.isLargeWild = true;
		}else if(_LibSym == collector_symbol){
			this.isCollector = true;
			this.isBuckSymbol = true;
		}else if(_LibSym == truck_symbol){
			this.isTruck = true;
		}else if(_LibSym == catchboost_symbol){
			this.isCatchboost = true;
			this.isBuckSymbol = true;
		}else if(_LibSym == fullsweep_symbol){
			this.isFullsweep = true;
			this.isBuckSymbol = true;
		}else if(_LibSym == dropshot_symbol){
			this.isDropshot = true;
			this.isBuckSymbol = true;
		}else if(_LibSym == boat_symbol){
			this.isBoat = true;
		}else if(_LibSym == sixpack_symbol){
			this.isSixPack = true;
		}else if(_LibSym == luckyboot_symbol){
			this.isLuckyBoot = true;
		}
	}
	
	protected setDummyProperties() {
		return;
	}
	
	//zIndex (higher = on top)
	//these are addedOffsets
	protected getZIndexOffset() : number{
		if(this.isFish){
			return 100;
		}else if (this.isBasket){
			return 180;
		}else if (this.isWeedFish){
			return 110;
		}else if (this.isWeed){
			return 105;
		}else if (this.isSmallWild){
			return 120;
		}else if (this.isLargeWild){
			return 160;
		}else if (this.isBuckSymbol){
			return 210;
		}else if(this.isBoat){
			return 120;
		}else if(this.isSixPack){
			return 180;
		} else if(this.isTruck){
			return 110;
		}
		
		if(this.isBlank){
			return -500;
		}
		return 50;
	}
	
	protected setNodeName(){
		let name = this.LibSym;
		if(this.isDummy){
			name += "_dummy";
		}
		if(this.cashvalue > 0){
			name += "_cval["+this.cashvalue+"]";
		}
		//add position to name for devtools
		name += "_pos["+this.pos.x+","+this.pos.y+"]";
		
		this.name = name;
	}
	
	public getLogSymStr(): string {
		if(this.cashvalue > 0){
			return this.LibSym + "_" + this.cashvalue;
		}
		return this.LibSym;
	}
	
	protected logSpineAnimationScheduled(methodName: string, animName: string, delay: number, extra: string = ""): void {
		if(!fpglobals.log_spine_animations || delay <= 0){return;}
		fpglobals.GLog("["+this.getLogSymStr()+"]"+ "["+this.pos.x+","+this.pos.y+"]" + " " + methodName + " scheduled: " + animName + extra + " delay: " + delay, log.type.SPINE_ANIMATIONS);
	}
	
	protected getSpriteName() {
		return (this.LibSym + this._img_format).toLowerCase();
	}
	protected getSpriteNameBG() {
		return this.LibSym.toLocaleLowerCase() +"_bg"+ this._img_format;
	}
	
	public getIsBGSmallWild(){
		return this.isSmallWild;
	}
	public getIsBGWild(){
		return this.isSmallWild || this.isLargeWild;
	}
	public getIsBasket(){
		return this.isBasket;
	}
	public getIsWeedFish(){
		return this.isWeedFish;
	}
	public getIsWeed(){
		return this.isWeed;
	}
	public getIsTruck(){
		return this.isTruck;
	}
	public getIsLunker(){
		return false;
	}
	public getIsBass(){
		return this.isFish;
	}
	public getIsLuckyBoot(){
		return this.isLuckyBoot;
	}
	public getIsBoat(){
		return this.isBoat;
	}
	public setCashValueText(str = this.cashvalue.toString()){
		if(this._text_cashvalue == null){return;} //TODO for special syms
		if(str == "0" || str == "-1"){str = " ";}
		this._text_cashvalue.text = str;
		this.alignCashValueText();
	}
	protected alignCashValueText(){
		//this._text_cashvalue.x = (fpglobals.sym_x/2) - (this._text_cashvalue.width/2);
		this._text_cashvalue.x = (0) - (this._text_cashvalue.width/2);
		this._text_cashvalue.y = (0) - (this._text_cashvalue.height /2);
	}
	public hideCashValueText(){
		if(this.text_node == null){return;}
		this.text_node.visible = false;
	}
	public showCashValueText(){
		if(this.text_node == null){return;}
		this.text_node.visible = true;
	}
	
	//separate func for creation of this just for centering
	protected getCreateTextCenterNode(){
		let exist = this.getChildByName("textcenter");
		if(exist != null){return exist;}
		
		let txtcenter = new PIXI.Container();
		txtcenter.name = "textcenter";
		txtcenter.x = 0;
		txtcenter.y = this.getTxtYOffset();
		this.addChild(txtcenter);
		return txtcenter;
	}
	protected getCreateTextPropNode(){
		let exist = this.getChildByName("textprop");
		if(exist != null){return exist;}
		
		let txtcenter = new PIXI.Container();
		txtcenter.name = "textprop";
		txtcenter.x = (127-47) - 127;
		txtcenter.y = (87-47) - 87;
		this.addChild(txtcenter);
		return txtcenter;
	}
	
	public setFadeIn(time : number){
		this.alpha = 0;
		let twin = new ggTween({progress : 0}, fpglobals._GROUP);
		twin.to({progress : 1}, time);
		twin.onUpdate((t) => {
			this.alpha = t.progress;
		});
		twin.onComplete(() => {
			this.alpha = 1;
		});
		twin.start(fpglobals.masterTicker.last_scaled_time);
		this.win_animators.push(twin);
	}
	
	// this sets up special graphics for special symbols (Fish/Basket/...)
	public setSymbolSprite(){
		//Rules for sprite children
		//Main sprite shall hold all child nodes, so we can transfer them easily
		//no "outside" sprites, sprites CAN be searched by name
		
		try{
			const anchor = 0.5;
			this._spine_WinAnimName = "win";
			
			//all other else
			//for animated number
			if(this.isCollector || this.isTruck || this.isBoat){
				this.text_node = this.getCreateTextCenterNode();
				this.sortableChildren = true;
				this.text_node.zIndex = 200;
				if(this.cashvalue > 0){
					this.setupCashValue(this.text_node);
				}
			}
			if(this.isSixPack || this.isBoat){
				this.text_prop_node = this.getCreateTextPropNode();
				this.sortableChildren = true;
				this.text_prop_node.zIndex = 201;
				//this.setUpPropTextNode()
			}
			
			//sprite bg if any
			let bg_name = this.getSpriteNameBG();
			if(gfxsym.getDoesResourceExistTEX("symbols",bg_name)){
				this.main_sprite = PIXI.Sprite.from(bg_name);
				this.addChild(this.main_sprite);
				(this.main_sprite as Sprite).anchor.x = anchor;
				(this.main_sprite as Sprite).anchor.y = anchor;
			}
			let parent_to_add = this.main_sprite; //add to main sprite overlay
			if(parent_to_add == null){
				parent_to_add = this;
			}
			let spr_name = this.getSpriteName(); //TODO refactor
			let main_img = null;
			try{
				main_img = Sprite.from(spr_name);
			} catch(e){
				fp_error.onerror("error symbol sprite["+ spr_name+"] setting : "+ e);
			}
			parent_to_add.addChild(main_img!);
			main_img!.anchor.x = anchor;
			main_img!.anchor.y = anchor;
			
			if(this.main_sprite == null){
				this.main_sprite = main_img!;
			}
		}
		catch(e){
			fp_error.onerror("error symbol sprite setting : "+ e);
		}
	}
	
	
	protected updateSymbolSprite(){
		return; //override in subclasses
	}
	
	
	
	
	
	
	// SPINE
	// SPINE
	// SPINE
	protected setUpSpineBeforePlaySet(animName : string){ //right before setting play
		return; //override in subclasses
	};
	protected setUpSpineAfterPlaySet(){ //right after setting play
		return; //override in subclasses
	};
	
	public setBlinkAndChime(duration : number, delay : number, doEvent : boolean= false, isWeed : boolean = false, removeAfter : boolean = false, doBlinkChimeDelay : boolean = true){
		//empty implementation
		//done in subclasses
	}
	
	//This clears all tracks and listeners but does not set to SETUP POSE!
	public setClearTracks(){
		if(this._main_spine == null){return;}
		this._main_spine?.state.clearTracks();
		this._main_spine?.state.clearListeners();
	}
	
	public setAnimationStop(animName : string){
		if(this._main_spine == null){return;}
		this._main_spine.setAnimationStop(animName);
	}
	
	public setRemoveLoopOnAnimation(animName : string){
		if(this._main_spine == null){return;}
		this._main_spine.setRemoveLoopOnAnimation(animName);
	}
	
	public setAnimationPlay(animName : string, loop = false, clearPrevious = false, delay : number = 0, timeScale : number = 1){
		if(this._symbolDestroyed){return;}
		if(delay > 0){
			this.logSpineAnimationScheduled("setAnimationPlay", animName, delay, " loop: " + loop);
		}
		let function_to_call = ()=>{
			if(this._symbolDestroyed){return;}
			if(this._main_spine == null){
				this.setGetSpine();
				this.setUpSpineBeforePlaySet(animName);
			}
			if(this._main_spine == null){return;}
			if(this.main_sprite){
				this.main_sprite.visible = false;
			}
			
			if(clearPrevious){this._main_spine.clearPreviousAnimation();}
			this._main_spine.setToLayer(this);
			if(fpglobals.log_spine_animations){
				fpglobals.GLog("["+this.getLogSymStr()+"]"+ "["+this.pos.x+","+this.pos.y+"]" + " setAnimationPlay: " + animName + " loop: " + loop + " delay: " + delay, log.type.SPINE_ANIMATIONS);
				//if(animName == "collect"){
				//	var sads  = 100;
				//	sads++;
				//}
			}
			let entry = 
				this._main_spine.setAnimationSafe(
					spine_player.getTrackChannelPerAnimation(animName), animName, loop);
			entry.mixDuration = this.param_spine_animation_mixin_duration;
			this._main_spine.state.timeScale = timeScale;
			this._main_spine.visible = true;
			this._main_spine.state.update(0); //to immediately show
			this._main_spine?.setupSpineEventListener();
			
			this.setUpSpineAfterPlaySet();
			return entry;
		}
		if(delay == 0){
			function_to_call();
		}else{
			this.callbackAfter(delay, function_to_call);
		}
	}
	
	public setAnimationPlayQueue(animName : string, loop = false){
		//TODO 
		this._main_spine?.addToSpineQueue(animName, 0, this._main_spine, loop);
	}
	
	public setSpinePath(toPos : Point, fromPos : Point, pathName = "point_end"){
		spine_player.setSpinePath(this._main_spine!,toPos, this.getPosInPixels(), pathName);
		return;
	}
	
	public setStopSpine(showMainSprite : boolean = true){
		if(this._main_spine){
			this._main_spine.clearPreviousAnimation(); //clears all
			this._main_spine.visible = false;
		}
		if(showMainSprite){
			this.main_sprite.visible = true;
		}
	}
	
	//if time is -1 then it will not show it again
	public setHideSpriteFor(time : number, delay : number = 0){
		if(this.main_sprite_tween != null){
			this.main_sprite_tween.stop();
		}
		let showAfter = true;
		if(time == -1){
			time = 0;
			showAfter = false;
		}
		
		this.main_sprite_tween = new ggTween({ progress: 0 }, fpglobals._GROUP)
		.delay(delay)
		.onStart(() => {
			this.main_sprite.visible = false;
		})
		.to({ progress: 1 }, time);
		
		if(showAfter){
			this.main_sprite_tween.onComplete(() => {
				this.main_sprite.visible = true;
			});
		}
		this.main_sprite_tween.start(fpglobals.masterTicker.last_scaled_time);
	}
	
	
	public setGetSpine(){
		if(this._symbolDestroyed){return null;}
		if(this._main_spine == null){
			let ret = SpineController.getSpinePlayerBySym(this.LibSym.toLocaleLowerCase());
			if(ret == null){return null;}
			this._main_spine = ret;
			this._main_spine.setToLayer(this);
			this._main_spine.zIndex = 150;
			this.sortableChildren = true;
			//for debug name spine_player every time
			let spname = "SP : " + this.LibSym.toLocaleLowerCase() + " " + this.pos.x + " " + this.pos.y;
			if(this.isDummy){spname += " dummy";}
			this._main_spine.name = spname;
			return this._main_spine;
		}
		return this._main_spine;
	}
	
	/** Stop delayed appear/blink callbackAfter chains (NOT show/hide or win-anim lifecycle). */
	protected stopExTweens(){
		if(this._ex_tweens != null){
			for(let i = 0; i < this._ex_tweens.length; i++){
				if(this._ex_tweens[i] != null){
					this._ex_tweens[i].stop();
				}
			}
			this._ex_tweens = [];
		}
	}
	
	/** Stop hideFor/showFor/hideAfter visibility tweens. */
	protected stopShowHideTweens(){
		if(this._ex_tweens_showhide != null){
			for(let i = 0; i < this._ex_tweens_showhide.length; i++){
				if(this._ex_tweens_showhide[i] != null){
					this._ex_tweens_showhide[i].stop();
				}
			}
			this._ex_tweens_showhide = [];
		}
	}
	
	
	
	//todo shouldnt be manually updated 
	public setupCashValue(text_parent : any = this.text_node, cashvalue : number = this.cashvalue){
		if(this.SymProperty.preview){return;}
		try{
			if(this.cashvalue == -1){return;} //no cash value
			if(this.isBasket || this.isCollector || this.isTruck || this.isBoat || this.isCatchboost || this.isFullsweep || this.isDropshot){
				if(this.text_basket_number == null){
					this.text_basket_number = new AnimNumber(cashvalue, "multiplier");
					text_parent.addChild(this.text_basket_number);
				}else {
					this.text_basket_number.setNumber(cashvalue);
				}
				if(this.cashvalue == 0){
					this.text_node.visible = false;
				}else{
					this.text_node.visible = true;
				}
			}
		}
		catch(e : any){
			fp_error.onerror("ERROR SETUP CASHVALUE" + e.toString());
		}
	}
	//property text node
	public setUpPropTextNode(text_parent : any = this.text_prop_node, value : number = this.SymProperty.NumProp!){
		if(this.SymProperty.preview){return;}
		try{
			if(value == -1){return;} //no value
		}
		catch(e : any){
			fp_error.onerror("ERROR SETUP PROPERTY VALUE" + e.toString());
		}
	}
	
	public SyncMainSpine(prevSym : gfxsym){
		
		if(prevSym._main_spine == undefined || prevSym._main_spine == null){
			return;
		}
		let prevSpine = prevSym._main_spine!;
		if(prevSpine.state.timeScale == 0){return;}
		let spine = this.setGetSpine()!;
		let isSpinePlaying = false;
		for(let i = 0; i < prevSpine.state.tracks.length; i++){
			let track = prevSpine.state.tracks[i];
			if(track == undefined || track == null){continue;}
			let animName = (track as any).animation.name;
			let animTime = track.trackTime;
			let animLoop = track.loop;
		//	let timeScale = track.timeScale;
			
			spine.setAnimationSafe(i, animName, animLoop);
		//	spine.state.timeScale = timeScale;
			spine.state.tracks[i].trackTime = animTime;
			isSpinePlaying = true;
		}
		
		if(!isSpinePlaying){
			this.setRemoveSpinePlayer();
			this.main_sprite.visible = prevSym.main_sprite.visible;
		}else{
			this._main_spine!.visible = true;
			this._main_spine!.state.timeScale = prevSpine.state.timeScale;
		}
	}
	
		
	protected getFishSpriteName(isInsidePlayfield : boolean, layer : number, pcashvalue : number = this.cashvalue){
		//Background is {cashvalue}_b_[state].png
		//Text is {cashvalue}_t_[state].png
		//fish is {cashvalue}_?_[state].png
		let cash_str = pcashvalue.toString() + "_";
		//if(pcashvalue == 0){cash_str = "1_";}//debug only, should throw
		if(pcashvalue == 0){return "container.png";}//debug only, should throw
		let toRet = cash_str;
		
		//if(pcashvalue == 0){toRet = "1_";}//debug only, should throw
		
		//new zindex layers 25/02/2025
		
		// OFF
		//0 	25_b.png
		//2 	25_bass.png
		//3 	25_t_off.png
		
		// ON
		//0 	25_b.png
		//1 	gold_frame.png //FOR Value >= 25
		//2 	25_bass.png
		//3 	25_t_on.png
		//4 	25_ts.png
		
		const format = ".png";
		if(layer == 0){
			toRet+= "b";
		}else if(layer == 1){
			toRet = "frame_gold_outer";
		}
		else if(layer == 2){
			toRet = cash_str+ "bass";
		}
		else if(layer == 3){
			toRet+= "t_";
			if(isInsidePlayfield){
				toRet+= "on";
			}else{
				toRet+= "off";
			}
		}
		else if(layer == 4){
			toRet = cash_str+ "ts";
		}
		return toRet + format;
	}
	
	public setUsedUpSymbolState(removeSpine : boolean = true){
		this.setSymbolSprite();
		if(removeSpine){
			this.setRemoveSpinePlayer();
			this.main_sprite.visible = true;
		}else{
			this.main_sprite.visible = false;
		}
	}
	
	
	protected setRemoveSpinePlayer(){
		
		try{
			if(this._main_spine){
				this._main_spine.setInert();
				SpineController.symbol_pool.setReturnSpinePlayer(this._main_spine);
				if(this._main_spine.parent){
					this._main_spine.parent.removeChild(this._main_spine);
				}
				this._main_spine = undefined;
			}
		}
		catch(ex : any){
			fp_error.onerror(this.LibSym +" ERROR REMOVING SPINE PLAYER: " + ex.toString());
		}
	}
	
	
	public doDelay(delay : number, callback : any){
		this._twin = new ggTween(this, fpglobals._GROUP);
		(this as any).__tweenDoDelay_progress = 0;
		this._twin.to({__tweenDoDelay_progress : 1},delay);
		this._twin.onComplete(callback);
		this._twin.start(fpglobals.masterTicker.last_scaled_time);
	}
	
	
	///////////////////////////////////////////////////////////////////////////////// chain anim
	//This is after cascade
	public animateMidSpin(toPos : Point, instant : boolean){ // a public command
		let node = this;
		node.pos = toPos;
		node.SymState = SYMBOL_STATE.SPIN;
		node.param_spin_cascade = false;
		let delay = 0;
		let animTime = 0;
		if(!instant){
			this.beforeSpinAnimatorStart();
			this.SymState = SYMBOL_STATE.SPIN;
			let time_mp = this.pos.x + 4;
			delay = ((fpglobals.grid_y- this.pos.y) * timingConst.delayBetweenSymbols) * 0.75;
			animTime = timingConst.getAnimationSpeed() * time_mp;
			
			let twin_mover = new ggTween(this, fpglobals._GROUP);
			this._start_pos_time = delay;
			this._end_pos_time = delay + animTime;
			twin_mover.delay(delay);
			twin_mover.onStart(() => {
				node.visible = true;
			});
			twin_mover.to({ x: node.getPosInPixels().x, y: node.getPosInPixels().y }, animTime).easing(Easing.Cubic.In);
			twin_mover.onComplete(() => {
				this.SymState = SYMBOL_STATE.STATIC;
				this.position_cords(this.pos);
				this.afterSpinAnimatorEnd();
			});
			twin_mover.start(fpglobals.masterTicker.last_scaled_time);
			
			this.win_animators.push(twin_mover);
			
		}else{
			//do instant placement
			node.SymState = SYMBOL_STATE.STATIC;
			node.position_cords(node.pos);
		}
		return delay + animTime + 33.333;
	}
	
	//This is spin start only
	public animateSpin_Start(toPos : Point, instant : boolean){ // a public command
		this.beforeSpinAnimatorStart();
		let node = this;
		node.pos = toPos;
		node.SymState = SYMBOL_STATE.SPIN;
		node.param_spin_cascade = false;
		let delay = 0;
		let animTime = 0;
		if(this.isBlank){instant = true;}
		if(!instant){
			this.SymState = SYMBOL_STATE.SPIN;
			let time_mp = this.pos.x + 5;
			delay = (fpglobals.grid_y - (this.pos.y+1)) * timingConst.delayBetweenSymbols + timingConst.init_delay_spin_offset;
			if(this.pos.y >= 3){
				//	time_mp = this.pos.x + 5 + ((fpglobals.grid_y - this.pos.y) * 1.5);
				//	delay+= ((fpglobals.grid_y - this.pos.y+2)) * timingConst.delayBetweenSymbols;
					//negativen correlation =
					//y = 6 - 4 = 2 delay 
					//y = 6 - 6 = 0 delay 
					time_mp = this.pos.x + 5 + ((fpglobals.grid_y - this.pos.y) * timingConst.additionalTimeMpForBottominit);
				}
			animTime = timingConst.getAnimationSpeed() * time_mp;
			
			this._start_pos_time = delay;
			this._end_pos_time = delay + animTime;
			
			let twin_mover = new ggTween(this, fpglobals._GROUP);
			twin_mover.delay(delay);
			twin_mover.onStart(() => {
				node.visible = true;
			});
			twin_mover.to({ x: node.getPosInPixels().x, y: node.getPosInPixels().y }, animTime).easing(Easing.Cubic.In);
			node._start_pos = node.getPosInPixels();
			node._end_pos = toPos;
			twin_mover.onComplete(() => {
				this.SymState = SYMBOL_STATE.STATIC;
				this.position_cords(this.pos);
				this.afterSpinAnimatorEnd();
				if(this._lambda_func_fire_on_bg_appear){
					this._lambda_func_fire_on_bg_appear();
					this._lambda_func_fire_on_bg_appear = null;
				}
			});
			twin_mover.start(fpglobals.masterTicker.last_scaled_time);
			
			this.win_animators.push(twin_mover);
			
		}else{
			//do instant placement
			node.SymState = SYMBOL_STATE.STATIC;
			node.position_cords(node.pos);
			node.setSymbolSprite();
		}
		return delay + animTime + 33.333;
	}
	
	
	
	//Where do we use remove?
	//	Reel remove (symbols fall down)
	//	WinRemove (spine animation then remove)
	// 	Feature remove (spine animation then remove?)
	
	//removing from reels (normal spin remove)
	public animateBGReelRemove(toPos: Point, instant : boolean){
		let node = this;
		
		node.SymState = SYMBOL_STATE.REMOVE;
		// Cancel delayed appear/blink callbacks so they cannot re-attach spines after destroy,
		// but keep the current visual (sprite) for the full fall animation.
		node.stopExTweens();
		if(node.main_sprite){
			node.main_sprite.visible = true;
		}
		if(!instant){
			let time_mp = this.pos.x + 5;
			let time = timingConst.getAnimationSpeed() * time_mp;
			let delay = ((fpglobals.grid_y - this.pos.y)* (timingConst.delayBetweenSymbols* 3));
			node.pos = toPos;
			
			let twin_mover = new ggTween(this, fpglobals._GROUP);
			twin_mover.delay(delay);
			twin_mover.onStart(() => {
				node.visible = true;
			});
			twin_mover.to({ x: node.getPosInPixels().x, y: node.getPosInPixels().y }, time).easing(Easing.Cubic.In);
			twin_mover.onComplete(() => {
				node.SymState = SYMBOL_STATE.STATIC;
				//this.position_cords(this.pos);
				node.visible = false;
				node.destroy();
			});
			twin_mover.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin_mover);
		}else{
			if(instant){this.visible = false; this.Destroy(); return;}
		}
		return;
	}
	//remove after delay
	public setWinRemove(delay : number){
		let node = this;
		if(delay == 0){
			node.visible = false;
			return;
		}
		
		//this.callbackAfter(delay, ()=>{node.main_sprite.visible = false;});
		this.callbackAfter(delay*2, ()=>{
			node.visible = false; 
			//node.destroy();
		});
		//this.callbackAfter(delay, ()=>{node.setAnimationPlay(animation, loop);});
	}
	
	//TODO feature remove
	
	protected afterSpinAnimatorEnd(){
		return;
	}
	protected beforeSpinAnimatorStart(){
		return;
	}
	
	
	public getIsReplacedByBlankOnBonusIntro() : boolean{
		return false;
	}
	
	
	public getIsInsidePlayfield() : boolean{
		//return fpglobals.playfield_low_limit > this.pos.y;
		return this.isInsidePlayfield;
	}
	public animateWinMark(
			animName : string,
			remove : boolean,
			time : number = 1000,
			delay : number = 0,
			delay_after : number = 200,
			visibleAfter : boolean = false,
			timeScale : number = 1
		){
		
		let node = this;
		node.SymState = SYMBOL_STATE.WIN_MARKING;
		if(delay > 0){
			this.logSpineAnimationScheduled("animateWinMark", animName, delay);
		}
		{ //animaton
			let twin = new ggTween({progress:0}, fpglobals._GROUP);
			let __onStart = () => {
				if(node._symbolDestroyed){return;}
				node.visible = true;
				node.main_sprite.visible = false;
				node._main_spine?.update(0);
				node.setAnimationPlay(animName,false, false, 0, timeScale);
			//	// Only hide static sprite if spine actually started — otherwise dummy vanishes
			//	if(node._main_spine){
			//		node.main_sprite.visible = false;
			//		node._main_spine.update(0);
			//	}else if(node.main_sprite){
			//		node.main_sprite.visible = true;
			//	}
			};
			if(delay!=0){
				twin.delay(delay);
				twin.onStart(() => {
					__onStart();
				});
			}else{
				__onStart();
			}
			
			twin.to({progress : 1}, time);
			twin.onComplete(() => {
				node.SymState = SYMBOL_STATE.STATIC;
				// If we are going to destroy after delay_after, keep visible until then —
				// otherwise the dummy vanishes early while the remove tween is still pending
				//if(!remove){
					node.visible = visibleAfter;
				//}
			});
			twin.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin);
		}
		if(remove){
			let twin = new ggTween({progress:0}, fpglobals._GROUP);
			twin.delay(delay);
			twin.to({progress : 1}, time + delay_after);
			twin.onComplete(() => {
				node.visible = false;
				node.destroy();
			});
			twin.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin);
		}
		return;
	}
	
	//this is for looping
	public animateWinInit(node : gfxsym = this){
		node.SymState = SYMBOL_STATE.WIN_INIT;
		if(node.isWeed || node.isWeedFish){
			return; //TODO something better
		}
		if(node._main_spine){
			//node._main_spine.autoUpdate = true;
		}
		node.setRemoveSpinePlayer();
		node.main_sprite.visible = false;
		node.setAnimationPlay(node._spine_WinInitAnimName, true);
		//node.setupSpine(null, node._spine_WinInitAnimName,null, false, true);
	}
	
	public animateCascade(to : PIXI.Point, extraDelay : number){
		let node = this;
		node.SymState = SYMBOL_STATE.WIN_CASCADE;
		let places_moving = to.y - node.pos.y;
		node.pos = to;
		
		let time = timingConst.getCascadeTime() * places_moving;
		
		extraDelay += 33.333 * to.x;
		
		let twin_mover = new ggTween(this, fpglobals._GROUP);
		
		twin_mover.onStart(() => {
			node.visible = true;
		});
		twin_mover.to({ x: node.getPosInPixels().x, y: node.getPosInPixels().y }, time).easing(Easing.Cubic.In);
		twin_mover.delay(timingConst.cascade_time_after + extraDelay);
		twin_mover.onComplete(() => {
			node.SymState = SYMBOL_STATE.STATIC;
			node.afterSpinAnimatorEnd();
		});
		twin_mover.start(fpglobals.masterTicker.last_scaled_time);
		this.win_animators.push(twin_mover);
		return timingConst.cascade_time_after + extraDelay + time;
	}
	public animateGeneratedEndEvent(
		animName : string,
		time : number = 1000,
		delay : number = 0){
		let node = this;
		node.SymState = SYMBOL_STATE.WIN_MARKING_INSERT;
		{ //animaton
			let twin = new ggTween({progress:0}, fpglobals._GROUP);
			twin.delay(delay);
			twin.to({progress : 1}, time);
			twin.onComplete(() => {
				node.visible = true;
				node.setZIndexWins(true);
				node.SymState = SYMBOL_STATE.STATIC;
				node.setAnimationPlay(animName,false, true);
				node.removeSymbolOverlayEffectWithDelay(0);
			});
			twin.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin);
		}
		return;
	}
	public animateGenerated(
		animName : string,
		time : number = 1000,
		delay : number = 0,
		hideAfter : boolean = true,
		isOutsidePlayfield : boolean = false
	){
		let node = this;
		node.SymState = SYMBOL_STATE.WIN_MARKING_INSERT;
		node.main_sprite.visible = false;
		if(isOutsidePlayfield){
			node.setZIndexWinFor(time, delay);
		}else{
			node.setZIndexWins(true);
		}
		
		let toPlayFunc = () => {
			node.visible = true;
			node.main_sprite.visible = false;
			node.SymState = SYMBOL_STATE.STATIC;
			node.setAnimationPlay(animName,false, true);
			node.removeSymbolOverlayEffectWithDelay(0);
		};
		
		{ 	//animaton
			let twin = new ggTween({progress:0}, fpglobals._GROUP);
			if(delay != 0){
				twin.delay(delay);
				twin.onStart(() => {
					toPlayFunc();
				});
			}else{
				toPlayFunc();
			}
			twin.to({progress : 1}, time);
			twin.onComplete(() => {
				if(hideAfter){
					node.visible = false;
				}
				if(node.dummy_removeAfterAnimate){
					node.Destroy();
				}
			});
			twin.start(fpglobals.masterTicker.last_scaled_time);
			this.win_animators.push(twin);
		}
		return;
	}
	
	public animateGeneratedPath(toPos : PIXI.Point,animTime : number, delay : number, pathName : string = "point_end"){
		let node = this;
		toPos = Macro.getCoordsPerPos(toPos, true);
		node.SymState = SYMBOL_STATE.WIN_MARKING_INSERTPATH;
		node.setZIndexWins(true);
		let twin = new ggTween({progress:0}, fpglobals._GROUP);
		twin.delay(delay);
		twin.onStart(() => { //after delay
			
			node.removeSymbolOverlayEffectWithDelay(0);

			node.main_sprite.visible = false;
			node.setAnimationPlay(node._spine_WinMarkingInsertPath, false, true);
			node.setSpinePath(toPos, node.getPosInPixels());
		});
		twin.to({progress : 1}, animTime);
		twin.onComplete(() => {
			node.visible = false;
			if(node.dummy_removeAfterAnimate){
				node.Destroy();
			}
		});
		twin.start(fpglobals.masterTicker.last_scaled_time);
		this.win_animators.push(twin);
		return;
	}
	
	public resetAfterDummyAnimating(node : gfxsym = this){
		node.SymState = SYMBOL_STATE.STATIC;
		node.visible = true;
		//reset tint to white
		node.setTintActive(node); 
	}
	public tint_graphics : Graphics;
	public animateTint(allWinsTimeBudget : number){
		return;
	//	//draw a graphics layer on top of the symbol
	//	if(this.tint_graphics){
	//		this.tint_graphics.destroy();
	//	}
	//	let graphics = new Graphics();
	//	graphics.beginFill(0x000000);
	//	graphics.drawRect(0, 0, fpglobals.sym_x, fpglobals.sym_y);
	//	graphics.endFill();
	//	graphics.alpha = 0.0;
	//	graphics.zIndex = 1000000000;
	//	graphics.position.set(fpglobals.sym_x/2*-1, fpglobals.sym_y/2*-1);
	//	this.addChild(graphics);
	//	this.tint_graphics = graphics;
	//	
	//	// Calculate transition times
	//	let tween_time = Math.floor(allWinsTimeBudget * 0.1); // 90% of time for transition in
	//	if(tween_time > 200){tween_time = 200;}
	//	const transition_out = Math.floor(allWinsTimeBudget * 0.1); // 10% of time for transition out
	//	const transition_out_delay = allWinsTimeBudget - transition_out;
	//	
	//	//tween alpha in time
	//	let tween = new ggTween(graphics, fpglobals._GROUP);
	//	tween.to({alpha : 0.75}, tween_time);
	//	tween.start(fpglobals.masterTicker.last_scaled_time);
	//	this._ex_tweens.push(tween);
	//	//add tint out
	//	let tween_out = new ggTween(graphics, fpglobals._GROUP);
	//	tween_out.delay(transition_out_delay);
	//	tween_out.to({alpha : 0.0}, transition_out);
	//	tween_out.start(fpglobals.masterTicker.last_scaled_time);
	//	this._ex_tweens.push(tween_out);
	//	
	//	return;
	//	if(this.isBlank){return;}
	//	let sprToTint = this.main_sprite;
	//	if(this.isWeed || this.isWeedFish){
	//		sprToTint = this._main_spine;
	//	}
	//	let tweens = this.recursivelyTintColorAnimated(sprToTint, allWinsTimeBudget, new Array<any>());
	//	let asd = tweens.length;
	//	this._ex_tweens = tweens;
	}
	
	protected setTintInactive(node : gfxsym = this){
		//for each child
		if(this.tint_graphics){	
			this.tint_graphics.visible = false;
		}
		//this.recursivelyTintColor(node, 0x888888);
	}
	protected setTintActive(node : gfxsym = this){
		//for each child
		if(this.tint_graphics){
			this.tint_graphics.visible = true;
		}
		//this.recursivelyTintColor(node, 0xFFFFFF);
	}
	protected recursivelyTintColor(node : gfxsym = this, tint : number){
		(node as any).tint = tint;
		for(let i = 0; i < node.children.length; i++){
			this.recursivelyTintColor(node.children[i] as gfxsym, tint);
		}
	}
	
	//TODO do from to colour, for now hardcoded
	protected recursivelyTintColorAnimated(node : any = this, time : number, arr : Array<any>){
		let ideal_transition_time = 200;//ms
		let toRet = arr;
		//check if node is type Sprite
		//if(node instanceof Sprite){
		if(true){
			let transition_time = 0;
			if(time != 0){ //to avoid division by 0
				transition_time = time/100*10;//ms
				if(transition_time > ideal_transition_time){
					transition_time = ideal_transition_time;
				}
			}
			let transition_out = 0;
			if(time != 0){ //to avoid division by 0
				transition_out = time/100*30;//ms
				if(transition_out > ideal_transition_time*3){
					transition_out = ideal_transition_time*3;
				}
			}
			node.tint = 0xFFFFFF;
			const startColor = (node as Sprite).tint;
			const endColor = 0x999999;	
			const tween = new ggTween({ progress: 0 }, fpglobals._GROUP)
            .to({ progress: 1 }, transition_time)
            .onUpdate((tweenObj) => {
               //new tint colour, get value from progress
			   //from 255 to 136
			   const tweenedColor = PIXI.utils.rgb2hex([
					(1 - tweenObj.progress) * 1 + tweenObj.progress * 0.4,
					(1 - tweenObj.progress) * 1 + tweenObj.progress * 0.4,
					(1 - tweenObj.progress) * 1 + tweenObj.progress * 0.4
				]);
				(node as Sprite).tint = tweenedColor;
            })
            .start(fpglobals.masterTicker.last_scaled_time);
			
			
			const tween3 = new ggTween({progress3 : 1}, fpglobals._GROUP);
			(node as any).__tween2_tint_progress = 0;
			const tween2 = new ggTween(node, fpglobals._GROUP)
			//.delay((time - (transition_time + transition_out)));
			.to({__tween2_tint_progress : 1},time - (transition_time + transition_out));
	//		tween2.duration((time - (transition_time + transition_out)));
			tween2.onComplete(()=>{
				tween3
				.to({ progress3: 0 }, transition_out)
				.onUpdate((tweenObj) => {
				//new tint colour, get value from progress
				//from 255 to 136
				const tweenedColor = PIXI.utils.rgb2hex([
						(1 - tweenObj.progress3) * 1 + tweenObj.progress3 * 0.4,
						(1 - tweenObj.progress3) * 1 + tweenObj.progress3 * 0.4,
						(1 - tweenObj.progress3) * 1 + tweenObj.progress3 * 0.4
					]);
					(node as Sprite).tint = tweenedColor;
				})
				.start(fpglobals.masterTicker.last_scaled_time);
			});
			tween2.start(fpglobals.masterTicker.last_scaled_time);
        
        	toRet.push(tween);
        	toRet.push(tween2);
        	toRet.push(tween3);
		}
		
		//(node as any).tint = tint;
		for(let i = 0; i < node.children.length; i++){
			toRet.concat(this.recursivelyTintColorAnimated(node.children[i] as any,time, toRet));
		}
		return toRet;
	}

	public Displace(to : Point, destroy : boolean) : boolean{
		if(!gfxsym.isNodeCascading(this)){
			this.pos = to;
			if(destroy){
				this.Destroy();
				return true;
			}
			return true;
		}
		return false;
	}
	
	public MarkRemove(node : gfxsym = this){
		node.CascadeRemove = true;
	}
	
	public forceStop(){ //TODO force stop is not implemented yet
		if(gfxsym.isNodeRemoving(this)){
			this.visible = false;
	//		this.destroy();
			return;
		}
		
		if(this.isDummy){
			this.destroy();
			return;
		}
		
		//else set postion
		if(this.SymState == SYMBOL_STATE.SPIN){
			this.x = this.param_dest.x;//_node.getPosInPixels().x;
			this.y = this.param_dest.y;//_node.getPosInPixels().y;
		}else{
			this.position_cords(this.pos);
		}
		if(this.CascadeRemove){this.visible = false;}
		else if(gfxsym.isNodeRemoving(this)){this.visible = false;}
		else{this.visible = true;}
		this.StopTween();
		
		if(gfxsym.isNodeSpinning(this)){
			
			this.position_cords(this.pos);
			
			//TODO will remove symbol checking method for a global timer
			
			//set a timer to set static after a while
			this._twin = new ggTween(this, fpglobals._GROUP);
			this._twin.to({__tween_progress : 1}, 200); //wait a bit after
			this._twin.onComplete(()=>{
				this.SymState = SYMBOL_STATE.STATIC;
			});
			this._twin.start(fpglobals.masterTicker.last_scaled_time);
			return;
		}
		this.SymState = SYMBOL_STATE.STATIC; //force pos
	}
	
	public updateOperatingGridMarker(_node : gfxsym = this, op_grid : PIXI.Point){
		//A small indicator on symbol for operating grid
		let thereIsChange = false;
		
		if(op_grid.y <= _node.pos.y){ //outside grid
			if(_node.isInsidePlayfield){
				thereIsChange = true;
			}
			_node.isInsidePlayfield = false;
		}else { //inside grid
			if(!_node.isInsidePlayfield){
				thereIsChange = true;
			}
			_node.isInsidePlayfield = true;
		}
		if(thereIsChange){
			_node.updateSymbolSprite();
			if(_node.overlay_symbol_effect != undefined){ //Only Lunkers!
				if(_node.isInsidePlayfield && (_node.isFish || _node.isWeedFish) ){ //BASS LUNKER ONLY
					
					_node.convertGridOverlayEffectToSymbolSpine(); //Combining tracks for loop and appear
					//convert removes overlay and starts appear_loop_base on symbol spine
					
					
					_node.setBlinkAndChime(0 , 0, true, false, false); //0 duration because it is not removing
				}
			}
		}
	}
	
	
	//transfer from overlay to symbol spine
	public convertGridOverlayEffectToSymbolSpine(){
		return;
	}
	
	
	
	protected static incrementState(_node : gfxsym){
		_node.SymState = SYMBOL_STATE.after(_node.SymState);
	}
	public animateGeneratedScatter( 
		animTime : number, 
		delay : number, 
		order : any,
		animCashProps : any //Array<numTo, inThisAmoountOfTime>
	)
	{
		return; //for override in basker
	}
	
	//for weed we play remove, this is removing
	public animateGeneratedEndEventRemove(
		animName : string,
		time : number = 1000,
		delay : number = 0){
		return;
	}
	
	
	
	
	
	
	/////////////////////////////////////////////////////////////////
	//				FEATURE START

	//We need to set up a chain of sprites for feature animation
	//During anim, the symbol will be invisible
	//at the end we will have this gfxsym set to visible
	//At force stop everything will reset / gfysym visible no mask
	
	
	public animateSpinFeature(
			reelstrip : Array<string>,
			instant : boolean,
			ongrid : boolean,
			previous_the_same : boolean,
			sym_timing:any, // TIming per symbol
			event : feature_symbol_spin_event | null,
			timingParam : FG_SPIN_TYPE = FG_SPIN_TYPE.NORMAL
		){
		if(timingParam != FG_SPIN_TYPE.CATCHBOOST){
			if(previous_the_same == true && this.LibSym != blank_symbol){
				return 0;
			}
		}
		
		this._feature_event = event;
		//time per symbol
		this.fs_spin_time_single = sym_timing.time_per_symbol;
		const time_to_act = this.fs_spin_time_single;
		//delay (depending on position and total symbols spinning)
		const delay = sym_timing.delay;
		let totalTimeRet = (time_to_act * reelstrip.length) + delay;
		//corrected totalTime Ret
		totalTimeRet = ((time_to_act+16) * reelstrip.length) + delay;
		this.fs_spin_time_end = totalTimeRet;
		
		if(instant){
			//do instant placement
			this.main_sprite.visible = true;
			this.visible = true;
			this.position_cords(this.pos);
			this.SymState = SYMBOL_STATE.STATIC;
			return 0;
		}
		this.position_cords(this.pos);
		this.SymState = SYMBOL_STATE.FEATURE_SPIN;
		
		if(this.text_node){
			this.text_node.visible = false;
		}
		if(this.text_prop_node){
			this.text_prop_node.visible = false;
		}
		
		this.isInsidePlayfield = ongrid;
		
		
	//if(this.isFish){
	//	if(this.isInsidePlayfield){
	//		let sda  = 10000000;
	//		//start slowmotion on 0.01 scale
	//		fpglobals.SlowMotion.startSlowMotion(sda, 0.01);
	//	}
	//}
		
		
		
		//we need to setup a container where we will spawn N sprites
		this.feature_spin_container = new PIXI.Container();
		this.feature_spin_container.name = "feature_spin_container";
		this.feature_spin_container.name = this._feature_spin_container_name;
		this.addChild(this.feature_spin_container);
		this.feature_spin_container.sortableChildren = true;
		
		// MOVE MAIN SPRITE
		//this.removeChild(this.main_sprite);
		this.feature_spin_container.addChild(this.main_sprite); //MOVE!
		//after moving adjust main sprite position
		this.main_sprite.position = new PIXI.Point(fpglobals.sym_x/2,fpglobals.sym_y/2);
		this.main_sprite.visible = false;
		
		this.feature_spin_container.position = new PIXI.Point(fpglobals.sym_x/2 * -1,fpglobals.sym_y/2 * -1);
		
		//Attach gradient over it, it will fade over time
		let gradient_sprite = Sprite.from("bonus_spin_frame.png");
		this.feature_spin_container.addChild(gradient_sprite);
		gradient_sprite.name = "gradient_sprite";
		gradient_sprite.anchor.set(0.5,0.5);
		gradient_sprite.scale.set(1);
		gradient_sprite.position = new PIXI.Point(fpglobals.sym_x/2,fpglobals.sym_y/2);
		gradient_sprite.visible = true;
		gradient_sprite.zIndex = 1000;
		gradient_sprite.alpha = 0.0;
		let gradient_tween = new ggTween(gradient_sprite, fpglobals._GROUP);
		gradient_tween.to({alpha:1.0},500);
		gradient_tween.start(fpglobals.masterTicker.last_scaled_time);
		this.feature_spin_gradient = gradient_sprite;
		this._ex_tweens.push(gradient_tween);
		
		//mask
		//this.feature_spin_container.mask = FPMask.getFeatureMask(this.pos.y);
		
		let prnt = new PIXI.Container();
		prnt.name = this._feature_spin_sprite_parent_name;
		this.feature_spin_container.addChild(prnt);
		
		//last one will contain proper sprite from this symbol
		//upon finishing, we will detach container and make this sprite as main sprite
		
		let rsa = reelstrip;
		this.fs_reelstrip = rsa; //save
		
		//setup a struct with 2 sprites
		//when we move sprite down, we teleport lower one to the top and replace it with new one
		
		this.fs_parent = prnt;
		
		this.fs_sprite_pair = new Array<PIXI.Sprite>();
		
		let fs_sprite_1 = PIXI.Sprite.from(getFeatureSpriteName(rsa[0], false,
			 this.getIsInsidePlayfield()) as any);
		let fs_sprite_2 = PIXI.Sprite.from(getFeatureSpriteName(rsa[1], false,
			 this.getIsInsidePlayfield()) as any);
		let fs_sprite_3 = PIXI.Sprite.from(getFeatureSpriteName(rsa[2], true,
			 this.getIsInsidePlayfield()) as any);
		
		this.fs_sprite_pair.push(fs_sprite_2);
		this.fs_sprite_pair.push(fs_sprite_1);
		this.fs_sprite_pair.push(fs_sprite_3);
		
		fs_sprite_1.anchor.set(0.5,0.5);
		fs_sprite_2.anchor.set(0.5,0.5);
		fs_sprite_3.anchor.set(0.5,0.5);
		this.fs_parent.addChild(fs_sprite_1);
		this.fs_parent.addChild(fs_sprite_2);
		this.fs_parent.addChild(fs_sprite_3);
		
		fs_sprite_1.position = new PIXI.Point(fpglobals.sym_x/2,fpglobals.sym_y/2 - fpglobals.sym_y);
		fs_sprite_2.position = new PIXI.Point(fpglobals.sym_x/2,fpglobals.sym_y/2);
		fs_sprite_3.position = new PIXI.Point(fpglobals.sym_x/2,fpglobals.sym_y/2 + fpglobals.sym_y);
		
		//		setup first ones
		//move this.main_sprite out of the screen
		this._twin = new ggTween(fs_sprite_2, fpglobals._GROUP);
		let thisdelay = delay;//timing.getFeatureSpinDelayPerPosition(this.pos);//this.pos.x * delay_x + this.pos.y * delay_y;
		this._twin.delay(thisdelay);
		this._twin.to({ y:fpglobals.sym_y/2 + fpglobals.sym_y},time_to_act);
		this._twin.onComplete(()=>{
			this.featureSpinNext();
			this.main_sprite.visible = false;
		});
		
		//lambda function
		this._twin.onStart((obj : any)=>{
	//		this.setSpinePlayer("above");
	//		this.playSpinePlayer("link_spin_anim", true);
		});
		
		this._twin.start(fpglobals.masterTicker.last_scaled_time);
		new ggTween(fs_sprite_1, fpglobals._GROUP).delay(thisdelay).to({y:fpglobals.sym_y/2},time_to_act).start(fpglobals.masterTicker.last_scaled_time);
		
		totalTimeRet+= timing.getExtraTimePerSymbolEvent(this._feature_event);
		
		return totalTimeRet;
	}
	
	//this will use sprites to alternate between 2 symbols
	public featureSpinNext(){
		
		const anim_time = this.fs_spin_time_single;
		
		//current on strip is 1, down one is 0
		let current = this.fs_sprite_pair[1];
		let down = this.fs_sprite_pair[0];
		
		//take first sprite in array and move it 
		let f = this.fs_sprite_pair[0];
		this.fs_sprite_pair[0] = this.fs_sprite_pair[1];
		this.fs_sprite_pair[1] = f;
		
		//now do animation
		let next_sym = this.fs_reelstrip[this.fs_reelstrip_index];
		this.fs_reelstrip_index++;
		
		let last_one = false;
		
		if(this.fs_reelstrip_index >= this.fs_reelstrip.length){
			if(this.fs_infinite_spin){
				this.fs_reelstrip_index = 0;
			}else{
				last_one = true;
				//if last one, hide the next sprite and move main sprite to current
			}
		}
		
		if (last_one){
			//NEED TO REFRESH SPRITE
			//if high value sym we can do special animations
			//move current down

			if(this.feature_spin_gradient != null){
				this.feature_spin_gradient.alpha = 0.0;
				let gradient_tween = new ggTween(this.feature_spin_gradient, fpglobals._GROUP);
				gradient_tween.to({alpha:0.0},500);
				gradient_tween.start(fpglobals.masterTicker.last_scaled_time);
				this._ex_tweens.push(gradient_tween);
			}
			if(this._feature_event != null){
				this.featureSpinThrillNearMissOrWin(); //this calcs variation
			}else{
				//else do normal overshoot
				new ggTween(current, fpglobals._GROUP).to({y:fpglobals.sym_y/2 + fpglobals.sym_y},anim_time).start(fpglobals.masterTicker.last_scaled_time);
				this.main_sprite.y = fpglobals.sym_y/2 - fpglobals.sym_y;
				this.main_sprite.visible = true;
				down.visible = false;
				this._twin = new ggTween(this.main_sprite, fpglobals._GROUP).to({y:(fpglobals.sym_y/2)},anim_time)
				.onComplete(()=>{
					this.featureSpinOvershoot(); //normal
					//this.removeFeatureSpin();
				}).start(fpglobals.masterTicker.last_scaled_time);
			}
		}
		else{
			//change texture of down
			down.texture = PIXI.Texture.from(getFeatureSpriteName(next_sym,true, this.getIsInsidePlayfield()) as any);
			down.position = new PIXI.Point(fpglobals.sym_x/2,fpglobals.sym_y/2 - fpglobals.sym_y);
			
			//move current down
			let _t1 = new ggTween(current, fpglobals._GROUP).to({y:fpglobals.sym_y/2 + fpglobals.sym_y},anim_time).start(fpglobals.masterTicker.last_scaled_time);
			//move down to current
			let _t2 = new ggTween(down, fpglobals._GROUP).to({y:fpglobals.sym_y/2},anim_time).onComplete(()=>{
				this.featureSpinNext();
			}).start(fpglobals.masterTicker.last_scaled_time);
			//this._twin.start(fpglobals.masterTicker.last_scaled_time);
			//this._twin.update(fpglobals.masterTicker.last_scaled_time);
			_t1.update(fpglobals.masterTicker.last_scaled_time);
			_t2.update(fpglobals.masterTicker.last_scaled_time);
		}
	}
	
	protected featureSpinOvershoot(){
		//for effective overshoot, we need to have a blind sprite on top
		//main symbol in place for overshoot
		
		let down = this.fs_sprite_pair[0];
		down.texture = 
			PIXI.Texture.from(getFeatureSpriteName(blank_symbol,
			 	true, this.getIsInsidePlayfield()) as any); //MUST BE BLANK SYMBOL
		down.position = new PIXI.Point(fpglobals.sym_x/2,fpglobals.sym_y/2 - fpglobals.sym_y); //top of screen
		
		//move both main sprite and down sprite down in overshoot distance, then back up and finish
		const overshoot_distance = this.fs_intertia_overshoot_px;
		
		new ggTween(down, fpglobals._GROUP).to({y:down.y + overshoot_distance},this.fs_intertia_overshoot_time)
		.onComplete(()=>{
			new ggTween(down, fpglobals._GROUP).to({y:down.y - overshoot_distance},this.fs_intertia_overshoot_time).start(fpglobals.masterTicker.last_scaled_time);
		}).start(fpglobals.masterTicker.last_scaled_time);
		
		this._twin = new ggTween(this.main_sprite, fpglobals._GROUP).to({y:this.main_sprite.y + overshoot_distance},this.fs_intertia_overshoot_time)
		.onComplete(()=>{
			this._twin = new ggTween(this.main_sprite, fpglobals._GROUP).to({y:this.main_sprite.y - overshoot_distance},this.fs_intertia_overshoot_time)
			.onComplete(()=>{
				//this.setZIndexWins(true);
				this.setActionsAfterBonusSpinDraw();
				this.playSpineOnFeatureStop();
				this.removeFeatureSpin();
			}).start(fpglobals.masterTicker.last_scaled_time);
		}).start(fpglobals.masterTicker.last_scaled_time);
	}
	
	//SPIN VARIATIONS OF OVERSHOOT

	protected featureSpinThrillNearMissOrWin(){
		//draw random which variation of near miss
		let variation : "variation_-1" | "variation_1" = "variation_-1";
		if(this._feature_event){
			if(this._feature_event.var == 0){
				fp_error.onerror("Feature event has no variation");
			}
			variation = this._feature_event.var === 1 ? "variation_1" : "variation_-1";
		}
		let current = this.fs_sprite_pair[0];//ZERO IS ACTUALLY CURRENT SHOWN
		let down = this.fs_sprite_pair[1]; 
		const anim_time = this.fs_spin_time_single;
		new ggTween(current, fpglobals._GROUP).to({y:fpglobals.sym_y/2 + fpglobals.sym_y},anim_time).start(fpglobals.masterTicker.last_scaled_time);

		//obj to move as center is gonna be center in thrill
		let obj_to_move = this.main_sprite;
		if(variation == "variation_1"){
			obj_to_move = this.fs_sprite_pair[0];
			let miss_target_sym = getLibSymPerMissEvent(this._feature_event!);
			(obj_to_move as Sprite).texture = PIXI.Texture.from(getFeatureSpriteName(miss_target_sym.symbol,
				false, this.getIsInsidePlayfield(), miss_target_sym.value) as any);
			(obj_to_move as Sprite).y = fpglobals.sym_y/2 - fpglobals.sym_y;
		}else{
			(this.main_sprite as Sprite).y = fpglobals.sym_y/2 - fpglobals.sym_y;
			(this.main_sprite as Sprite).visible = true;
			down.visible = false;
		}
		this._twin = new ggTween(obj_to_move, fpglobals._GROUP).to({y:(fpglobals.sym_y/2)},anim_time)
		.onComplete(()=>{
			this._featureSpinThrillAny(variation);
			//this.removeFeatureSpin();
		}).start(fpglobals.masterTicker.last_scaled_time);
		
	}
 
	private _featureSpinThrillAny(variation : "variation_1" | "variation_-1"){
		//for effective overshoot, we need to have a blind sprite on top
		//main symbol in place for overshoot
		
		let extra_time = timing.getExtraTimePerSymbolEvent(this._feature_event);
		//let down = this.fs_sprite_pair[0];
		let miss_target_sym = getLibSymPerMissEvent(this._feature_event!);
		
		let upper_obj = this.fs_sprite_pair[0];
		this.fs_sprite_pair[1].visible = false;
		let center_obj = this.main_sprite;
		upper_obj.visible = true;
		center_obj.visible = true;

		if(variation == "variation_-1"){
			upper_obj.texture = PIXI.Texture.from(getFeatureSpriteName(miss_target_sym.symbol,
				false, this.getIsInsidePlayfield(), miss_target_sym.value) as any);
			upper_obj.position = new PIXI.Point(fpglobals.sym_x/2,fpglobals.sym_y/2 - fpglobals.sym_y); //top of screen
			
			//move both main sprite and down sprite down in overshoot distance, then back up and finish
			const overshoot_distance = this.fs_intertia_overshoot_px + 50;
			
			//ta premakne zgornjega dol eg truck
			new ggTween(upper_obj, fpglobals._GROUP).to({y:upper_obj.y + overshoot_distance},this.fs_intertia_overshoot_time + extra_time/2)
			.easing(Easing.Cubic.Out)
			.onComplete(()=>{
				//ko konca ga premakne nazaj
				new ggTween(upper_obj, fpglobals._GROUP).to(
					{y:upper_obj.y - overshoot_distance},
					this.fs_intertia_overshoot_time + extra_time/2)
					.easing(Easing.Cubic.In)
					.start(
						fpglobals.masterTicker.last_scaled_time);
			}).start(fpglobals.masterTicker.last_scaled_time);
			
			//ta premakne pravi simbol dol pol nazaj gor
			this._twin = new ggTween(center_obj, fpglobals._GROUP).to({y:center_obj.y + overshoot_distance},this.fs_intertia_overshoot_time + extra_time/2)
			.easing(Easing.Cubic.Out)
			.onComplete(()=>{
				this._twin = 
				new ggTween(center_obj, fpglobals._GROUP).to
					({y:center_obj.y - overshoot_distance},this.fs_intertia_overshoot_time + extra_time/2)
					.easing(Easing.Cubic.In)
				.onComplete(()=>{
					//this.setZIndexWins(true);
					this.setActionsAfterBonusSpinDraw();
					this.playSpineOnFeatureStop();
					this.removeFeatureSpin();
				}).start(fpglobals.masterTicker.last_scaled_time);
			}).start(fpglobals.masterTicker.last_scaled_time);
		}else{
			let upper_obj = this.main_sprite;
			let center_obj = this.fs_sprite_pair[0];
			this.main_sprite.visible = true;
			this.fs_sprite_pair[1].visible = false;
			
			//upper_obj.texture = PIXI.Texture.from(getFeatureSpriteName(miss_target_sym.symbol,
			//	false, this.getIsInsidePlayfield(), miss_target_sym.value) as any); //MUST BE BLANK SYMBOL
			upper_obj.position = new PIXI.Point(fpglobals.sym_x/2,fpglobals.sym_y/2 - fpglobals.sym_y); //top of screen
			
			//move both main sprite and down sprite down in overshoot distance, then back up and finish
			const overshoot_distance = this.fs_intertia_overshoot_px + 50;
			
			//ta premakne zgornjega dol eg truck
			new ggTween(upper_obj, fpglobals._GROUP).to({y:upper_obj.y + overshoot_distance},this.fs_intertia_overshoot_time + extra_time/2)
			.easing(Easing.Cubic.Out)
			.onComplete(()=>{
				//ko konca ga premakne do konca
				new ggTween(upper_obj, fpglobals._GROUP).to(
					{y:upper_obj.y - overshoot_distance + fpglobals.sym_y},
					this.fs_intertia_overshoot_time + extra_time/2)
					.easing(Easing.Cubic.In)
					.start(
						fpglobals.masterTicker.last_scaled_time);
			}).start(fpglobals.masterTicker.last_scaled_time);

			//ta premakne pravi simbol dol pol nazaj gor
			this._twin = new ggTween(center_obj, fpglobals._GROUP).to({y:center_obj.y + overshoot_distance},this.fs_intertia_overshoot_time + extra_time/2)
			.easing(Easing.Cubic.Out)
			.onComplete(()=>{
				this._twin = 
				new ggTween(center_obj, fpglobals._GROUP).to
					({y:(center_obj.y - overshoot_distance) + fpglobals.sym_y },this.fs_intertia_overshoot_time + extra_time/2)
					.easing(Easing.Cubic.In)
				.onComplete(()=>{
					//this.setZIndexWins(true);
					this.setActionsAfterBonusSpinDraw();
					this.playSpineOnFeatureStop();
					this.removeFeatureSpin();
				}).start(fpglobals.masterTicker.last_scaled_time);
			}).start(fpglobals.masterTicker.last_scaled_time);
		}
	}
	
	//virtual function to be overriden by symbols
	public setActionsAfterBonusSpinDraw(){} //Symbol lands on playfield 

	public setStartActivateAnimation(is_sixpack : boolean = false, delay : number = 0){
		if(delay > 0){
			this.logSpineAnimationScheduled("setStartActivateAnimation", this._spine_appear_animation_name, delay);
		}
		let cb_func = ()=>{
			//this.setAnimationPlay(this._spine_static_spin, false, false);
			this.setAnimationPlay(this._spine_appear_animation_name, false, false);
			//let _func = ()=>{
				this.param_spine_animation_mixin_duration = 0.25;
				this.setAnimationPlay(this._spine_appear_loop_animation_name, true, false);
			//};
			
			this.main_sprite.visible = false;
			if(is_sixpack){
				this.setZIndexWins(true);
			}
		}
		if(delay > 0){
			this.callbackAfter(delay, cb_func);
		}else{
			cb_func();
		}
	}
	
	public playCollectedAnimation(delay : number = 0){
	//	this.setAnimationPlay(this._spine_WinCollectorAnimName, false, true);
		let animToPlay = this._spine_WinCollectedAnimName;
		if(delay > 0){
			this.logSpineAnimationScheduled("playCollectedAnimation", animToPlay, delay);
		}
		if(delay > 0){
			this.callbackAfter(delay, ()=>{
				this.setAnimationPlay(animToPlay, false, false);
			});
		}else{
			this.setAnimationPlay(animToPlay, false, false);
		}
	}







	
	
	














	private _featureSpinThrillNearMiss(variation : 1 | -1){
		//for effective overshoot, we need to have a blind sprite on top
		//main symbol in place for overshoot
		
		let extra_time = timing.getExtraTimePerSymbolEvent(this._feature_event);
		let down = this.fs_sprite_pair[0];
		let miss_target_sym = getLibSymPerMissEvent(this._feature_event!);

		down.texture = 
			PIXI.Texture.from(getFeatureSpriteName(miss_target_sym.symbol,
			 	false, this.getIsInsidePlayfield(), miss_target_sym.value) as any); //MUST BE BLANK SYMBOL
		down.position = new PIXI.Point(fpglobals.sym_x/2,fpglobals.sym_y/2 - fpglobals.sym_y); //top of screen
		
		//move both main sprite and down sprite down in overshoot distance, then back up and finish
		const overshoot_distance = this.fs_intertia_overshoot_px + 80;
		
		//ta premakne zgornjega dol eg truck
		new ggTween(down, fpglobals._GROUP).to({y:down.y + overshoot_distance},this.fs_intertia_overshoot_time + extra_time/2)
		.easing(Easing.Cubic.Out)
		.onComplete(()=>{
			//ko konca ga premakne nazaj
			new ggTween(down, fpglobals._GROUP).to(
				{y:down.y - overshoot_distance},
				this.fs_intertia_overshoot_time + extra_time/2)
				.easing(Easing.Cubic.In)
				.start(
					fpglobals.masterTicker.last_scaled_time);
		}).start(fpglobals.masterTicker.last_scaled_time);
		
		//ta premakne pravi simbol dol pol nazaj gor
		this._twin = new ggTween(this.main_sprite, fpglobals._GROUP).to({y:this.main_sprite.y + overshoot_distance},this.fs_intertia_overshoot_time + extra_time/2)
		.easing(Easing.Cubic.Out)
		.onComplete(()=>{
			this._twin = 
			new ggTween(this.main_sprite, fpglobals._GROUP).to
				({y:this.main_sprite.y - overshoot_distance},this.fs_intertia_overshoot_time + extra_time/2)
				.easing(Easing.Cubic.In)
			.onComplete(()=>{
				this.playSpineOnFeatureStop();
				this.removeFeatureSpin();
			}).start(fpglobals.masterTicker.last_scaled_time);
		}).start(fpglobals.masterTicker.last_scaled_time);
	}

	private _featureSpinThrillWin(variation : 1 | -1){
		//for effective overshoot, we need to have a blind sprite on top
		//main symbol in place for overshoot
		
		let extra_time = timing.getExtraTimePerSymbolEvent(this._feature_event);
		let down = this.fs_sprite_pair[0];
		let miss_target_sym = getLibSymPerWinEvent(this._feature_event!); //blank or some other symbol, it is not winning one
		
		down.texture = 
			PIXI.Texture.from(getFeatureSpriteName(miss_target_sym.symbol,
			 	false, this.getIsInsidePlayfield(), miss_target_sym.value) as any); //MUST BE BLANK SYMBOL
		down.position = new PIXI.Point(fpglobals.sym_x/2,fpglobals.sym_y/2 - fpglobals.sym_y); //top of screen
		
		//move both main sprite and down sprite down in overshoot distance, then back up and finish
		const overshoot_distance = this.fs_intertia_overshoot_px + 80;
		
		//ta premakne zgornjega dol eg truck
		new ggTween(down, fpglobals._GROUP).to({y:down.y + overshoot_distance},this.fs_intertia_overshoot_time + extra_time/2)
		.easing(Easing.Cubic.Out)
		.onComplete(()=>{
			//ko konca ga premakne nazaj
			new ggTween(down, fpglobals._GROUP).to(
				{y:down.y - overshoot_distance},
				this.fs_intertia_overshoot_time + extra_time/2)
				.easing(Easing.Cubic.In)
				.start(
					fpglobals.masterTicker.last_scaled_time);
		}).start(fpglobals.masterTicker.last_scaled_time);
		
		//ta premakne pravi simbol dol pol nazaj gor
		this._twin = new ggTween(this.main_sprite, fpglobals._GROUP).to({y:this.main_sprite.y + overshoot_distance},this.fs_intertia_overshoot_time + extra_time/2)
		.easing(Easing.Cubic.Out)
		.onComplete(()=>{
			this._twin = 
			new ggTween(this.main_sprite, fpglobals._GROUP).to
				({y:this.main_sprite.y - overshoot_distance},this.fs_intertia_overshoot_time + extra_time/2)
				.easing(Easing.Cubic.In)
			.onComplete(()=>{
				this.playSpineOnFeatureStop();
				this.removeFeatureSpin();
			}).start(fpglobals.masterTicker.last_scaled_time);
		}).start(fpglobals.masterTicker.last_scaled_time);
	}
	
	
	
	//intention is to schedule an event right before it ends spin
	public setFeatureEventOnSpinBeforeEnd(PARAM : any){
		//timing is depending on event?
		//this func is also called after spin start
		
		//no add a timer, after x ms
		this.callbackAfter(this.fs_spin_time_end-300, ()=>{
			this.startSlowMoEffect();
		});
		return;
	}
	public setFeatureBlinkChime(){ //for spin end
		return;
	}
	
	private startBlinkChime(){
		//TODO
	}
	private startSlowMoEffect(){
		fpglobals.SpinEE.emit(SPIN_EVENT.EFF_LUNKER_FOCUS, {pos : this.pos, sym : this, timing : 0})
	}
	
	protected featureSpinDramaticRoll(){} //TODO
	
	protected playSpineOnFeatureStop(){
		return; //for override
	}
	

	protected removeFeatureSpin(){
		let prnt = this.feature_spin_container;
		if(prnt != null){
			this.addChild(this.main_sprite);
			this.removeChild(prnt);
			this.feature_spin_container = null; //invalidate
			this.main_sprite.position = new PIXI.Point(0,0);
			this.SymState = SYMBOL_STATE.STATIC;
		}else{
			fp_error.onerror("REMOVING FEATURE SPIN FROM SYMBOL, BUT ALREADY REMOVED");
		}
		this.mask = null;
	}
	
	
	
	
	//				FEATURE END
	/////////////////////////////////////////////////////////////////
	
	
	//THIS IS ON DUMMY SYMBOL!
	public playCollectorSequence( //THIS IS FOR COLLECTOR NOT COLLECT
		allCollect : Array<CollSYM>, 
		delay : number, //initial delay
		small_win_duration : number,
		removeAfter : boolean = true //remove after is for base game
	){
		return; //This is done on LargeWild.ts
	}
	public playBonusCollectorSequence(allCollect : CollSYM[], delay : number){
		return; //This is done on Collector.ts
	}
	
	public playCollectorRemove(){
		return; //This is done on LargeWild.ts
	}
	public playBonusCollectorBuckClear(){
		return; //This is done on BuckSymbol.ts
	}
	
	public setPlayCollectorHit(allcoll_delays : Array<number>, allCollNums : Array<number>){
		return; //This is done on Collector.ts and LargeWild.ts
	}
	
	//THIS IS ON DUMMY SYMBOL!
	public playCollectSequence( //COLLECT NOT COLLECTOR
		collector_pos : PIXI.Point,
		delay : number,
		animtime : number, //delay, time of sequence
		alternate : boolean = false,
		real_symbol : boolean = false,
		animName : string = "",
		point_end_name : string = "collector_point_end"
	){
		let animToPlay = this._spine_WinCollectorAnimName;
		if(alternate){
			animToPlay = this._spine_WinCollectorAnimName_static;
		}
		if(animName != ""){
			animToPlay = animName;
		}
		let node = this;
		if(real_symbol){
			node.visible = true;
		}else{
			node.visible = false;
		}
		node.SymState = SYMBOL_STATE.WIN_MARKING_DELAY;
		let toPlayFunc = ()=>{
			if(node._symbolDestroyed){return;}
			node.visible = true;
			node.SymState = SYMBOL_STATE.WIN_MARKING;
			
			//only a temp guard FOR NON MOVING SYMBOLS like CB FS C
			if(node.LibSym.toLowerCase() != fish_symbol.toLowerCase()
			 && node.LibSym.toLowerCase() != basket_symbol.toLowerCase()
			){
				alternate = true; //force static
				animToPlay = node._spine_WinCollectorAnimName;
			}
			
			node.setAnimationPlay(animToPlay, false, false);
		//	if(node._main_spine){
		//		node.main_sprite.visible = false;
		//	}else if(node.main_sprite){
		//		node.main_sprite.visible = true;
		//	}
			if(!alternate){
				node.setSpinePath(collector_pos, node.getPosInPixels(), point_end_name);
			}
		}
		let twin = new ggTween({progress : 0}, fpglobals._GROUP);
		if(delay == 0){
			toPlayFunc();
		}else{
			twin.delay(delay);
			twin.onStart(()=>{
				toPlayFunc();
			});
		}
		twin.to({progress : 1},animtime);
		twin.onComplete(()=>{
			node.SymState = SYMBOL_STATE.STATIC;
			if(!real_symbol){
				node.visible = false;
				node.destroy();
			}
		});
		twin.start(fpglobals.masterTicker.last_scaled_time);
		// win_animators — do not put in _ex_tweens (those are stopped on reel-remove appear cleanup)
		this.win_animators.push(twin);
		return this;
	}
	
	
	
	
	//THIS IS ON DUMMY SYMBOL!
	public playCatchboostCollectSequence( //COLLECT NOT COLLECTOR
		collector_pos : PIXI.Point,
		delay : number,
		animtime : number, //delay, time of sequence
		alternate : boolean = false,
		real_symbol : boolean = false,
		animName : string = "",
		point_end_name : string = "collector_point_end"
	){
		//to override
		return;
	}
	
	
	
	
	
	
	
	
	
	
	//hide for X Amount of time then SHOW
	public hideFor(time : number, delay : number){ //this should work always!
		
		//clear previous ex tweens
//		for(let i = 0; i < this._ex_tweens_showhide.length; i++){
//			this._ex_tweens_showhide[i].stop();
//		}
//		this._ex_tweens_showhide = [];
		
		this.SymState = SYMBOL_STATE.WIN_HIDE;
		let thisnode = this;
		let timer = {time : 0};
		let twe = new ggTween(timer, fpglobals._GROUP);
		if(delay!= 0){
			twe.delay(delay);
		}else{
			thisnode.visible = false;
		}
		twe.onStart(()=>{
			thisnode.visible = false;
		} );
		twe.to({time : 1},time);
		
		twe.onComplete(()=>{
			thisnode.visible = true;
			thisnode.SymState = SYMBOL_STATE.STATIC;
		});
		
		this._ex_tweens_showhide.push(twe);
		
		twe.start(fpglobals.masterTicker.last_scaled_time);
		
		return time + delay;
	}
	//hide for X Amount of time then SHOW
	public hideAfter(time : number){ //this should work always!
		this.SymState = SYMBOL_STATE.WIN_HIDE;
		let thisnode = this;
		let timer = {time : 0};
		let twe = new ggTween(timer, fpglobals._GROUP);
		twe.to({time : 1},time);
		twe.onComplete(()=>{
			thisnode.visible = false;
			thisnode.SymState = SYMBOL_STATE.STATIC;
		});
		this._ex_tweens_showhide.push(twe);
		twe.start(fpglobals.masterTicker.last_scaled_time);
		return time;
	}
	public showAfter(time : number){ //this should work always!
		this.SymState = SYMBOL_STATE.WIN_HIDE;
		let thisnode = this;
		let timer = {time : 0};
		let twe = new ggTween(timer, fpglobals._GROUP);
		twe.to({time : 1},time);
		twe.onComplete(()=>{
			thisnode.visible = true;
			thisnode.SymState = SYMBOL_STATE.STATIC;
		});
		this._ex_tweens_showhide.push(twe);
		twe.start(fpglobals.masterTicker.last_scaled_time);
		return time;
	}
	public showFor(time : number, delay : number){ //this should work always!
		
		//clear previous ex tweens
		for(let i = 0; i < this._ex_tweens_showhide.length; i++){
			this._ex_tweens_showhide[i].stop();
		}
		this._ex_tweens_showhide = [];
		
		this.SymState = SYMBOL_STATE.WIN_HIDE;
		
		let thisnode = this;
		
		let timer = {time : 0};
		let twe = new ggTween(timer, fpglobals._GROUP);
		if(delay!= 0){
			twe.delay(delay);
		}
		twe.onStart(()=>{
			thisnode.visible = true;
		} );
		twe.to({time : 1},time);
		
		twe.onComplete(()=>{
			thisnode.visible = false;
			thisnode.SymState = SYMBOL_STATE.STATIC;
		});
		
		this._ex_tweens_showhide.push(twe);
		
		twe.start(fpglobals.masterTicker.last_scaled_time);
		
		return time + delay;
	}
	
	public callbackAfter(time : number, callback : any){
		//this.SymState = SYMBOL_STATE.CALLBACK;
		
		if(this._symbolDestroyed){return;}
		
		if(time == 0){
			callback();
			return;
		}
		
		let thisnode = this;
		
		let timer = {time : 0};
		let twe = new ggTween(timer, fpglobals._GROUP);
		//twe.delay(time);
		twe.onStart(()=>{
			//thisnode.visible = false;
		} );
		twe.to({time : 1},time);
		
		twe.onComplete(()=>{
			//thisnode.visible = true;
			//thisnode.SymState = SYMBOL_STATE.STATIC;
			if(thisnode._symbolDestroyed){return;}
			callback();
		});
		
		this._ex_tweens.push(twe);
		
		twe.start(fpglobals.masterTicker.last_scaled_time);
		
		return;
	}
	
	
	public removeSymbolOverlayEffectWithDelay(delay : number){
		if(delay == 0){
			this.removeOverlaySymbolEffect();
			return;
		}
		this.callbackAfter(delay, ()=>{
			this.removeOverlaySymbolEffect();
		});
	}
	


	
	//Expendable animations
	public setMoveToExpendable(moveTo : PIXI.Point, animTime : number, delay : number){
		
		let totalDelay = delay;
		
		let toPosInPixels = this.getAbsolutePositionInPixels(moveTo);
		//tween move to position
		this._twin = new ggTween(this, fpglobals._GROUP);
		this._twin.delay(totalDelay);
		this._twin.to({
			x : toPosInPixels.x,
			y : toPosInPixels.y
		},
		animTime,
		//{easing:"cubicIn"},
		);
		
		//WIP
		//TODO
		// First we need to clean this objects, on end of this animation
		//     we need to animate basket or how we will make it look
		// on force stop we need to get rid of this and force basket
		// we need to wait for animation end!
		let _node = this;
		this._twin.onComplete(
			function(){
				try{
					if(_node){
						_node.Destroy();
					}
				}
				catch(e){
					fpglobals.GLog("Error in setMoveToExpendable " + (e as any).toString(), log.type.ERROR);
				}
			}
			, _node);
		
		this._twin.start(fpglobals.masterTicker.last_scaled_time);
	}
	
	//Get previous symbol properties
	public getPrevSymProps(prevsym : gfxsym, isTransitionToActive : boolean = false){
		if(fpglobals.perf_SPINE_WEED_EFFECT){
			
			//tako over spine
			// with weed we either
			//	 	- replacing it with new spine (new spin)
			//		- or remove it (deweeding)
			if(this.isWeed || this.isWeedFish){
				if(prevsym._main_spine){
					let player = prevsym._main_spine;
					let player_is_main_sprite = false;
					if(prevsym._main_spine == prevsym.main_sprite){
						player_is_main_sprite = true;
					}
					prevsym._main_spine = undefined;
					
					//this.setupSpine(player);
					this._main_spine = player;
					if(!player_is_main_sprite){
						this.main_sprite.visible = prevsym.main_sprite.visible;
				//		prevsym.main_sprite = undefined;
					}else{
						this.removeChild(this.main_sprite);
						this.main_sprite = this._main_spine;
						prevsym.main_sprite = undefined;
					}
					
					this.addChild(this._main_spine);
					this.WEED_ANIM_INDEX = prevsym.WEED_ANIM_INDEX;
				}
			}else{
				//TODO
			}
		}
		
		if(this.isBasket){
			this.SymProperty.ScatterProperty = prevsym.SymProperty.ScatterProperty;
			this.setSymbolSprite();
		}
		
		if(prevsym.SymProperty != null){
			this.SymProperty = prevsym.SymProperty;
			if(this.SymProperty.Used){
				this.setSymbolSprite();
			}else{
				//transfer spine
				if(prevsym._main_spine != null){
					let player = prevsym._main_spine;
					let player_is_main_sprite = false;
					if(prevsym._main_spine == prevsym.main_sprite){
						player_is_main_sprite = true;
					}
					prevsym._main_spine = undefined;
					this._main_spine = player;
					if(!player_is_main_sprite){
						this.main_sprite.visible = prevsym.main_sprite.visible;
					}else{
						this.removeChild(this.main_sprite);
						this.main_sprite = this._main_spine;
						prevsym.main_sprite = undefined;
					}
					this.addChild(this._main_spine);
					if(this.isBasket){
						this.main_sprite = this._main_spine;
						prevsym.main_sprite = undefined;
						this.addChild(this.main_sprite);
					}
				}
			}
		}
		
		
		if(this.isBoat || this.isSixPack){
			this.setUpPropTextNode();
		}
		if(prevsym.overlay_symbol_effect){
			this.overlay_symbol_effect = prevsym.overlay_symbol_effect;
			prevsym.overlay_symbol_effect = undefined;
			this.overlay_symbol_effect.symbol = this;
			
			if(isTransitionToActive){
				this.convertGridOverlayEffectToSymbolSpine();
			}
		}
	}
	
	public position_cords(_pos : PIXI.Point){
		let x_center = fpglobals.sym_x/2;
		let y_center = fpglobals.sym_y/2;
		
		let tox = (fpglobals.sym_x * _pos.x) + x_center;
		let toy = (fpglobals.sym_y * _pos.y) + y_center;
		this.position.set(tox,toy);
	}
	public getAbsolutePositionInPixels(pos : PIXI.Point){
		let x_center = fpglobals.sym_x/2;
		let y_center = fpglobals.sym_y/2;
		let toRet = new PIXI.Point(
			(fpglobals.sym_x * pos.x)+ x_center, 
			(fpglobals.sym_y * pos.y)+ y_center);
		return toRet;
	}
	public getPosInPixels(pos : PIXI.Point = this.pos, center = true) : PIXI.Point{
		let toRet : PIXI.Point;
		let x_center = fpglobals.sym_x/2;
		let y_center = fpglobals.sym_y/2;
		if(gfxsym.isNodeRemoving(this)){
			toRet = new  PIXI.Point(
				(fpglobals.sym_x * this.pos.x) + x_center,
				(fpglobals.grid_y * fpglobals.sym_y) + y_center);
			//	(fpglobals.grid_y * (this.pos.y+fpglobals.grid_y)) + y_center);
			//	console.log(toRet.toString());
			return toRet;
		}
		toRet = new PIXI.Point(
			(fpglobals.sym_x * pos.x) + x_center, 
			(fpglobals.sym_y * pos.y) + y_center);
		return toRet;
	}
	public getTxtPosInPixels(pos : PIXI.Point = this.pos, center = true) : PIXI.Point{
		let toRet = this.getPosInPixels(pos, center);
		toRet.y += this.getTxtYOffset();
		return toRet;
	}
	
	
	public StopTween(){
		if(this._twin!=null){
			this._twin.stop();
		}
		for(let i = 0; i < this.win_animators.length; i++){
			this.win_animators[i].stop();
		}
	}
	
	override destroy(options?: boolean | PIXI.IDestroyOptions | undefined): void {
		if(this._symbolDestroyed || (this as any)._destroyed){
			return;
		}
		this.Destroy();
		super.destroy(options);
	}
	
	override updateTransform(): void {
		if(this.parent == null){ return;}
		if(this.visible == false){ return;}
		
		if(this.parent != null){
			super.updateTransform();
		}
	}
	
	protected doBeforeDestroy(): void{}
	
	public removeOverlaySymbolEffect(){
		if(this.overlay_symbol_effect){
			this.overlay_symbol_effect.destroy();
			this.overlay_symbol_effect = undefined;
		}
	}

	Destroy(){
		try{
			if(this._symbolDestroyed){return;}
			this._symbolDestroyed = true;
			this.removeOverlaySymbolEffect();
			this.doBeforeDestroy();
			this.stopExTweens();
			this.stopShowHideTweens();
			this.setRemoveSpinePlayer();
			let parent = this.parent;
			if(parent != null){
				parent.removeChild(this);
			}
			this.visible = false;
			if(this.win_animators != null){
				for(let i = 0; i < this.win_animators.length; i++){
					if(this.win_animators[i] != null){
						this.win_animators[i].stop();
						delete this.win_animators[i];
					}
				}
			}
			
			if(this.isBasket && (this.isDummy == false)){
				if(this.main_sprite != null){
					//this.main_sprite.release();
				}
			}else{
				if(this._main_spine != null){
					this._main_spine.release();
				}
				//if main sprite type is spine player, we need to release it
				if(this.main_sprite != null){
					if(this.main_sprite instanceof spine_player){
						if(this.main_sprite.isFree == false){ //if we didnt release via main spine
							this.main_sprite.release();
							this.main_sprite = null as any;
						}
					}
				}
			}
			if(this._twin != null){ //THIS NEEDS TO CLOSE ALWAYS! or everything tween related crashes!
				this._twin.stop();
				delete this._twin;
			}
		}
		catch(e){
			fpglobals.GLog("Error in Destroy", log.type.ERROR);
			fpglobals.GLog(e, log.type.ERROR);
		}
		return;
		//also remove all references to this object
		
		//this.parent.removeChild(this);
//		if(this._tweenObj != null){
//			this._tweenObj.stop();
//		}
		if(this._twin != null){ //THIS NEEDS TO CLOSE ALWAYS! or everything tween related crashes!
			this._twin.stop();
		}
		this.visible = false;
		this.destroy();
	}
	
	
	
	
	
	
	
	
	
	
	
	//MACROS
	//gfxsym states
	public static isNodeRemoving(_node : gfxsym){
		switch (_node.SymState){
			case SYMBOL_STATE.REMOVE:
				return true;
			case SYMBOL_STATE.REMOVE_DELAY:
				return true;
			default:
				return false;
		}
	}
	public static isNodeInserting(_node : gfxsym){
		switch (_node.SymState){
			case SYMBOL_STATE.WIN_MARKING_INSERT:
				return true;
			case SYMBOL_STATE.WIN_MARKING_INSERT_DELAY:
				return true;
			default:
				return false;
		}
	}
	public static isNodeCascading(_node : gfxsym){
		switch (_node.SymState){
			case SYMBOL_STATE.WIN_CASCADE:
				return true;
			case SYMBOL_STATE.WIN_CASCADE_DELAY:
				return true;
			case SYMBOL_STATE.WIN_CASCADE_END:
				return true;
			default:
				return false;
		}
	}
	public static isNodeWinMarking(_node : gfxsym){
		switch (_node.SymState){
			case SYMBOL_STATE.WIN_MARKING:
				return true;
			case SYMBOL_STATE.WIN_MARKING_DELAY:
				return true;
			case SYMBOL_STATE.WIN_MARKING_END:
				return true;
			default:
				return false;
		}
	}
	public static isNodeSpinning(_node : gfxsym){
		switch (_node.SymState){
			case SYMBOL_STATE.SPIN:
				return true;
			case SYMBOL_STATE.SPIN_DELAY:
				return true;
			default:
				return false;
		}
	}
	public static isNodeFeatureSpinning(_node : gfxsym){
		switch (_node.SymState){
			case SYMBOL_STATE.FEATURE_SPIN:
				return true;
//			case SYMBOL_STATE.FEATURE_SPIN_OUTSIDE:
//				return true;
			default:
				return false;
		}
	}
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
}

//export function getNewSymbol(_LibSym : string, _pos : PIXI.Point, cashValue : number = 0, dummy = false,
//	ScProp : any = null, SymProp : any = null){
//		return SymbolFactory.__createSymbol(_LibSym, _pos, cashValue, dummy, ScProp, SymProp);
//	}
//