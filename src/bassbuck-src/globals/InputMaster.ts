
/**********************
 * Name = DU Projects
 * Author = FreshProduce
 *  - TypeScript - 
 **********************/

//a dataset format that is then passed to spin


import { SpinDataset } from "../reelspin/SpinDataset";
import { fp_error } from "./fp_error";
import { spin } from "../reelspin/BaseGame/spin";
import { FPNetwork } from "./FPNetwork";
import { fpglobals,  } from "./fpglobals";
import { fp_loading, LOADING_TYPE } from "./fp_loading";
import { Macro } from "./Macro";
import { devpanel } from "./dev/devpanel";
import { log } from "./dev/log";
import { FeatureSpin } from "../reelspin/Feature/FeatureSpin";

//this is PARSER for all input regarding spin, this handles requests/spins/outputing datasets etc
export class InputMaster { //For Game Input
	//onStartSymbols : SpinDataset;
	
	static DEMO_ALL_GAMES : any;
	
	
	//returns dataset on load
	static getStartupSymbolDataset(){
		//for now it can return static pre-defined symbols
		fpglobals.GLog("Requesting from GS startup symbols", log.type.IMPORTANT);
		FPNetwork.sendToWBS("get_startup_symbols=true");
	}
	
/*
REELS
 6x5
	_________________
	0_ 1_ 2_ 3_ 4_    |
	0|00 10 20 30 40  | 
	1|01 11 21 31 41  |
	2|02 12 22 32 42  | 
	3|03 13 23 33 43  |
	4|04 14 24 34 44  | 
	5|05 15 25 35 45  |
	_________________ |
reversed
*/
	
	
	
	static recieveMessage(message : any, startAtStep : number = 0, startFeatureAtStep : number = 0){
		let type = message.header.type_info;
		if(type == undefined){fp_error.onerror("Invalid message recieved!");return;}
		else{
			if(type=="game" || type == "spin"){
				let sd = new SpinDataset(message, true);
				if(devpanel.DEMO_MODE){
					for(let i = 0; i < startAtStep; i++){
						sd.setNextStep();
					}
					if(startFeatureAtStep > 0){
						spin.getFeatureInstance().startAtStep = startFeatureAtStep;
					}else{
						spin.getFeatureInstance().startAtStep = 0;
					}
				}
				spin.RecieveSpinDataset(sd, false);
			}else if(type == "startup_symbols"){
				let sd = new SpinDataset(message, false);
				sd.isInitSymbolSet = true;
				spin.RecieveSpinDataset(sd, true);
				fp_loading.try_start_games(LOADING_TYPE.SPIN_FRAMEWORK);
			}
		}
	}
	
