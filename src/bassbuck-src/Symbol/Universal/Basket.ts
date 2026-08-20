import { Container, Point, Renderer, Sprite, Texture } from "pixi.js";
import { gfxsym, SYMBOL_STATE } from "../Core/GraphicSymbol";
import { BasketProperties } from "../../../effects/basketAnimProps";
import { fp_error } from "../../../globals/fp_error";
import { spine_player } from "../../../spine/spine_player";
import { generateSymbolPreview } from "../../../globals/assets";
import { fpglobals } from "../../../globals/fpglobals";
import { SpineController } from "../../../spine/SpineController";
import { ggTween } from "../../../globals/time/ggTween";
import * as timingConst from "../../timing/timingConst";
import { downloadTextureAsImage } from "../../../globals/Macro";

export class Basket extends gfxsym{
	
	constructor(_LibSym : string, _pos : Point, cashValue : number = 0, dummy = false,
		ScProp : any = null, SymProp : any = null){
		super(_LibSym, _pos, cashValue, dummy, ScProp, SymProp);
		
		this._spine_WinBonusInitAnimName = "bonus_award";
		
		return;
	}
	
	override setSymbolSprite(): void {
		
		
		if(this.SymProperty.ScatterProperty == null){
			this.SymProperty.ScatterProperty = [0,0,0,0];
			//insert 1 to a random slot
			this.SymProperty.ScatterProperty[Math.floor(Math.random() * this.SymProperty.ScatterProperty.length)] = 1;
			//this.SymProperty.ScatterProperty = [5,1,2,50];
		}
		
		this.text_node = this.getCreateTextCenterNode();
		this.sortableChildren = true;
		this.text_node.zIndex = 202;
		this.setupCashValue(this.text_node);
		
		if(this.main_sprite != null){
			this.removeChild(this.main_sprite);
			this.main_sprite = undefined;
		}
		
		this.setRemoveSpinePlayer();
		this.setGetSpine();
		//this.setupSpine();
		this.setUpSpineBeforePlaySet();
		this.setSpineScatterProperties(this._main_spine!);
		
		//make screenshot of spine
		//then remove it
		//then add it as sprite
		//then add text
		
		//TODO change this cachse as bitmpat to be sprite rendered texture
		
		//this.main_sprite = this._main_spine;
		this.addChild(this._main_spine!);
		this._main_spine!.visible = true;
		this._main_spine?.update(0);
		
		this.main_sprite = this._main_spine;
		
		//console.log("Basket: About to generate texture, spine visible:", this._main_spine!.visible);
		//console.log("Basket: Container width/height:", this.width, this.height);
		
		this.text_node.visible = false;
		
		//let tex = generateSymbolPreview(fpglobals.GApp.renderer as Renderer, this);
		
		this.text_node.visible = true;
		//this.main_sprite = new Sprite(tex);
		//this.addChild(this.main_sprite);
		//this.main_sprite.visible = true;
		// Set anchor to center for proper positioning
		//this.main_sprite.anchor.set(0.5, 0.5);
		//this.setRemoveSpinePlayer();
		
		//download texture as image
		//render symbol as texture
		//let tex = generateSymbolPreview(fpglobals.GApp.renderer as Renderer, this);
		//downloadTextureAsImage(tex, "basket_texture.png");
	}
	protected override getCreateTextCenterNode(){
		let exist = this.getChildByName("textcenter");
		if(exist != null){return exist;}
		
		let txtcenter = new Container();
		txtcenter.name = "textcenter";
		txtcenter.x = 0;
		txtcenter.y = 40;
		this.addChild(txtcenter);
		return txtcenter;
	}
	
	
	protected override setUpSpineBeforePlaySet(): void {
		//set u p  the layers
		let spine = this._main_spine!;
		
		this.setSpineScatterProperties(spine);
		//		this.text_node.zIndex = 100;
		this.setupCashValue(this.text_node);
		this.setSpineScatterProperties(spine); //TODO investigate why we need 2 calls
	}
	protected override setUpSpineAfterPlaySet(): void {
		//set u p  the layers
		let spine = this._main_spine!;
		
		this.setSpineScatterProperties(spine);
	}
	
	
	public setSpineScatterProperties(spine : spine_player, props : any = this.SymProperty.ScatterProperty){
		if(spine == null){return;}
		if(props == null){return;}
		const animAmount = 4;
		let debug_iter = -1;
		let debug_fishSpriteName = "NaN";
		let debug_SlotName = "NaN";
		
		try{
			//for(let i = props.length-1; i >= props.length-animAmount; i--){
			for(let i = 0; i < props.length; i++){
				debug_iter = i;
				let prop = props[i];
				//if(prop == 0){prop = 1;} //if 0 we use a special 0 slot
				let slot_name = "container_bass_" + (animAmount-(props.length - (i+1))).toString();
				debug_SlotName = slot_name;
				let fish_sprite_name = this.getFishSpriteName(true, 2, prop);
				debug_fishSpriteName = fish_sprite_name;
				let tex_fish = Texture.from(fish_sprite_name);
				spine.hackTextureBySlotName(slot_name, tex_fish, tex_fish.orig);
			}
			//set positions
			BasketProperties.setBasketPropertiesPerFish(spine, props);
		}
		catch(e){
			fp_error.onerror("error setting spine scatter properties slotname>" + debug_SlotName+" " +
			" fishSpriteName>"+debug_fishSpriteName+" iter>"+debug_iter+" e>"+e);
		}
	}
	//override doBeforeDestroy(): void {
	//	if(this.main_sprite != null && this.main_sprite instanceof spine_player){
	//		(this.main_sprite as spine_player).setInert();
	//		(this.main_sprite as spine_player).spine_pool?.setReturnSpinePlayer(this.main_sprite as spine_player);
	//	}
	//}
	
