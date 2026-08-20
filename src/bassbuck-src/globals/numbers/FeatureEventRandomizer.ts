import { Point } from "pixi.js";
import { FeatureSpin, SymbolLimit } from "../../reelspin/Feature/FeatureSpin";
import { blank_symbol, boat_symbol, fish_symbol, lunker_threshold_spin_focus, plusonespin_symbol, SpinDataset, truck_symbol, weed_symbol, weedfish_symbol } from "../../reelspin/SpinDataset";
import { bonus_step, feature_symbol_spin_event, SDSym } from "../../reelspin/bonus_step";
import { fpglobals } from "../fpglobals";
import { log } from "../dev/log";


//Randomizes fake misses
export class FeatureEventRandomizer{

	public static buck_react_win_init_threshold : number = 25;
	private static buck_react_win_counter : Map<string, number> = new Map<string, number>(); //type, amount

	public static getIsBuckReactWin(amount : number, type : string) : boolean{
		//can take any type
		//if value does not exist, add it
		//use buck_react_win_init threshold for initial value
		//if value is lower, return false
		//if value is higher, save it and return true
		
		fpglobals.GLog("getIsBuckReactWin() - amount: " + amount + " type: " + type, log.type.ACCOUNTING);
		
		
		if(!this.buck_react_win_counter.has(type)){
			this.buck_react_win_counter.set(type, this.buck_react_win_init_threshold);
		}
		let value = this.buck_react_win_counter.get(type)!;
		if(value >= amount){
			return false;
		}
		this.buck_react_win_counter.set(type, amount); //reset value to new amount
		return true;
	}
	public static setResetBuckReactWinCounter() : void{
		this.buck_react_win_counter.clear();
		this.buck_react_win_counter = new Map<string, number>();
	}

	
	public static setRandomMisses(feature_instance : FeatureSpin, bonus_steps : Array<bonus_step>){
		//should start at bonus start
		
		
		//add miss events
		
		//lets say we want a slow-mo miss event every 5 steps
		//regular thrill miss every 3 steps
		
		//if we already have a slow-mo event
		//	 that is for example lunker landing or BO/TR/+1 symbols
		// Then we cannot add a slowmo event
		// We can however add a near miss event
		
		
		//For each step we have lets say 20% chance for slowmo event
		// 40% chance for thrill event
		
		
		
		
		//link steps
		let steps = bonus_steps;
		for(let i = 1; i < steps.length; i++){
			let prev_step = steps[i-1];
			let step = steps[i];
			
			//Limits for symbols, unique each step
			let symbol_limits = feature_instance.getSymbolLimits(step);
			step.limits = symbol_limits; //!reference
			
			//limitations
			//we cannot show a symbol near miss when that symbol was already limited
			//eg if truck is already on the playfield, it cannot be a near miss
			//same for 3 Collectors/ 3Boats / 1 old boot / 3 Catchboosts / 3 Fullsweep / 3 Dropshot
			//TODO

			//get difference in symbols
			let new_symbols = step.symbols;
			let prev_symbols = prev_step.symbols;
			let symbols_diff = new Array<SDSym>();
			let free_slots = new Array<Point>();
			for(let j = 0; j < new_symbols.length; j++){
				let next_row = new_symbols[j];
				let prev_row = prev_symbols[j];
				for(let k = 0; k < next_row.length; k++){
					let prev_symbol = prev_row[k];
					let next_symbol = next_row[k];
					if(prev_symbol.libsym == blank_symbol){
						if(next_symbol.libsym != prev_symbol.libsym){
							symbols_diff.push(next_symbol); //means we draw a new symbol
						}
						if(next_symbol.libsym == blank_symbol){ //both are blank symbols
							if(k <= step.operating_grid){
								free_slots.push(new Point(j, k));
							}
						}
					}
				}
			}
			
			let already_has_slowmo = false;
			let slowmo_symbol : SDSym | null = null;
			let slowmo_candidates = 0;
			
			for(let j = 0; j < symbols_diff.length; j++){
				let symbol = symbols_diff[j];
				if(symbol.libsym == truck_symbol || symbol.libsym == boat_symbol || symbol.libsym == plusonespin_symbol){
					slowmo_candidates++;
					if(slowmo_symbol == null){
						slowmo_symbol = symbol;
					} else{
						if(slowmo_symbol.libsym == fish_symbol){
							//bass has priority
						} else{
							if(symbol.libsym == truck_symbol){
								slowmo_symbol = symbol;
							} else if(symbol.libsym == boat_symbol){
								if(slowmo_symbol.libsym == plusonespin_symbol){
									slowmo_symbol = symbol;
								}
							}
						}
					}
				}
				else if(symbol.libsym == fish_symbol){
					if(symbol.value >= lunker_threshold_spin_focus ){
						slowmo_candidates++;
						if(slowmo_symbol == null){
							slowmo_symbol = symbol;
						} else{
							if(slowmo_symbol.libsym == fish_symbol){
								if(slowmo_symbol.value < symbol.value){
									slowmo_symbol = symbol; //higher value has priority
								}
							} else{
								slowmo_symbol = symbol;
							}
						}
					}
				}
			}
		//	for(let j = 0; j < symbols_diff.length; j++){
		//		let symbol = symbols_diff[j];
		//		if(symbol.libsym == truck_symbol || symbol.libsym == boat_symbol || symbol.libsym == plusonespin_symbol){
		//			already_has_slowmo = true;
		//			
		//			break;
		//		} else if(symbol.libsym == fish_symbol){
		//			if(symbol.value >= lunker_threshold_spin_focus ){
		//				already_has_slowmo = true;
		//				break;
		//			}
		//		}
		//	}
			if(step.steps_left == 3 || step.steps_left == 0){ //if no slowmo win
				if(prev_step.steps_left == 1){
					//we need to check if spin is last out of three
					slowmo_symbol = null; //do not do fake slowmo-nearmiss for last spin
					already_has_slowmo = true;
				}
			}
		
			if(slowmo_symbol){
				already_has_slowmo = true; //either way, if nearmiss cannot happen during VIP symbol landing
				//determine if we can have a slowmo event
				let do_slowmo = false;
				if(slowmo_candidates > 0){
					do_slowmo = true;
				}else{
					let result = fpglobals.randInstance.getRandomInt(0, 100);
					if(result < 50){
						do_slowmo = true;
					}
				}
				if(do_slowmo){
					//we have a slowmo event
					step.events.push({
						type: "win-slowmo",
						position: slowmo_symbol.position,
						libsym: slowmo_symbol.libsym,
						value: slowmo_symbol.value,
						var: fpglobals.randInstance.getRandomInt(0, 1) === 0 ? -1 : 1
					});
					if(symbol_limits.has(slowmo_symbol.libsym)){
						symbol_limits.get(slowmo_symbol.libsym)!.amount++;
					}else{
						symbol_limits.set(slowmo_symbol.libsym, {symbol: slowmo_symbol.libsym, amount: 1, max: 1}); //temp max 1
					}
				}
			}
			else if(step.steps_left == 3 || step.steps_left == 0){ //if no slowmo win
				if(prev_step.steps_left == 1){
					//we need to check if spin is last out of three
					already_has_slowmo = true; //do not do fake slowmo-nearmiss for last spin
				}
			}
			
			if(!already_has_slowmo && free_slots.length > 0){
				//draw if we can have a slowmo event
				let result = fpglobals.randInstance.getRandomInt(0, 100);
				if(result < 20){
					//we have a slowmo event
					
					//draw a position from free_slots
					let pos = free_slots[fpglobals.randInstance.getRandomInt(0, free_slots.length)];
					free_slots.splice(free_slots.indexOf(pos), 1);
					
					//draw for what symbol
					let sym_array = FeatureEventRandomizer.getAllSlowMo(symbol_limits, pos);
					let sym = sym_array[fpglobals.randInstance.getRandomInt(0, sym_array.length)];
					
					step.events.push({
						type: sym.type,
						position: pos,
						libsym: sym.libsym,
						value: sym.value,
						var: fpglobals.randInstance.getRandomInt(0, 1) === 0 ? -1 : 1
					});
					if(symbol_limits.has(sym.libsym)){
						symbol_limits.get(sym.libsym)!.amount++;
					}else{
						symbol_limits.set(sym.libsym, {symbol: sym.libsym, amount: 1, max: 1}); //temp max 1
					}
				}
			}
			//either case we can draw thrill
			
			if(free_slots.length > 0){
				let result = fpglobals.randInstance.getRandomInt(0, 100);
				if(result < 40){
					//we have a thrill event
					
					//draw a position from free_slots
					let pos = free_slots[fpglobals.randInstance.getRandomInt(0, free_slots.length)];
					free_slots.splice(free_slots.indexOf(pos), 1);
					//draw for what symbol
					let sym_array = FeatureEventRandomizer.getAllThrills(symbol_limits, pos);
					let sym = sym_array[fpglobals.randInstance.getRandomInt(0, sym_array.length)];
					
					step.events.push({
						type: sym.type,
						position: pos,
						libsym: sym.libsym,
						value: sym.value,
						var: fpglobals.randInstance.getRandomInt(0, 1) === 0 ? -1 : 1
					});
					if(symbol_limits.has(sym.libsym)){
						symbol_limits.get(sym.libsym)!.amount++;
					}else{
						symbol_limits.set(sym.libsym, {symbol: sym.libsym, amount: 1, max: 1}); //temp max 1
					}
				}
			}
			if(free_slots.length > 0){
				let result = fpglobals.randInstance.getRandomInt(0, 100);
				if(result < 40){
					//we have a thrill event
					
					//draw a position from free_slots
					let pos = free_slots[fpglobals.randInstance.getRandomInt(0, free_slots.length)];
					free_slots.splice(free_slots.indexOf(pos), 1);
					//draw for what symbol
					let sym_array = FeatureEventRandomizer.getAllThrills(symbol_limits, pos);
					let sym = sym_array[fpglobals.randInstance.getRandomInt(0, sym_array.length)];
					
					step.events.push({
						type: sym.type,
						position: pos,
						libsym: sym.libsym,
						value: sym.value,
						var: fpglobals.randInstance.getRandomInt(0, 1) === 0 ? -1 : 1
					});
					if(symbol_limits.has(sym.libsym)){
						symbol_limits.get(sym.libsym)!.amount++;
					}else{
						symbol_limits.set(sym.libsym, {symbol: sym.libsym, amount: 1, max: 1}); //temp max 1
					}
				}
			}

			//copy win thrills from symbols_diff
			let win_thrills_symbols = new Array<SDSym>();
			for(let j = 0; j < symbols_diff.length; j++){
				let symbol = symbols_diff[j];
				if(symbol.libsym == weed_symbol || symbol.libsym == weedfish_symbol){
					continue;
				}else{
					win_thrills_symbols.push(symbol);
				}
			}

			for(let j = 0; j < 2; j++){
				//now do win events
				if(win_thrills_symbols.length > 0){
					//draw a win event
					let result = fpglobals.randInstance.getRandomInt(0, 100);
					if(result < 40){ //40% chance for win event

						let pos = win_thrills_symbols[fpglobals.randInstance.getRandomInt(0, win_thrills_symbols.length)];
						win_thrills_symbols.splice(win_thrills_symbols.indexOf(pos), 1);
						let event_type = "win-any"; //a near miss animation for any symbol win
						step.events.push({
							type: event_type as feature_symbol_spin_event["type"],
							position: pos.position,
							libsym: pos.libsym,
							value: pos.value,
							var: fpglobals.randInstance.getRandomInt(0, 1) === 0 ? -1 : 1
						});
					}
				}
			}



		}
	}