	public static startup_symbols : string = 
"{\"startup_symbols\":[[{\"name\":\"F\",\"cval\":\"250\",\"x\":0,\"y\":0},{\"name\":\"F\",\"cval\":\"10\",\"x\":1,\"y\":0},{\"name\":\"H1\",\"cval\":\"10\",\"x\":2,\"y\":0},{\"name\":\"H3\",\"cval\":\"250\",\"x\":3,\"y\":0},{\"name\":\"L3\",\"cval\":\"2000\",\"x\":4,\"y\":0}],[{\"name\":\"F\",\"cval\":\"1000\",\"x\":0,\"y\":1},{\"name\":\"F\",\"cval\":\"1\",\"x\":1,\"y\":1},{\"name\":\"H2\",\"cval\":\"250\",\"x\":2,\"y\":1},{\"name\":\"H4\",\"cval\":\"2000\",\"x\":3,\"y\":1},{\"name\":\"L4\",\"cval\":\"2000\",\"x\":4,\"y\":1}],[{\"name\":\"F\",\"cval\":\"3\",\"x\":0,\"y\":2},{\"name\":\"F\",\"cval\":\"250\",\"x\":1,\"y\":2},{\"name\":\"B\",\"cval\":\"1\",\"x\":2,\"y\":2},{\"name\":\"SP\",\"cval\":\"6\",\"x\":3,\"y\":2},{\"name\":\"B\",\"cval\":\"1000\",\"x\":4,\"y\":2}],[{\"name\":\"BO\",\"cval\":\"250\",\"x\":0,\"y\":3},{\"name\":\"WF\",\"cval\":\"1000\",\"x\":1,\"y\":3},{\"name\":\"WF\",\"cval\":\"500\",\"x\":2,\"y\":3},{\"name\":\"WF\",\"cval\":\"1\",\"x\":3,\"y\":3},{\"name\":\"C\",\"cval\":\"250\",\"x\":4,\"y\":3}],[{\"name\":\"F\",\"cval\":\"500\",\"x\":0,\"y\":4},{\"name\":\"DS\",\"cval\":\"500\",\"x\":1,\"y\":4},{\"name\":\"CB\",\"cval\":\"50\",\"x\":2,\"y\":4},{\"name\":\"F\",\"cval\":\"1000\",\"x\":3,\"y\":4},{\"name\":\"FS\",\"cval\":\"25\",\"x\":4,\"y\":4}],[{\"name\":\"CTR\",\"cval\":\"1000\",\"x\":0,\"y\":5},{\"name\":\"WF\",\"cval\":\"1000\",\"x\":1,\"y\":5},{\"name\":\"WD\",\"cval\":\"10\",\"x\":2,\"y\":5},{\"name\":\"WD\",\"cval\":\"25\",\"x\":3,\"y\":5},{\"name\":\"OB\",\"cval\":\"1000\",\"x\":4,\"y\":5}]],\"header\":{\"type_info\":\"startup_symbols\",\"game_seed\":\"-1\",\"credits_before\":10000,\"credits_after\":10000,\"total_win\":0,\"bet\":100,\"currency\":\"Credits\"},\"cash_symbols\":[{\"name\":\"F\",\"cval\":\"250\",\"x\":0,\"y\":0},{\"name\":\"F\",\"cval\":\"10\",\"x\":1,\"y\":0},{\"name\":\"H1\",\"cval\":\"10\",\"x\":2,\"y\":0},{\"name\":\"H3\",\"cval\":\"250\",\"x\":3,\"y\":0},{\"name\":\"L3\",\"cval\":\"2000\",\"x\":4,\"y\":0},{\"name\":\"F\",\"cval\":\"1000\",\"x\":0,\"y\":1},{\"name\":\"F\",\"cval\":\"1\",\"x\":1,\"y\":1},{\"name\":\"H2\",\"cval\":\"250\",\"x\":2,\"y\":1},{\"name\":\"H4\",\"cval\":\"2000\",\"x\":3,\"y\":1},{\"name\":\"L4\",\"cval\":\"2000\",\"x\":4,\"y\":1},{\"name\":\"F\",\"cval\":\"3\",\"x\":0,\"y\":2},{\"name\":\"F\",\"cval\":\"250\",\"x\":1,\"y\":2},{\"name\":\"B\",\"cval\":\"1\",\"x\":2,\"y\":2},{\"name\":\"SP\",\"cval\":\"6\",\"x\":3,\"y\":2},{\"name\":\"B\",\"cval\":\"1\",\"x\":4,\"y\":2},{\"name\":\"BO\",\"cval\":\"250\",\"x\":0,\"y\":3},{\"name\":\"WF\",\"cval\":\"1000\",\"x\":1,\"y\":3},{\"name\":\"WF\",\"cval\":\"500\",\"x\":2,\"y\":3},{\"name\":\"WF\",\"cval\":\"1\",\"x\":3,\"y\":3},{\"name\":\"C\",\"cval\":\"250\",\"x\":4,\"y\":3},{\"name\":\"F\",\"cval\":\"500\",\"x\":0,\"y\":4},{\"name\":\"WF\",\"cval\":\"500\",\"x\":1,\"y\":4},{\"name\":\"WF\",\"cval\":\"50\",\"x\":2,\"y\":4},{\"name\":\"F\",\"cval\":\"1000\",\"x\":3,\"y\":4},{\"name\":\"FS\",\"cval\":\"25\",\"x\":4,\"y\":4},{\"name\":\"DS\",\"cval\":\"1000\",\"x\":0,\"y\":5},{\"name\":\"WF\",\"cval\":\"1000\",\"x\":1,\"y\":5},{\"name\":\"WD\",\"cval\":\"10\",\"x\":2,\"y\":5},{\"name\":\"WD\",\"cval\":\"25\",\"x\":3,\"y\":5},{\"name\":\"CB\",\"cval\":\"1000\",\"x\":4,\"y\":5}]}";	
	
	static DEMO_doResponse(query : string){
		//check if we simulating FG
		if(query == "spin"){
			InputMaster.getGameFromAssets();
		}else if(query == "game_finished"){
			return;
		}
		else if(query == "get_startup_symbols=true"){
			InputMaster.recieveMessage(JSON.parse(InputMaster.startup_symbols));
		}
	}
	
