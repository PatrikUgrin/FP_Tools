import { Point } from 'pixi.js';
import { gfxsym } from '../Core/GraphicSymbol';
import { basket_symbol, blank_symbol, boat_symbol, collector_symbol, fish_symbol, isBaseGameRegularSymbol, largewild_symbol, smallwild_symbol, truck_symbol, weed_symbol, weedfish_symbol, catchboost_symbol, plusonespin_symbol, fullsweep_symbol, dropshot_symbol, sixpack_symbol, luckyboot_symbol } from '../../SpinDataset';
import { Collector } from '../Bonus/Collector';
import { Truck } from '../Bonus/Truck';
import { Weed } from '../Universal/Weed';
import { WeedBass } from '../Universal/WeedBass';
import { Basket } from '../Universal/Basket';
import { BaseGameSymbol } from '../Basegame/BaseGameSymbol';
import { Bass } from '../Universal/Bass';
import { Boat } from '../Bonus/Boat';
import { Blank } from '../Universal/Blank';
import { LargeWild } from '../Basegame/LargeWIld';
import { SmallWild } from '../Basegame/SmallWild';
import { Catchboost } from '../Bonus/Catchboost';
import { Plus1Spin } from '../Bonus/Plus1Spin';
import { Fullsweep } from '../Bonus/Fullsweep';
import { Dropshot } from '../Bonus/Dropshot';
import { Sixpack } from '../Bonus/Sixpack';
import { SymbolProperty } from './SymbolProperty';
import { LuckyBoot } from '../Bonus/LuckyBoot';

export class SymbolFactory {
	//public static __createSymbol(libsym: string, pos : Point, CashValue : number = 0, dummy : boolean = false, ScProp : any = null, SymProp : any = null): gfxsym {
	public static getNewSymbol(libsym: string, pos : Point, CashValue : number = 0, isfeature = false, dummy : boolean = false, SymProp : SymbolProperty | null = null): gfxsym {
		if(isBaseGameRegularSymbol(libsym)){
			return new BaseGameSymbol(libsym, pos, CashValue, dummy, SymProp);
		}
		switch (libsym) {
			case truck_symbol:
				return new Truck(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case collector_symbol:
				return new Collector(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case largewild_symbol:
				return new LargeWild(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case smallwild_symbol:
				return new SmallWild(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case weed_symbol:
				return new Weed(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case weedfish_symbol:
				return new WeedBass(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case basket_symbol:
				return new Basket(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case fish_symbol:
				return new Bass(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case blank_symbol:
				return new Blank(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case boat_symbol:
				return new Boat(libsym, pos, CashValue, dummy, SymProp);
			case catchboost_symbol:
				return new Catchboost(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case plusonespin_symbol:
				return new Plus1Spin(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case sixpack_symbol:
				return new Sixpack(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case fullsweep_symbol:
				return new Fullsweep(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case dropshot_symbol:
				return new Dropshot(libsym, pos, CashValue, isfeature, dummy, SymProp);
			case luckyboot_symbol:
				return new LuckyBoot(libsym, pos, CashValue, isfeature, dummy, SymProp);
			default: //L1->L4 H1->H4  BL |  SW LW C B F WF T CTR SP BO OB WD BL
				return new gfxsym(libsym, pos, CashValue, isfeature, dummy, SymProp);
				//throw new Error(`Invalid symbol type: ${type}`);
		}
	}
}



/*

SYM| GSNAME | BASEGAME | FEATURE
 ♠ |L1      |True      |False
 ♦ |L2      |True      |False
 ♣ |L3      |True      |False
 ♥ |L4      |True      |False
 ♫ |H1      |True      |False
 ⚒ |H2      |True      |False
 ⚓ |H3      |True      |False
 ⎈ |H4      |True      |False
 ʷ |SW    			    |False
 ⏏ |LW    			    |True
 ⏏ |C     			    |True
≜  |B     			    |False
∝  |F     			    |False
≴  |WF    			    |True
Ŧ  |T     			    |True
⚙  |CTR  			     |True
⚅  |SP   			     |True
⚗  |BO   			     |True
Ъ  |OB    			    |True
 ♒ |WD   			     |True
 ⋅ |BL    			    |False
 x |BL    			    |True
________________________________

*/