	//todo input at time exceptions (one truck etc)
	private static getAllThrills(limits : Map<string, SymbolLimit>, position : Point) : Array<feature_symbol_spin_event>{
		let sym_array = new Array<feature_symbol_spin_event>();
		
		// Helper function to check if we can add a symbol based on limits
		const canAddSymbol = (symbolType: string) => {
			const limit = limits.get(symbolType);
			return !limit || limit.amount < limit.max;
		};
		
		// Check truck symbol limits
		if (canAddSymbol(truck_symbol)) {
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: truck_symbol, value: -1, var: 0});
		}
		
		// Check boat symbol limits
		if (canAddSymbol(boat_symbol)) {
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: boat_symbol, value: -1, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: boat_symbol, value: -1, var: 0});
		}
		
		if (canAddSymbol(plusonespin_symbol)) {
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: plusonespin_symbol, value: -1, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: plusonespin_symbol, value: -1, var: 0});
		}
		
		if(canAddSymbol(fish_symbol)){
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 10, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 25, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 50, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 100, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 100, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 100, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 100, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 100, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 100, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 250, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 250, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 250, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 250, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 250, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 250, var: 0});
			sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 250, var: 0});
			if(position.y >= 4){
				sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 500, var: 0});
				sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 500, var: 0});
				sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 500, var: 0});
				sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 500, var: 0});
				sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 500, var: 0});
			}
			if(position.y >= 5){
				sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 1000, var: 0});
				sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 1000, var: 0});
				sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 1000, var: 0});
				if(position.y == 6){
					sym_array.push({type: "nearmiss-thrill", position: new Point(0, 0), libsym: fish_symbol, value: 2000, var: 0});
				}
			}
			
		}
		
		return sym_array;
	}
	private static getAllSlowMo(limits : Map<string, SymbolLimit>, position : Point) : Array<feature_symbol_spin_event>{
		let sym_array = new Array<feature_symbol_spin_event>();
		
		// Helper function to check if we can add a symbol based on limits
		const canAddSymbol = (symbolType: string) => {
			const limit = limits.get(symbolType);
			return !limit || limit.amount < limit.max;
		};
		
		// Check truck symbol limits
		if (canAddSymbol(truck_symbol)) {
			sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: truck_symbol, value: -1, var: 0});
		}
		if(position.y >= 0){
		// Check boat symbol limits
			if (canAddSymbol(boat_symbol)) {
				sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: boat_symbol, value: -1, var: 0});
				sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: boat_symbol, value: -1, var: 0});
			}
		}
		
		if (canAddSymbol(plusonespin_symbol)) {
			sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: plusonespin_symbol, value: -1, var: 0});
			sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: plusonespin_symbol, value: -1, var: 0});
		}
		
		if(canAddSymbol(fish_symbol)){
			sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 100, var: 0});
			sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 100, var: 0});
			sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 100, var: 0});
			sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 100, var: 0});
			sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 100, var: 0});
			if(position.y >= 4){
				sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 250, var: 0});
				sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 250, var: 0});
				sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 250, var: 0});
				sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 250, var: 0});
				sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 250, var: 0});
				if(position.y >= 5){
					sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 500, var: 0});
					sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 500, var: 0});
					sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 500, var: 0});
					sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 1000, var: 0});
					sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 1000, var: 0});
					if(position.y == 6){
						sym_array.push({type: "nearmiss-slowmo", position: new Point(0, 0), libsym: fish_symbol, value: 2000, var: 0});
					}
				}
			}
		}
		
		return sym_array;
	}
	
	
	
}