	//DEPRECATED
	static getGameFromAssets(param : any = null){
		//pick a random game from list of games
		//get random number between 0 and length of games list
		if(InputMaster.DEMO_ALL_GAMES == null){
			fpglobals.GLog("DEMO Games list not parsed!", log.type.EXCEPTION);
			InputMaster.DEMO_ALL_GAMES = new Object();
			InputMaster.DEMO_ALL_GAMES.data = null;
		}
		let ignoreSpinWinOnly = false;
		
		//check if we have a request for a specific game
		let request = devpanel.last_sent_request; //eg SIMSPIN=18
		let startAtStep = 0;
		let startFeatureAtStep = 0;
		
		if(request.split("|").length == 2){
			startAtStep = Number(request.split("|")[1]);
			request = request.split("|")[0];
		}else if(request.split("|").length == 3){
			startAtStep = Number(request.split("|")[1]);
			startFeatureAtStep = Number(request.split("|")[2]);
			request = request.split("|")[0];
		}
		if(request.split(",").length == 2){
			startAtStep = Number(request.split(",")[1]);
			request = request.split(",")[0];
		}else if(request.split(",").length == 3){
			startAtStep = Number(request.split(",")[1]);
			startFeatureAtStep = Number(request.split(",")[2]);
			request = request.split(",")[0];
		}
		
		
		
		if(request.includes("SIMSPIN")){
			ignoreSpinWinOnly = true;
			//split =
			let split = request.split("=");
			//get the number
			let num : any = split[1];
			//get the game type
			if(num < 0){ num= num *(-1);} //reverse to positive
			
			
			let ind = InputMaster.getFindGamePerParams(-1, false, "", num, startAtStep,devpanel.in_SPIN_WINS_ONLY_MIN_AMOUNT);
			InputMaster.getLoadGame(ind, startAtStep, startFeatureAtStep);
			return;
		}
		
		
		let pSeed = -1;
		let pIndex = -1;
		let pFeature = 0;
		
		if(devpanel.last_sent_request.includes("index") || devpanel.last_sent_request.includes("seed")){
			//split the request by "="
			let split = devpanel.last_sent_request.split("=");
			//get the seed
			let seed = split[1];
			
			if(seed.split("|").length == 2){
				startAtStep = Number(seed.split("|")[1]);
				seed = seed.split("|")[0];
			}else if(seed.split("|").length == 3){
				startAtStep = Number(seed.split("|")[1]);
				startFeatureAtStep = Number(seed.split("|")[2]);
				seed = seed.split("|")[0];
			}
			if(seed.split(",").length == 2){
				startAtStep = Number(seed.split(",")[1]);
				seed = seed.split(",")[0];
			}else if(seed.split(",").length == 3){
				startAtStep = Number(seed.split(",")[1]);
				startFeatureAtStep = Number(seed.split(",")[2]);
				seed = seed.split(",")[0];
			}
			if(devpanel.last_sent_request.includes("seed")){
				pSeed = Number(seed);
			}else{
				pIndex = Number(seed); //INDEX SEARCH IS DEPRECATED
				fpglobals.GLog("INDEX SEARCH IS DEPRECATED query:" + devpanel.last_sent_request, log.type.ERROR);
			}
		}
		
		
		
		let gameIndex = InputMaster.getFindGamePerParams(
			pSeed,
			devpanel.cb_SPIN_WINS_ONLY,
			"", //TODO
			pFeature,
			startAtStep,
			devpanel.in_SPIN_WINS_ONLY_MIN_AMOUNT
		);
		InputMaster.getLoadGame(gameIndex, startAtStep, startFeatureAtStep);
		
		
		return;
	}
	
