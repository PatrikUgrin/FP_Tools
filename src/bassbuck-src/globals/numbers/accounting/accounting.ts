

import { log } from "../../dev/log";
import { devpanel } from "../../dev/devpanel";
import { fpglobals } from "../../fpglobals";


export class accounting{
	
	public static BIG_WIN_MULTIPLIER = 25;
	
	
	private static BET = 100;
	private static DENOMINATION = 100; //100 cr for 1€
	private static CREDIT = 0;
	private static currency = "Credits";
	
	private static DEMO_CREDIT = 5000; //only for demo mode, replaces CREDIT
	
	private static play_CREDIT_BEFORE_BET = 0; 	//when playing, this is before we take away bet, not used
	private static play_CREDIT_AFTER_BET = 0; 	//when pressing spin, this is current state
	private static play_CREDIT_AFTER_GAME = 0;	//after we finish whole game, this is credit state
	
	public static getCurrentCredit(when : "before_bet" | "after_bet" | "after_game" = "after_game"){
		if(when == "before_bet"){
			return accounting.play_CREDIT_BEFORE_BET;
		}else if(when == "after_bet"){
			return accounting.play_CREDIT_AFTER_BET;
		}else if(when == "after_game"){
			return accounting.play_CREDIT_AFTER_GAME;
		}else{
			return accounting.play_CREDIT_AFTER_GAME;
		}
	}
	
	public static getBetInCredits(){
		return accounting.BET;
	}public static setBetInCredits(bet : number){
		accounting.BET = bet;
		return accounting.BET; //TODO emit event on bet change
	}
	
	//Exposed only so WinValue can project credits -> currency and back.
	//All other code should go through the WinValue class, never convert by hand.
	public static getDenomination(){
		return accounting.DENOMINATION;
	}
	
	//All unit conversions used to live here (getCurrencyFromCredit /
	//getCreditFromCurrency / getCreditFromMultiplier / getWinAsMultiplier).
	//They have moved into src/globals/numbers/accounting/WinValue.ts so that
	//every win-amount unit conversion in the project is mediated by a
	//WinValue instance and the unit is explicit at the boundary.
	
	public static parseHeaderAccounting(header : any){
		if(devpanel.DEMO_MODE){
			//get total win from header
			//add it to DEMO_CREDIT
			let winToAdd = 0;
			let bet = 0;
			
			devpanel.LAST_SEED = header.game_seed;
			
			this.play_CREDIT_BEFORE_BET = this.DEMO_CREDIT; //either way, we start with this
			
			if(header.total_win != undefined){ //placing a bet
				this.DEMO_CREDIT -= accounting.BET;
				this.play_CREDIT_AFTER_BET = this.DEMO_CREDIT;
				if(header.total_win != undefined){winToAdd = header.total_win;}
				this.play_CREDIT_AFTER_GAME = this.DEMO_CREDIT + winToAdd;
				this.DEMO_CREDIT += winToAdd;
			}
			else{
				this.play_CREDIT_BEFORE_BET = this.DEMO_CREDIT;
				this.play_CREDIT_AFTER_BET = this.DEMO_CREDIT;
				this.play_CREDIT_AFTER_GAME = this.DEMO_CREDIT + winToAdd; //adds 0
			}
			return;
		}
		
		
		//TODO, for demo GS we have header->credits, header->bet etc
		//on real one we change this to subsection like relax gaming for example, refer to docs
		
//		public string type_info;
//		public string game_seed;
//
//		public int credits_before = 100; //before is state before spinning (before bet is taken and win is added)
//		public int credits_after = 100;
//		public int total_win = 0;
//		public int bet = 100;
//		public string currency = "Credits";
		

		if(header.credits_after != undefined){
			this.CREDIT = header.credits_after;
		}
		if(header.bet != undefined){
			this.BET = header.bet;
		}
		if(header.currency != undefined){
			this.currency = header.currency;
		}
		if(header.credits_before != undefined){
			this.play_CREDIT_AFTER_BET = header.credits_before;
		}
		if(header.credits_after != undefined){
			this.play_CREDIT_AFTER_GAME = header.credits_after;
		}
		
		fpglobals.GLog("accounting: parseHeaderAccounting: " + JSON.stringify(header), log.type.INFO);
	}
	
	
}