	protected override afterSpinAnimatorEnd(){
	//	this.main_sprite.visible = false;
		this.setAnimationPlay("appear");
		//this._ex_tweens
		
	//	let tweener = new ggTween({time : 0}, fpglobals._GROUP);
	//	tweener.to({time : 1}, 500);
	//	tweener.onComplete(()=>{
	//		this.setSymbolSprite();
	//		this.setRemoveSpinePlayer();
	//	});
	//	tweener.start(fpglobals.masterTicker.last_scaled_time);
	//	this._ex_tweens.push(tweener);
	
		if(this.scatter_shouldStartLoopingFGWon){
			this.setAnimationPlay(this._spine_appear_loop_animation_name, true);
			this.scatter_isLoppingFGWon = true;
			this.scatter_shouldStartLoopingFGWon = false;
		}
	
		return;
	}
	
	
	
	
	
	override animateGeneratedScatter( //is this played on dummy?
		animTime : number, 
		delay : number, 
		order : any,
		animCashProps : any //Array<numTo, inThisAmoountOfTime>
	)
	{
		this.SymProperty.ScatterProperty = order;
		//this.setSymbolSprite();
		
		this.SymState = SYMBOL_STATE.WIN_MARKING_INSERT_DELAY;
		
		this.scale = new Point(1.0,1.0);
		this.visible = false;
		if(delay == 0){this.visible = true;}
		this.position_cords(this.pos);
		
		this.param_anim_property = animCashProps;
		let node = this;
		
		//get rid of spine
		this.setRemoveSpinePlayer();
		
		this.main_sprite.visible = false;
		
		//spine first
		{
			let ftween = new ggTween(this, fpglobals._GROUP);
			(this as any).__tween_genScatter_progress = 0;
			ftween.to({__tween_genScatter_progress : 1},delay);
//			ftween.duration(delay);
			let totalDelay = animCashProps[0].time;
			let onComplete = () => {
				//this.setAnimationPlay("vfx_intro", true); 
				//this._main_spine!.addToSpineQueue("vfx_loop", 0, undefined, true);
				
				if(fpglobals.Basket_AllAtOnce){
					this.setAnimationPlay("create", true);
				}
				
				//stop basket vfx
				let vfx_fin = new ggTween(this, fpglobals._GROUP);
				let thisdelay = totalDelay;
				if(fpglobals.Basket_AllAtOnce){
					//TODO NO MAGIC NUMBERS
					vfx_fin.to({__tween_genScatter_progress : 2},timingConst.win_scatter_symbols_fish_time-100);
				}
				
				vfx_fin.onComplete(()=>{
			//		let animname = "vfx_outro";
			//		//this.setupSpine(null, animname, null, true,false);
			//		this._main_spine!.addToSpineQueue(animname, 0, this._main_spine, false);
					this.main_sprite.visible = true;
				});
				vfx_fin.start(fpglobals.masterTicker.last_scaled_time);
				this._ex_tweens.push(vfx_fin);
				this.setupCashValue(this.text_node, animCashProps[0].cash);
				this.visible = true;
			};
			if(delay == 0){	
				onComplete();
			}
			else{
				ftween.onComplete(()=>{
					onComplete();
				});
				ftween.start(fpglobals.masterTicker.last_scaled_time);
			}
		}
		
		
		
		//Animated number
		{
			if(fpglobals.Basket_AllAtOnce){
				let totalCash = this.cashvalue;
				let tween = new ggTween(node, fpglobals._GROUP);
				(tween as any).param = totalCash;
				let thisdelay = delay;
				(node as any).__tween_animNumber_progress = 0;
				tween.to({__tween_animNumber_progress : 1},thisdelay);
				tween.onComplete(()=>{
					node.text_basket_number!.setAnimatedNumber((tween as any).param,
					timingConst.win_scatter_symbols_fish_time/2); //TODO change this magic number
				});
				tween.start(fpglobals.masterTicker.last_scaled_time);
				this._ex_tweens.push(tween);
			
			}
			//else{
			//	let totalDelay = delay + animCashProps[0].time;
			//	let totalCash = animCashProps[0].cash;
			//	for(let i = 1; i < animCashProps.length; i++){
			//		totalCash+= animCashProps[i].cash;
			//		let tween = new ggTween(node, fpglobals._GROUP);
			//		(tween as any).param = totalCash;
			//		//tween.delay(animCashProps[i-1][1]);
			//		let thisdelay = totalDelay;
			//		(node as any).__tween_animNumber_progress = 0;
			//		tween.to({__tween_animNumber_progress : 1},thisdelay);
			//		tween.onComplete(()=>{
			//			node.text_basket_number!.setAnimatedNumber((tween as any).param, animCashProps[i].time);
			//		});
			//		totalDelay+= animCashProps[i].time;
			//		tween.start(fpglobals.masterTicker.last_scaled_time);
			//		this._ex_tweens.push(tween);
			//	}
			//}
		}
		
		//plus add a timer to all length and destroy after
		{
			let ftween = new ggTween(this, fpglobals._GROUP);
			(this as any).__twwen_remove_progress = 0;
			ftween.to({__twwen_remove_progress : 1},delay + animTime);
//			ftween.duration(delay + animTime);
			ftween.onComplete(()=>{
				//node.chain_AfterAnimate(node);
				node.SymState = SYMBOL_STATE.STATIC;
				node.Destroy();
			});
			ftween.start(fpglobals.masterTicker.last_scaled_time);
			this._ex_tweens.push(ftween);
		}
	}
	
	
	
	
	override setRemoveSpinePlayer(){
		try{
			if(this._main_spine){
				this._main_spine.setInert();
				if(this._main_spine.spine_pool){
					this._main_spine.spine_pool.setReturnSpinePlayer(this._main_spine);
				}
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
	
	
}