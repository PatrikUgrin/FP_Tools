import { InputMaster } from "./InputMaster";
import { spin } from "../reelspin/BaseGame/spin";
import { devpanel } from "./dev/devpanel";
import { fpglobals } from "./fpglobals";
import { fp_error } from "./fp_error";
import { fp_loading, LOADING_TYPE } from "./fp_loading";
import { log } from "../globals/dev/log";

//import {WebSocket, MessageEvent} from "ws";

export class FPNetwork{
	//Socket.IO in C# TODO
	public static useWebSocket = true;
	
	//static wsUri = "ws://127.0.0.1/";
	static wsUri = "ws://192.168.0.169/";
	static wsUri_alt = "ws://192.168.2.124/";
	//static wsUri = "ws://192.168.0.184/";
	//static wsUri = "ws://127.0.0.1/";
	public static wbs : WebSocket;
	
	public static game_in_progress = false;
	
	public static isDEMOConnection = false;
	public static DEMO_IPS = [
		"ws://127.0.0.1/",
		this.wsUri+ ":80",
		this.wsUri_alt+ ":80",
		this.wsUri + ":8080",
		this.wsUri_alt + ":8080",
		this.wsUri + ":8000",
		this.wsUri_alt + ":8000",
		this.wsUri + ":4433",
		this.wsUri + ":8443",
		this.wsUri + ":443",
		
	
	];
	
	public static __DEMOConnectLocalNetwork(){
	//	fp_loading.try_start_games(LOADING_TYPE.NETWORK);
//		return;
		//let address = this.wsUri;
		this.isDEMOConnection = true;
		let address = this.DEMO_IPS[0];
		this.wsUri = address;
		
		
		
		FPNetwork.wbs = new WebSocket(address); //native websocket?
		FPNetwork.wbs.onopen = FPNetwork.onWebSocketConnect;
		FPNetwork.wbs.onclose = FPNetwork.onWebsocketConnectionLostConnection;
		FPNetwork.wbs.onmessage = FPNetwork.onWebSocketMessage;
		FPNetwork.wbs.onerror = FPNetwork.onWebsocketError;
	}
	
	public static DEMOConnectLocalNetwork() {
		this.isDEMOConnection = true;
		if(devpanel.DEMO_MODE){
			fp_loading.try_start_games(LOADING_TYPE.NETWORK);
			InputMaster.getStartupSymbolDataset();
			return;
		}
		
		let wsIndex = 0;
		function connectToWebSocket() {
			const address = FPNetwork.DEMO_IPS[wsIndex];
			FPNetwork.wsUri = address;
			FPNetwork.wbs = new WebSocket(address);
			FPNetwork.wbs.onopen = FPNetwork.onWebSocketConnect;
		//	FPNetwork.wbs.onclose = FPNetwork.onWebsocketConnectionLostConnection;
			FPNetwork.wbs.onmessage = FPNetwork.onWebSocketMessage;
		//	FPNetwork.wbs.onerror = FPNetwork.onWebsocketError;
	
			// Set a timeout of 5 seconds for the WebSocket connection
			const timeout = 1000;
			let timerId = setTimeout(() => {
				// If the connection has not been established after the timeout, close the WebSocket and try the next IP
				FPNetwork.wbs.close();
				wsIndex++;
				if (wsIndex < FPNetwork.DEMO_IPS.length) {
					connectToWebSocket();
				}
			}, timeout);
	
			FPNetwork.wbs.onopen = () => {
				// If the connection is established before the timeout, clear the timeout and continue as normal
				clearTimeout(timerId);
				FPNetwork.onWebSocketConnect();
			}
		}
	
		connectToWebSocket();
	}
	
	
	
	
	
	// SPINS
	static requestSpin(){
		if(devpanel.DEMO_MODE){
			FPNetwork.sendToWBS("spin");
			return;
		}
		if(!FPNetwork.game_in_progress){
			FPNetwork.sendToWBS("spin");
		}else{
			fpglobals.GLog("Spin request denied, game in progress", log.type.ERROR);
		}
		FPNetwork.game_in_progress = true;
	}
	static sendGameFinished(){
		FPNetwork.sendToWBS("game_finished");
		FPNetwork.game_in_progress = false;
	}
	
	
	// NETWORK
	static sendToWBS(msg : string){ //return promise?
		if(devpanel.DEMO_MODE){
			fpglobals.GLog("[LOG] DEMO MODE, DIDNT SEND:" + msg, log.type.IMPORTANT);
			InputMaster.DEMO_doResponse(msg);
			return;
		}
		try{
			
			//rc4.encrypt(msg);
			FPNetwork.wbs.send(msg);
		}
		catch (e : any){
			let err = e;
			this.onWebsocketError(e);
			//fpglobals.GLog(e.toString());
		}
	}
	