	public static parseGamesList(){
		InputMaster.DEMO_ALL_GAMES = Macro.getResourceByName("gameslibrary");
		if(InputMaster.DEMO_ALL_GAMES == undefined){
			fpglobals.GLog(
					"DEMO GAMES LIBRARY MISSING! ",
						log.type.EXCEPTION);
		}else if(InputMaster.DEMO_ALL_GAMES.error){
			fpglobals.GLog(
				"DEMO GAMES LIBRARY ERROR: " + InputMaster.DEMO_ALL_GAMES.error.message,
					log.type.EXCEPTION);
		}
		
		fpglobals.GLog("DEMO GAMES LIBRARY list parsed!", log.type.IMPORTANT);
		
		
		
		return;
		//DEPRECATED
		InputMaster.DEMO_ALL_GAMES = Macro.getResourceByName("games");
		
		if(InputMaster.DEMO_ALL_GAMES == undefined){
			fpglobals.GLog(
					"DEMO Games MISSING! ",
						log.type.EXCEPTION);
		}else if(InputMaster.DEMO_ALL_GAMES.error){
			fpglobals.GLog(
				"DEMO Games MISSING! ERR: " + InputMaster.DEMO_ALL_GAMES.error.message,
					log.type.EXCEPTION);
		}
		
		fpglobals.GLog("DEMO Games list parsed!", log.type.IMPORTANT);
		return;
	}
	
	public static getFindGamePerParams(seed = -1, winOnly = false, fstReq = "", ftr = 0, iterateToStep = -1, minWinAmount = 0){
		//if all default we pick at random
		if(seed != -1){
			//search by seed
			for(let i = 0; i < InputMaster.DEMO_ALL_GAMES.data.gameslibrary.length; i++){
				let game = (InputMaster.DEMO_ALL_GAMES.data.gameslibrary[i]);
				let game_seed = Number(game.sd);
				if(game_seed == Number(seed)){
					return i;
				}
			}
		}
		if(ftr != 0){
			let eligibleGames = new Array<any>();
			//search by feature
			for(let i = 0; i < InputMaster.DEMO_ALL_GAMES.data.gameslibrary.length; i++){
				let game = (InputMaster.DEMO_ALL_GAMES.data.gameslibrary[i]);
				let game_feature = Number(game.fg);
				if(game_feature == Number(ftr)){
					//return i;
					eligibleGames.push(i);
				}else if(ftr == 1){
					//any bonus game
					if(game_feature > 0){
						eligibleGames.push(i);
					}
				}
			}
			if(eligibleGames.length > 0){
				//return random game
				return eligibleGames[Math.floor(Math.random() * eligibleGames.length)];
			}
		}
		if(Number.isNaN(minWinAmount)){
			minWinAmount = 10;
		}
		while(true){
		
			//if no other requirements, do random search
			let len = InputMaster.DEMO_ALL_GAMES.data.gameslibrary.length-1;
			let rand = Math.floor(Math.random() * len);
			
			if(winOnly){ 
				let game = (InputMaster.DEMO_ALL_GAMES.data.gameslibrary[rand]);
				if(game!=undefined){
					if(game.w == "0"){
						continue; //search further
					}else{
						if(game.w > minWinAmount){
							return rand;
						}else{
							continue;
						}
						//get minimum win amount
						
					}
				}else {continue;}
			}
			
			return rand;
		}
		
		
		
		//returns game index in the list
		return 0;
	}
	
	public static getLoadGame(index: number, startAtStep: number = 0, startFeatureAtStep: number = 0) {
		// index in our games library
		let game = (InputMaster.DEMO_ALL_GAMES.data.gameslibrary[index]);
	
		// load from server
		let loadurl = "./games/block_" + game.bl + ".json";
		
		
	
		fetch(loadurl)
			.then(response => response.json())
			.then(data => {
				// The file has been loaded and parsed as JSON
				// Call the callback function with the data
				for(let i = 0; i < data.games.length; i++){
					let parsedGame = JSON.parse(data.games[i]);
					if(Number(parsedGame.header.game_seed) == game.sd){
						InputMaster.recieveMessage(parsedGame, startAtStep, startFeatureAtStep);
						return;
					}
				}
				fp_error.onerror('Game not found:', game);
			})
			.catch(error => {
				// Handle any errors
				fp_error.onerror('Error:', error);
			});
	}
	
	
	
	public static getSearchGamePerSeed(seed : string) : any{
		//HERE WE MATCH THE SEED TO THE GAME IN BLOCK FINDER
		return 0;
		//DEPRECATED
		for(let i = 0; i < InputMaster.DEMO_ALL_GAMES.data.games.length; i++){
			let game = JSON.parse(InputMaster.DEMO_ALL_GAMES.data.games[i]);
			let game_seed = Number(game.header.game_seed);
			if(game_seed == Number(seed)){
				return i;
			}
		}
		//not found return 0
		fpglobals.GLog("No game found for seed: " + seed, log.type.ERROR);
		return 0;
	} 
	
	
	
	
	
}




/* Copyright FP 2022 */