	public static sendDeveloperMessage(mssg : string){
		if(devpanel.DEVELOPER_MODE){
			fpglobals.GLog("[LOG] SENT TO GS:" + mssg, log.type.IMPORTANT);
			FPNetwork.sendToWBS(mssg);
		}
	}
	
	static onWebSocketConnect(){
		fpglobals.GLog("CONNECTION ESTABLISHED with server: " + FPNetwork.wsUri, log.type.VERBOSE);
		fp_loading.try_start_games(LOADING_TYPE.NETWORK);
		
		//sending init string
		//FPNetwork.wbs.send("game=bass&device=web&version=0.0.1");
		InputMaster.getStartupSymbolDataset();
		
		//test
//		fp_error.onerror("TEST ERROR");
	}
	
	static onWebSocketMessage(msg : MessageEvent){
		//if we recieve message back, we can continue
		fpglobals.GLog("[LOG] RECEIVED FROM GS:" + msg.data.toString(), log.type.SPIN);
		//process message
		
		let obj; //message from GS
		
		//if message is response to our init string, we can continue
		try{
			obj = JSON.parse(msg.data);
			InputMaster.recieveMessage(obj);
		}catch(e){
			fpglobals.GLog(e, log.type.ERROR);
		}
		
		
		//fpglobals.GLog(msg.data,false);
	}
	
	
	public static LogToGS(msg : string){
		fpglobals.GLog("[LOG] SENT TO GS:" + msg, log.type.IMPORTANT);
		//FPNetwork.wbs.send(msg);
		FPNetwork.sendToWBS(msg);
	}
	
	public static onWebsocketConnectionLostConnection(){
		fpglobals.GLog("CONNECTION LOST", log.type.VERBOSE);
		fpglobals.GLog("RE-CONNECTING", log.type.VERBOSE);
		FPNetwork.DEMOConnectLocalNetwork();
	}
	
	
	public static onWebsocketError(err : any){
		fpglobals.GLog("ERROR IN WEBSOCKETS : " + err.toString(), log.type.ERROR); //TODO handle error
		fp_error.onerror("CONNECTION ERROR");
	}
	
	
	
	
	//ENCRYPTION
//	public static encrypt(r : string, t : string){
//		
//	}
	
	
	
	
	
	
	
	
}


/* references
https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_server




<!doctype html>
<style>
    textarea { vertical-align: bottom; }
    #output { overflow: auto; }
    #output > p { overflow-wrap: break-word; }
    #output span { color: blue; }
    #output span.error { color: red; }
</style>
<h2>WebSocket Test</h2>
<textarea cols=60 rows=6></textarea>
<button>send</button>
<div id=output></div>
<script>
  // http://www.websocket.org/echo.html

  const button = document.querySelector("button");
  const output = document.querySelector("#output");
  const textarea = document.querySelector("textarea");
  const wsUri = "ws://127.0.0.1/";
  const websocket = new WebSocket(wsUri);

  button.addEventListener("click", onClickButton);

  websocket.onopen = (e) => {
    writeToScreen("CONNECTED");
    doSend("WebSocket rocks");
  };

  websocket.onclose = (e) => {
    writeToScreen("DISCONNECTED");
  };

  websocket.onmessage = (e) => {
    writeToScreen(`<span>RESPONSE: ${e.data}</span>`);
  };

  websocket.onerror = (e) => {
    writeToScreen(`<span class=error>ERROR:</span> ${e.data}`);
  };

  function doSend(message) {
    writeToScreen(`SENT: ${message}`);
    websocket.send(message);
  }

  function writeToScreen(message) {
    output.insertAdjacentHTML("afterbegin", `<p>${message}</p>`);
  }

  function onClickButton() {
    const text = textarea.value;

    text && doSend(text);
    textarea.value = "";
    textarea.focus();
  }
</script>


*/