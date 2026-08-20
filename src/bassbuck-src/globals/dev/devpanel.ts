import { fpglobals } from "../fpglobals";
import { FPNetwork } from "../FPNetwork";
import { fp_error } from "../fp_error";
import { spin } from "../../reelspin/BaseGame/spin";
import { screenResizeHandler } from "../../window/screenResizeHandler";
import { benchmark } from "./benchmark";
import { log } from "../dev/log";
import { Macro } from "../Macro";
import { getOutputAllDeviceInfo } from "../device";
import { SPIN_EVENT, UI_EVENT } from "../events";
import { Point } from "pixi.js";
import { SoundDirector } from "../audio/SoundDirector";
import { WinValue } from "../numbers/accounting/WinValue";
import { performance_devpanel } from "./performance_devpanel";
import { lw_sort_devpanel } from "./lw_sort_devpanel";
import { BonusEndScreen } from "../../reelspin/WinElements/BonusEndScreen";

//Developer panel, debug testing, etc
export class devpanel{
	public static DEVELOPER_MODE : boolean = false;
	private static URI : string;
	
	private static regbar_holder : HTMLElement;
	public static devpanel_html : any;
	
	public static DEMO_MODE : boolean = false;
	
	public static last_sent_request = "";
	
	public static LAST_SEED = 0;
	public static LAST_INDEX = 0;
	
	private static test_bonus_end_screen : BonusEndScreen | null = null;
	
	public static isLocalHost(){
		return this.URI.search("localhost") != -1;
	}
	
	
	//CHECK BOXES
	public static cb_SPIN_WINS_ONLY = false; //when spinning only wins will be shown 
	public static in_SPIN_WINS_ONLY_MIN_AMOUNT = 100; //when spinning only wins with min win amount will be shown 
	
	public static setMode(uri :string){
		this.URI = uri;
		if(uri.search("damslo") != -1 || uri.search("freshproduce") != -1){
			this.DEMO_MODE = true;
			this.DEVELOPER_MODE = true;
		}else{
			if(uri.search("devpanel") != -1){
				this.DEVELOPER_MODE = true;
			}else{
				this.DEVELOPER_MODE = false;
				//remove devpanel element from html
			}
		}
	}
	
	// Function to fetch the version information from version.txt
	private static getVersionInfo(callback: (versionInfo: string) => void) {
		fetch('version.txt')
			.then(response => response.text())
			.then(versionInfo => {
				callback(versionInfo);
			})
			.catch(error => {
				console.error('Error fetching version information:', error);
				callback('Version information not available');
			});
	}
	
	public static writeDevInfo(){
		//either case, we check for device info and output it to infopanel for now
		//TODO disable in production
		let gameinfo = document.getElementById("help_holder");
		if(gameinfo){
			let devinfo = (gameinfo as any).contentDocument.getElementById("devinfo");
			if(devinfo){
				// Fetch version information and update devinfo.innerText
				devpanel.getVersionInfo((versionInfo) => {
					devinfo.style.visibility = "visible";
					devinfo.innerText = '\nVersion Info:\n' + 
						screenResizeHandler.getScalarDebugInfo() + 
						versionInfo+
						getOutputAllDeviceInfo();
				});
			}
		}
	}
	private static ranDEMOseed = false;
	public static doAfterLoadActions(){
		if(devpanel.ranDEMOseed){ return; }
		devpanel.ranDEMOseed = true;
		
		// Check if devpanel is initialized before trying to use it
		if (!devpanel.devpanel_html) {
			fpglobals.GLog("devpanel.doAfterLoadActions: devpanel not initialized yet, skipping seed setup", 'WARNING');
			return;
		}
		
		//get params
		let seed = fpglobals.getURIParamValue("seed");
		if(seed.toString() == "false"){
			
		}else{
			devpanel.setInputTo("seed=" + seed, true, 2);
		}
		
	}
	
	public static init(){
		
		devpanel.writeDevInfo();
		
		//get if this is safari browser
		let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
		if(isSafari){
			this.DEVELOPER_MODE = false;
		}
		
		if(this.DEVELOPER_MODE == false){
			let devpanel = document.getElementById("devpanel");
			if(devpanel){
				devpanel.remove();
			}
			return;
		}
		let ___devpanel : any = document.getElementById("devpanel");
		if(!___devpanel){
			fpglobals.GLog("devpanel.init: devpanel not found", 'WARNING');
			return;
		}

		
		
		//bind click to regbar_holder on click to show/hide dev panel
		devpanel.regbar_holder = document.getElementById("regbar_holder")!;
		if(!devpanel.regbar_holder){
			fp_error.onerror("devpanel.regbar_holder is null");
			return;
		}
		devpanel.devpanel_html = document.getElementById("devpanel")!;
		if(!devpanel.devpanel_html){
			fp_error.onerror("devpanel.devpanel is null");
			return;
		}
		
		devpanel.devpanel_html = (devpanel.devpanel_html as any).contentDocument;
		
		// Initialize performance devpanel
		performance_devpanel.init(devpanel.devpanel_html);
		
		// Initialize Lunker Wave Sort Simulator devpanel
		lw_sort_devpanel.init(devpanel.devpanel_html);
		
		// Expose devpanel methods to global scope for HTML access
		(window as any).devpanel = {
			onTabSwitch: devpanel.onTabSwitch,
			getPerformanceStats: devpanel.getPerformanceStats,
			refreshGpuTextures: devpanel.refreshGpuTextures
		};
		
		
		//window.addEventListener('keydown', function(event) {
		//	if(event.key == "Alt"){
		//		devpanel.showHideDevPanel();
		//	}
		//});
		window.addEventListener('keyup', function(event: KeyboardEvent) {
			if(event.key == "q"){
				devpanel.showHideDevPanel();
			}
			if(event.key == "Escape"){
				devpanel.showHideDevPanel();
			}
		});
		devpanel.devpanel_html.addEventListener('keyup', function(event: KeyboardEvent) {
			if(event.key == "q"){
				devpanel.showHideDevPanel();
			}
			if(event.key == "Escape"){
				devpanel.showHideDevPanel();
			}
		});
		
		let output_el = devpanel.devpanel_html.getElementById("output-list") as HTMLUListElement;
		if(output_el){
			let devdesc = Macro.getResourceByName("devdesc");
			if(devdesc != undefined){
				// Store the original content for filtering
				const originalContent = devdesc.data;
				
				// Function to populate the list without animations
				const populateList = (content: string) => {
					// Clear existing items
					output_el.innerHTML = '';
					
					const lines = content.split('\n');
					
					// Group lines by their starting number
					const groups: { [key: string]: string[] } = {};
					const nonNumberLines: string[] = [];
					
					lines.forEach(line => {
						const trimmedLine = line.trim();
						if (trimmedLine === '') return; // Skip empty lines
						
						const firstWord = trimmedLine.split(/\s+/)[0];
						if (!isNaN(Number(firstWord))) {
							// If it's a number, add to appropriate group
							if (!groups[firstWord]) {
								groups[firstWord] = [];
							}
							groups[firstWord].push(trimmedLine);
						} else {
							// If not a number, add to non-number lines
							nonNumberLines.push(trimmedLine);
						}
					});
					
					// First add all number groups with separators
					let isFirstGroup = true;
					Object.keys(groups).sort((a, b) => Number(a) - Number(b)).forEach(groupKey => {
						const groupLines = groups[groupKey];
						
						// Add separator between groups (except for the first one)
						if (!isFirstGroup) {
							const separator = document.createElement('li');
							separator.classList.add('group-separator');
							output_el.appendChild(separator);
						} else {
							isFirstGroup = false;
						}
						
						// Add group header with game information
						const groupHeader = document.createElement('li');
						groupHeader.classList.add('group-header');
						
						// Try to find game info in the gameslibrary only
						let gameInfo = { seed: groupKey, win: "?", fg: "0", bgSteps: "?", fgSteps: "?" };
						
						try {
							// Get the gameslibrary resource
							const gamesLibrary = Macro.getResourceByName("gameslibrary");
							if (gamesLibrary && gamesLibrary.data && gamesLibrary.data.gameslibrary) {
								// Find the game with matching seed
								const game = gamesLibrary.data.gameslibrary.find((g: any) => 
									Number(g.sd) === Number(groupKey)
								);
								
								if (game) {
									gameInfo.win = game.w || "0";
									gameInfo.fg = game.fg || "0";
									// Note: Step counts are not available from gameslibrary only
									// bgSteps and fgSteps remain as "?" since we're not loading game blocks
								}
							}
						} catch (e) {
							console.error("Error finding game info:", e);
						}
						
						// Create the header content with game info
						groupHeader.setAttribute('data-seed', groupKey);
						devpanel.createGameInfoHeader(groupHeader, gameInfo);
						output_el.appendChild(groupHeader);
						
						// Add group items
						groupLines.forEach(line => {
							const li = document.createElement('li');
							li.textContent = line;
							li.classList.add('number-line');
							
							// Add click handler
							li.addEventListener('click', () => {
								const seedInput = devpanel.devpanel_html.getElementById("devpanel_input_1") as HTMLInputElement;
								if (seedInput) {
									seedInput.value = `seed=${groupKey}`;
								}
							});
							
							// Add double-click handler to send to RGS
							li.addEventListener('dblclick', () => {
								const seedInput = devpanel.devpanel_html.getElementById("devpanel_input_1") as HTMLInputElement;
								if (seedInput) {
									seedInput.value = `seed=${groupKey}`;
									// Trigger the same action as clicking "SEND TO RGS" button
									devpanel.sendInput(seedInput.value);
								}
							});
							
							output_el.appendChild(li);
						});
					});
					
					// If we have both number groups and non-number lines, add a separator
					if (Object.keys(groups).length > 0 && nonNumberLines.length > 0) {
						const separator = document.createElement('li');
						separator.classList.add('group-separator');
						output_el.appendChild(separator);
					}
					
					// Then add all non-number lines
					nonNumberLines.forEach(line => {
						const li = document.createElement('li');
						li.textContent = line;
						
						// Add double-click handler for non-number lines too
						li.addEventListener('dblclick', () => {
							// For non-number lines, we'll use the second input field
							const eventInput = devpanel.devpanel_html.getElementById("devpanel_input_2") as HTMLInputElement;
							if (eventInput && line.includes('=')) {
								eventInput.value = line;
								// Trigger the same action as clicking "SEND TO RGS" button for the second input
								devpanel.sendInput(eventInput.value);
							}
						});
						
						output_el.appendChild(li);
					});
				};
				
				// Initial population
				populateList(originalContent);
				
				// Get the filter elements
				const filterBox = devpanel.devpanel_html.getElementById("filter-box") as HTMLInputElement;
				const clearFilterBtn = devpanel.devpanel_html.getElementById("clear-filter") as HTMLButtonElement;
				const freeGamesCheckbox = devpanel.devpanel_html.getElementById("filter-freegames") as HTMLInputElement;
				const baseGamesCheckbox = devpanel.devpanel_html.getElementById("filter-basegames") as HTMLInputElement;
				const winAmountSelect = devpanel.devpanel_html.getElementById("win-amount-select") as HTMLSelectElement;
				
				// Simple debouncing for filter functions
				let filterTimeout: NodeJS.Timeout | null = null;
				
				// Function to apply all filters with debouncing
				const applyFilters = () => {
					// Clear existing timeout
					if (filterTimeout) {
						clearTimeout(filterTimeout);
					}
					
					// Debounce the actual filter application
					filterTimeout = setTimeout(() => {
						applyFiltersImmediate();
						filterTimeout = null;
					}, 50); // Fast debounce
				};
				
				// Immediate filter application function
				const applyFiltersImmediate = () => {
					let filteredContent = originalContent;
					
					// Apply text filter — match by game group so all features of a matching game are shown
					const filterText = filterBox.value.trim().toLowerCase();
					if (filterText !== '') {
						const lines = filteredContent.split('\n');
						
						// Group lines by seed number
						const seedGroups: { [seed: string]: string[] } = {};
						const nonSeedLines: string[] = [];
						const seedOrder: string[] = [];
						
						lines.forEach((line: string) => {
							const trimmed = line.trim();
							if (trimmed === '') return;
							const firstWord = trimmed.split(/\s+/)[0];
							if (!isNaN(Number(firstWord))) {
								if (!seedGroups[firstWord]) {
									seedGroups[firstWord] = [];
									seedOrder.push(firstWord);
								}
								seedGroups[firstWord].push(line);
							} else {
								nonSeedLines.push(line);
							}
						});
						
						// Include entire seed group if ANY line in the group matches the query
						const filteredLines: string[] = [];
						seedOrder.forEach((seed) => {
							const group = seedGroups[seed];
							const groupMatches = group.some((l: string) => l.toLowerCase().includes(filterText));
							if (groupMatches) {
								filteredLines.push(...group);
							}
						});
						
						// Non-seed lines are still filtered individually
						nonSeedLines.forEach((line: string) => {
							if (line.toLowerCase().includes(filterText)) {
								filteredLines.push(line);
							}
						});
						
						filteredContent = filteredLines.join('\n');
					}
					
					// Apply game type filters and win amount filter
					const showFreeGamesOnly = freeGamesCheckbox.checked;
					const showBaseGamesOnly = baseGamesCheckbox.checked;
					const minWinAmount = parseInt(winAmountSelect.value);
					
					if (showFreeGamesOnly || showBaseGamesOnly || minWinAmount > 0) {
						const lines = filteredContent.split('\n');
						const filteredLines: string[] = [];
						
						lines.forEach((line: string) => {
							const trimmedLine = line.trim();
							if (trimmedLine === '') {
								filteredLines.push(line);
								return;
							}
							
							// Check if line starts with a number (game seed)
							const firstWord = trimmedLine.split(/\s+/)[0];
							if (!isNaN(Number(firstWord))) {
								// This is a seed line, check game type based on gameslibrary data
								try {
									const gamesLibrary = Macro.getResourceByName("gameslibrary");
									if (gamesLibrary && gamesLibrary.data && gamesLibrary.data.gameslibrary) {
										const game = gamesLibrary.data.gameslibrary.find((g: any) => 
											Number(g.sd) === Number(firstWord)
										);
										
										if (game) {
											const hasFreeGames = game.fg && Number(game.fg) > 0;
											const baseWinAmount = game.w ? Number(game.w) : 0;
											// Convert free game multiplier to credits for proper comparison
											const freeGameWinAmount = game.fg ? WinValue.fromMultiplier(Number(game.fg)).credits : 0;
											
											// Check win amount filter based on checkbox state
											let passesWinFilter = true;
											if (minWinAmount > 0) {
												if (showFreeGamesOnly && !showBaseGamesOnly) {
													// Filter by FG win amount only
													passesWinFilter = freeGameWinAmount >= minWinAmount;
												} else if (showBaseGamesOnly && !showFreeGamesOnly) {
													// Filter by base game win amount only
													passesWinFilter = baseWinAmount >= minWinAmount;
												} else {
													// Filter by total win amount (both checked or neither checked)
													const totalWinAmount = baseWinAmount + freeGameWinAmount;
													passesWinFilter = totalWinAmount >= minWinAmount;
												}
											}
											
											// Check game type filters
											let passesTypeFilter = true;
											if (showFreeGamesOnly && !showBaseGamesOnly) {
												// Show only free games
												passesTypeFilter = hasFreeGames;
											} else if (showBaseGamesOnly && !showFreeGamesOnly) {
												// Show only base games (games without free games)
												passesTypeFilter = !hasFreeGames;
											} else if (showFreeGamesOnly && showBaseGamesOnly) {
												// Show all games if both are checked
												passesTypeFilter = true;
											}
											
											// Include line only if it passes both filters
											if (passesWinFilter && passesTypeFilter) {
												filteredLines.push(line);
											}
										} else {
											// If game not found in library, include it
											filteredLines.push(line);
										}
									} else {
										// If no library data, include the line
										filteredLines.push(line);
									}
								} catch (e) {
									// If error, include the line
									filteredLines.push(line);
								}
							} else {
								// Non-seed lines, always include
								filteredLines.push(line);
							}
						});
						
						filteredContent = filteredLines.join('\n');
					}
					
									// Update the list with filtered content
				animatedFilterUpdate(filteredContent);
				};
				
				// Simple filter update function
				const animatedFilterUpdate = (newContent: string) => {
					// Immediate update without animations
					populateList(newContent);
				};
				
				if(filterBox && clearFilterBtn && freeGamesCheckbox && baseGamesCheckbox && winAmountSelect) {
					
					// Add input event listener to filter content
					filterBox.addEventListener('input', applyFilters);
					
					// Add checkbox event listeners
					freeGamesCheckbox.addEventListener('change', applyFilters);
					baseGamesCheckbox.addEventListener('change', applyFilters);
					
					// Add select event listener
					winAmountSelect.addEventListener('change', function() {
						applyFilters();
					});
					
					// Add click event listener to clear button
					clearFilterBtn.addEventListener('click', function() {
						filterBox.value = '';
						freeGamesCheckbox.checked = false;
						baseGamesCheckbox.checked = false;
						winAmountSelect.value = '0';
						populateList(originalContent);
						filterBox.focus();
					});
				}
			}
		}
		
		// Call the function to populate the list
		devpanel.populateListWithSpinEvents();
		
		{
			//get checkbox by id and bind to function
			let cb_spinwin = devpanel.devpanel_html.getElementById("spin_win_only") as HTMLInputElement;
			if(cb_spinwin != null){
				cb_spinwin.addEventListener('change', function() {
					devpanel.cb_SPIN_WINS_ONLY = cb_spinwin.checked;
					//get id checkbox_wrapper_spinwin
					let cb_wrapper_spinwin = devpanel.devpanel_html.getElementById("checkbox_wrapper_spinwin") as HTMLElement;
					//if checked, change background color
					if(cb_wrapper_spinwin != null){
						if(devpanel.cb_SPIN_WINS_ONLY){
							cb_wrapper_spinwin.style.backgroundColor = "red";
						}
						else{
							cb_wrapper_spinwin.style.backgroundColor = "white";
						}
					}
				});
			}
		}
		{
			//get numebr input by id and bind to function
			let in_spin_win_min_amount = devpanel.devpanel_html.getElementById("spin_win_only_min_amount") as HTMLInputElement;
			if(in_spin_win_min_amount != null){
				in_spin_win_min_amount.addEventListener('change', function() {
					devpanel.in_SPIN_WINS_ONLY_MIN_AMOUNT = (in_spin_win_min_amount! as any).valueAsNumber;
				});
			}
		}
		
		//bind devpanel buttons
		
		let eventName = "pointerdown";
		
		//devpanel.regbar_holder.onclick = devpanel.showHideDevPanel;		
		devpanel.regbar_holder.onclick = (ev: MouseEvent) => devpanel.showHideDevPanel();
		
		//get all HTMLElements with class "sim_btn"
		
		let sim_btns = devpanel.devpanel_html.getElementsByClassName("sim_btn");
		let func_btns = devpanel.devpanel_html.getElementsByClassName("func_btn");
		let send_btns = devpanel.devpanel_html.getElementsByClassName("send_btn");
		
		for(let i = 0; i < sim_btns.length; i++){
			let btn = sim_btns[i] as HTMLElement;
			//btn.onmousedown = devpanel.onClick;
			//btn.addEventListener(eventName, function(){devpanel.onClick(btn.id)});
			btn.addEventListener(eventName, function(){devpanel.sendInput(btn.id)});
		}
		for(let i = 0; i < sim_btns.length; i++){
			let btn = sim_btns[i] as HTMLElement;
			//btn.onmousedown = devpanel.onClick;
			btn.addEventListener(eventName, function(){devpanel.sendInput("")});
		}
		
		for(let i = 0; i < func_btns.length; i++){
			let btn = func_btns[i] as HTMLElement;
			//btn.onmousedown = devpanel.onClick;
			btn.addEventListener(eventName, function(){devpanel.doFuncBtn(btn.id)});
		}
		
		for(let i = 0; i < send_btns.length; i++){
			let btn = send_btns[i] as HTMLElement;
			//btn.onmousedown = devpanel.onClick;
			btn.addEventListener(eventName, function(){
				if(btn.id == "repeat"){devpanel.sendInput("", btn.id); return;}
				let toSearch = "devpanel_" +btn.id;
				let input = devpanel.devpanel_html.getElementById(toSearch) as HTMLInputElement;
				let toSend = input.value;
				devpanel.sendInput(toSend, btn.id);
			});
		}
		
		// Download Spin Dataset button
		{
			const downloadBtn = devpanel.devpanel_html.createElement("button") as HTMLButtonElement;
			downloadBtn.textContent = "Download Spin Dataset";
			downloadBtn.style.cssText = "margin:4px;padding:4px 10px;cursor:pointer;background:#2a6;color:#fff;border:1px solid #185;border-radius:3px;font-size:12px;";
			downloadBtn.addEventListener(eventName, () => {
				const instance = spin.getSpinInstance();
				if (instance && instance.current_spin_dataset) {
					spin.downloadSpinDatasetAsJSON(instance.current_spin_dataset);
				} else {
					fpglobals.GLog("devpanel: No spin dataset available to download", 'WARNING');
				}
			});
			const funcBtnContainer = devpanel.devpanel_html.querySelector(".func_btn")?.parentElement;
			if (funcBtnContainer) {
				funcBtnContainer.appendChild(downloadBtn);
			} else {
				devpanel.devpanel_html.body.appendChild(downloadBtn);
			}
		}
		
		let inputpanel1 = devpanel.devpanel_html.getElementById('devpanel_input_1');
		inputpanel1.addEventListener('keydown', function(event: KeyboardEvent) {
			if (event.key === 'Enter') {
			   //simulate send to rgs
			   devpanel.sendInput(inputpanel1.value);
			}
		});
		let inputpanel2 = devpanel.devpanel_html.getElementById('devpanel_input_2');
		inputpanel2.addEventListener('keydown', function(event: KeyboardEvent) {
			if (event.key === 'Enter') {
			   //simulate send to rgs
			   devpanel.sendInput(inputpanel2.value);
			}
		});
		
		devpanel.setupSpawnCounterPeek();
	}
	
	//while hovering the spawn-counter button, dim the whole panel except the integer field and the spawn button
	//so the spawned counter behind the panel can be previewed without losing access to those two controls
	private static setupSpawnCounterPeek(){
		const doc = devpanel.devpanel_html;
		if(!doc){ return; }
		const body = doc.body as HTMLElement;
		const spawnBtn = doc.getElementById("spawn_test_counter") as HTMLElement;
		const intInput = doc.getElementById("int_input") as HTMLElement;
		if(!body || !spawnBtn || !intInput){ return; }
		
		const PEEK_OPACITY = "0.08";
		
		//collect the elements that must stay fully visible plus their ancestors up to <body>
		const keepPath = new Set<Element>();
		[spawnBtn, intInput].forEach((el) => {
			let node : Element | null = el;
			while(node && node !== body){
				keepPath.add(node);
				node = node.parentElement;
			}
		});
		
		const dimmed : HTMLElement[] = [];
		const applyDim = (node: Element) => {
			Array.from(node.children).forEach((child) => {
				if(keepPath.has(child)){
					//on the path to a kept control: keep visible but dim its other children
					applyDim(child);
				}else{
					const he = child as HTMLElement;
					he.style.transition = "opacity 0.15s ease";
					he.style.opacity = PEEK_OPACITY;
					dimmed.push(he);
				}
			});
		};
		const clearDim = () => {
			dimmed.forEach((he) => { he.style.opacity = ""; });
			dimmed.length = 0;
		};
		
		spawnBtn.addEventListener("mouseenter", () => { clearDim(); applyDim(body); });
		spawnBtn.addEventListener("mouseleave", clearDim);
	}
	
	private static setInputTo(value: string, send = false, inputbox = 1){
		if (!devpanel.devpanel_html) {
			fpglobals.GLog("devpanel.setInputTo: devpanel_html is not initialized", 'WARNING');
			return;
		}
		
		let input = devpanel.devpanel_html.getElementById("devpanel_input_" + inputbox.toString()) as HTMLInputElement;
		if (!input) {
			fpglobals.GLog("devpanel.setInputTo: input element not found", 'WARNING');
			return;
		}
		
		input.value = value;
		if(send){
			devpanel.sendInput(value);
		}
	}
	
	private static sendInput(value : string, button : string = ""){
		if(value == "" && button == ""){
			//value = (devpanel.devpanel_html.getElementById("devpanel_input") as HTMLInputElement).value;
			return;
		}
//		if(value == ""){
//			let toSearch = "devpanel_" +button;
//			value = (devpanel.devpanel_html.getElementById(toSearch) as HTMLInputElement).value;
//		}
		
		
		if(button == "repeat"){
//			if(devpanel.DEMO_MODE){
//				value= 'seed=' + devpanel.LAST_INDEX;
//			}else{
				value= 'seed=' + devpanel.LAST_SEED;
//			}
		}
		
		let spin_request = false;
		
		
		if(value.search("SIMSPIN") != -1){
			spin_request = true;
		}else if(value.search("seed") != -1){
			spin_request = true;
		}else if(value.search("index") != -1){
			spin_request = true;
		}
		else if(value.search("event") != -1){
			spin_request = false;
			//split event with =
			let split = value.split("=");
			try{
				let event = this.stringToSPIN_EVENT(split[1]);
				let _integer_param = undefined;
				if(split[1].split("|").length == 2){
					let splt = split[1].split("|");
					event = this.stringToSPIN_EVENT(splt[0]);
					_integer_param = parseInt(splt[1]);
				}
				let strToSend : any = event;
				if(event == undefined){
					strToSend = split[1];
				}
				//from input boxes add parameters to event
				let floatValue = (devpanel.devpanel_html.getElementById("float_input") as HTMLInputElement).valueAsNumber;
				let intValue = (devpanel.devpanel_html.getElementById("int_input") as HTMLInputElement).valueAsNumber;
				let stringValue = (devpanel.devpanel_html.getElementById("string_input") as HTMLInputElement).value;
				let pointValue = new Point((devpanel.devpanel_html.getElementById("point_x") as HTMLInputElement).valueAsNumber, (devpanel.devpanel_html.getElementById("point_y") as HTMLInputElement).valueAsNumber);
				let delayValue = (devpanel.devpanel_html.getElementById("delay_input") as HTMLInputElement).valueAsNumber;
				
				if(_integer_param != undefined){
					intValue = _integer_param;
				}
				
				let bonusGameCheckbox = devpanel.devpanel_html.getElementById("bigwin_bonus_game") as HTMLInputElement;
				let bonusGame = bonusGameCheckbox ? bonusGameCheckbox.checked : false;
				
				let objToSend : any = {};
				objToSend.float = floatValue;
				objToSend.int = intValue;
				objToSend.string = stringValue;
				objToSend.value = pointValue;
				objToSend.delay = delayValue;
				objToSend.bonusGame = bonusGame;
				objToSend.baseGame = !bonusGame;
				
				if(delayValue > 0){
					//do delay
					window.setTimeout(() => {
						fpglobals.SpinEE.emit(strToSend, objToSend);
					}, delayValue);
				}else{
					fpglobals.SpinEE.emit(strToSend, objToSend);
				}
				
				
				if(event == undefined){
					fpglobals.GLog("devpanel.sendInput: spin event not found: " +split[1] + " | ALSO trying as UI event");
					let ui_event = this.stringToUI_EVENT(split[1]);
					if(ui_event != undefined){
						fpglobals.UIEE.emit(ui_event);
					}else{
						fpglobals.GLog("devpanel.sendInput: UI event not found: " +split[1]);
					}
				}
			//	devpanel.showHideDevPanel("hide");
			}
			catch(e : any){
				fpglobals.GLog("devpanel.sendInput: event split error: " +e.toString());
			}
		}
		
		if(spin_request){
			devpanel.last_sent_request = value;
			FPNetwork.game_in_progress = true;
			spin.getSpinInstance().inputSpinPress();
			devpanel.last_sent_request = "";
			devpanel.showHideDevPanel("hide");
		}
		if(this.DEMO_MODE == false){
			FPNetwork.sendDeveloperMessage(value);
		}
	}
	
	private static stringToSPIN_EVENT(value: string): SPIN_EVENT | undefined {
		// Iterate over all keys of the SPIN_EVENT enum
		for (const key of Object.keys(SPIN_EVENT)) {
			if (SPIN_EVENT[key as keyof typeof SPIN_EVENT] === value) {
				return SPIN_EVENT[key as keyof typeof SPIN_EVENT];
			}
		}
		// Return undefined if the value does not match any enum value
		return undefined;
	}
	private static stringToUI_EVENT(value: string): UI_EVENT | undefined {
		// Iterate over all keys of the SPIN_EVENT enum
		for (const key of Object.keys(UI_EVENT)) {
			if (UI_EVENT[key as keyof typeof UI_EVENT] === value) {
				return UI_EVENT[key as keyof typeof UI_EVENT];
			}
		}
		// Return undefined if the value does not match any enum value
		return undefined;
	}
	
	/*
			public enum DEBUG_SIM_OPTIONS {
			none = 0,							//0
			SIM_UNTIL_FEATURE = 1,				//1
			
			SIM_UNTIL_FEATURE = 3r = 3,			//TODO in sim
			SIM_UNTIL_FEATURE = 4r = 4,			//TODO in sim
			
			SIM_UNTIL_FEATURE_x5 =   5*5 + 5*5, //25 + 25 = 50
			SIM_AFTER_FEATURE_3to3 = 3*3 + 3*3, //9 + 9 = 18
			SIM_AFTER_FEATURE_3to4 = 3*3 + 4*4, //9 + 16 = 25
			SIM_AFTER_FEATURE_3to5 = 3*3 + 5*5, //9 + 25 = 34
			SIM_AFTER_FEATURE_3to6 = 3*3 + 6*6, //9 + 36 = 45
			SIM_AFTER_FEATURE_4to4 = 4*4 + 4*4, //16 + 16 = 32
			SIM_AFTER_FEATURE_4to5 = 4*4 + 5*5, //16 + 25 = 41
			SIM_AFTER_FEATURE_4to6 = 4*4 + 6*6, //16 + 36 = 52
			SIM_AFTER_FEATURE_5to5 = 5*5 + 5*5, //25 + 25 = 50
			SIM_AFTER_FEATURE_5to6 = 5*5 + 6*6, //25 + 36 = 61
			SIM_AFTER_FEATURE_6to6 = 6*6 + 6*6, //36 + 36 = 72
		}
	*/
	
	private static doFuncBtn(id: string){
		if(id == "perf_WEED_EFFECT=toggle"){
			fpglobals.perf_WEED_EFFECT = !fpglobals.perf_WEED_EFFECT;
		}
		else if(id == "audio_music=toggle"){
			fpglobals.UIEE.emit(UI_EVENT.AUDIO_MUSIC_TOGGLE);
		}
		else if(id == "perf_SPINE_WEED_EFFECT=toggle"){
			fpglobals.perf_WEED_EFFECT = false;
		}else if(id == "perf_dynamic_resolution"){
			fpglobals.perf_dynamic_resolution = !fpglobals.perf_dynamic_resolution;
			if(!fpglobals.perf_dynamic_resolution){
				screenResizeHandler.update_renderer_resolution = true;
				screenResizeHandler.renderer_resolution=(1);
			}
		}else if(id == "perf_benchmark"){
			benchmark.toggleBenchmarkMode();
		}else if(id == "testbutton"){
			//let reels = spin.getSpinInstance().reels_active.arr;
			//for(let i = 0; i < reels.length; i++){
			//	let reel = reels[i];
			//	for(let j = 0; j < reel.length; j++){
			//		let symbol = reel[j];
			//		symbol?.hideFor(1000, 500);
			//	}
			//}
			//SoundDirector.testAudioLoop((devpanel.devpanel_html.getElementById("int_input") as HTMLInputElement).valueAsNumber);
			fpglobals.SpinEE.emit(SPIN_EVENT.TEST_HIT);
		}else if(id == "spawn_test_counter"){
			let toNum = (devpanel.devpanel_html.getElementById("int_input") as HTMLInputElement).valueAsNumber;
			if(fpglobals.FPScene){
				fpglobals.FPScene.devSpawnTestCounter(toNum);
			}
		}else if(id == "delete_test_counter"){
			if(fpglobals.FPScene){
				fpglobals.FPScene.devDeleteTestCounter();
			}
		}else if(id == "set_end_screen"){
			devpanel.toggleTestBonusEndScreen();
		}
	}
	
	private static toggleTestBonusEndScreen(){
		if(devpanel.test_bonus_end_screen != null){
			devpanel.test_bonus_end_screen.destroy();
			devpanel.test_bonus_end_screen = null;
			return;
		}
		
		const spinInstance = spin.getSpinInstance();
		if(!spinInstance || !spinInstance.above_reels){
			fpglobals.GLog("devpanel.set_end_screen: spin/above_reels not ready", 'WARNING');
			return;
		}
		
		const totalSpins = (devpanel.devpanel_html.getElementById("point_x") as HTMLInputElement).valueAsNumber;
		const creditsWon = (devpanel.devpanel_html.getElementById("point_y") as HTMLInputElement).valueAsNumber;
		
		const endScreen = new BonusEndScreen(null, {
			totalWin : WinValue.fromCredits(creditsWon),
			totalSpins : totalSpins
		});
		// Scene z-index table: bigwin_seq = 1101, wins_effects_holder_above = 1102
		endScreen.zIndex = 1103;
		endScreen.name = "devpanel_test_bonus_end_screen";
		spinInstance.above_reels.addChild(endScreen);
		endScreen.init();
		
		devpanel.test_bonus_end_screen = endScreen;
	}
	
	
	private static showHideDevPanel(showhide : "show" | "hide" | "toggle" = "toggle") {
		const devpanel = document.getElementById("devpanel")!;
		const devpanelContent = (devpanel as any).contentDocument?.body;
		
		if (devpanel.style.visibility === "hidden") {
			if(showhide == "hide"){ return; }
			
			// Smooth entrance animation without 3D effects or blur
			devpanel.style.visibility = "visible";
			devpanel.style.opacity = "0";
			devpanel.style.transform = "translateY(100vh) scale(0.5)";
			
			// Animate elements in groups for better performance
			if (devpanelContent) {
				// Group elements logically
				const elementGroups = [
					devpanelContent.querySelectorAll('.input-container'), // Input fields group
					devpanelContent.querySelectorAll('.sim_btn, .func_btn'), // Buttons group
					devpanelContent.querySelectorAll('.checkbox-wrapper, .min-win-container'), // Controls group
					devpanelContent.querySelectorAll('.filter-container'), // Filter group
					devpanelContent.querySelectorAll('#output-list, #eventList') // Lists group
				];
				
				elementGroups.forEach((group, groupIndex) => {
					if (group.length > 0) {
						// Set initial state for entire group
						Array.from(group).forEach((element) => {
							const htmlElement = element as HTMLElement;
							htmlElement.style.transform = 'translateX(40px)';
							htmlElement.style.opacity = '0';
						});
						
						// Animate entire group together with staggered timing between groups
						setTimeout(() => {
							Array.from(group).forEach((element) => {
								const htmlElement = element as HTMLElement;
								htmlElement.style.transition = `transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.25s ease`;
								htmlElement.style.transform = 'translateX(0)';
								htmlElement.style.opacity = '1';
							});
						}, 80 + (groupIndex * 60)); // Faster timing, 60ms between groups
					}
				});
				
				// Clean up transitions after animation completes
				setTimeout(() => {
					elementGroups.forEach(group => {
						Array.from(group).forEach((element) => {
							const htmlElement = element as HTMLElement;
							htmlElement.style.transition = '';
						});
					});
				}, 600); // Shorter cleanup time
			}
			
			// Smooth entrance with gentle scaling and movement
			devpanel.animate([
				{ 
					opacity: "0", 
					transform: "translateY(100vh) scale(0.5)"
				},
				{ 
					opacity: "0.7", 
					transform: "translateY(20vh) scale(0.85)"
				},
				{ 
					opacity: "1", 
					transform: "translateY(0) scale(1)"
				}
			], { 
				duration: 500, 
				easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
				fill: "forwards" 
			});
			
		} else {
			if(showhide == "show"){ return; }
			
			// Animate element groups sliding out quickly
			if (devpanelContent) {
				// Same element groups as entrance
				const elementGroups = [
					devpanelContent.querySelectorAll('#output-list, #eventList'), // Lists first (reverse order)
					devpanelContent.querySelectorAll('.filter-container'), // Filter group
					devpanelContent.querySelectorAll('.checkbox-wrapper, .min-win-container'), // Controls group
					devpanelContent.querySelectorAll('.sim_btn, .func_btn'), // Buttons group
					devpanelContent.querySelectorAll('.input-container') // Input fields last
				];
				
				elementGroups.forEach((group, groupIndex) => {
					if (group.length > 0) {
						Array.from(group).forEach((element) => {
							const htmlElement = element as HTMLElement;
							htmlElement.style.transition = `transform 0.15s cubic-bezier(0.55, 0.06, 0.68, 0.19), opacity 0.12s ease`;
							htmlElement.style.transitionDelay = `${groupIndex * 25}ms`; // 25ms stagger between groups
							htmlElement.style.transform = 'translateX(-25px)';
							htmlElement.style.opacity = '0';
						});
					}
				});
			}
			
			// Very fast exit animation
			const exitAnimation = devpanel.animate([
				{ 
					opacity: "1", 
					transform: "translateY(0) scale(1)"
				},
				{ 
					opacity: "0", 
					transform: "translateY(-50vh) scale(0.7)"
				}
			], { 
				duration: 150, 
				easing: "cubic-bezier(0.55, 0.06, 0.68, 0.19)",
				fill: "forwards" 
			});
			
			// Hide devpanel after fast animation
			exitAnimation.addEventListener('finish', () => {
				devpanel.style.visibility = "hidden";
				devpanel.style.transform = "none";
				
				// Reset element positions for next show
				if (devpanelContent) {
					const allElements = devpanelContent.querySelectorAll('.input-container, .sim_btn, .func_btn, .checkbox-wrapper, .min-win-container, .filter-container, #output-list, #eventList');
					allElements.forEach((element: HTMLElement) => {
						element.style.transition = '';
						element.style.transitionDelay = '';
						element.style.transform = '';
						element.style.opacity = '';
					});
				}
			});
		}
	}
	// Function to populate the list with SPIN_EVENT items
	private static populateListWithSpinEvents() {
		const list = devpanel.devpanel_html.getElementById("eventList");
		if (!list) {
			console.error("List element not found");
			return;
		}
	
		// Store all events for filtering
		const allEvents: string[] = [];
		
		// Collect SPIN_EVENT items
		Object.keys(SPIN_EVENT).forEach((key) => {
			const eventValue = SPIN_EVENT[key as keyof typeof SPIN_EVENT];
			allEvents.push(eventValue);
		});
		
		// Collect UI_EVENT items
		Object.keys(UI_EVENT).forEach((key) => {
			const eventValue = UI_EVENT[key as keyof typeof UI_EVENT];
			allEvents.push(eventValue);
		});
		
		// Function to populate the events list without animations
		const populateEventsList = (events: string[]) => {
			// Clear existing items
			list.innerHTML = '';
			
			events.forEach((eventValue, index) => {
				const listItem = document.createElement("li");
				listItem.textContent = eventValue;
				listItem.addEventListener("click", () => {
					devpanel.setInputTo("event=" + eventValue, false, 2);
				});
				
				list.appendChild(listItem);
			});
		};
		
		// Initial population with all events
		populateEventsList(allEvents);
		
		// Get the events filter elements
		const eventsFilterBox = devpanel.devpanel_html.getElementById("events-filter-box") as HTMLInputElement;
		const clearEventsFilterBtn = devpanel.devpanel_html.getElementById("clear-events-filter") as HTMLButtonElement;
		
		if (eventsFilterBox && clearEventsFilterBtn) {
			// Events filter debouncing
			let eventsFilterTimeout: NodeJS.Timeout | null = null;
			
			// Add input event listener to filter events with debouncing
			eventsFilterBox.addEventListener('input', function() {
				// Clear existing timeout
				if (eventsFilterTimeout) {
					clearTimeout(eventsFilterTimeout);
				}
				
				// Debounce the filter application
				eventsFilterTimeout = setTimeout(() => {
					const filterText = eventsFilterBox.value.trim().toLowerCase();
					
					if (filterText === '') {
						// If filter is empty, show all events
						populateEventsList(allEvents);
					} else {
						// Filter events that contain the filter text
						const filteredEvents = allEvents.filter((event: string) => 
							event.toLowerCase().includes(filterText)
						);
						
						// Update the list with filtered events
						populateEventsList(filteredEvents);
					}
					eventsFilterTimeout = null;
				}, 50); // Fast debounce for events
			});
			
			// Add click event listener to clear button
			clearEventsFilterBtn.addEventListener('click', function() {
				eventsFilterBox.value = '';
				populateEventsList(allEvents);
				eventsFilterBox.focus();
			});
		}
	}
	
	// Helper method to create game info header
	private static createGameInfoHeader(groupHeader: HTMLLIElement, gameInfo: any) {
		groupHeader.innerHTML = ''; // Clear existing content
		
		const seedSpan = document.createElement('span');
		seedSpan.classList.add('seed');
		seedSpan.textContent = `Seed: ${gameInfo.seed}`;
		groupHeader.appendChild(seedSpan);
		
		const infoSpan = document.createElement('span');
		infoSpan.classList.add('info');
		
		if (gameInfo.win && gameInfo.win !== "0" && gameInfo.win !== "?") {
			const winSpan = document.createElement('span');
			winSpan.classList.add('win');
			winSpan.textContent = `Base Win: ${gameInfo.win}`;
			infoSpan.appendChild(winSpan);
		}
		
		if (gameInfo.fg && gameInfo.fg !== "0") {
			const fgSpan = document.createElement('span');
			fgSpan.classList.add('freegame');
			// Convert multiplier to credits using accounting system
			const fgCredits = WinValue.fromMultiplier(Number(gameInfo.fg)).credits;
			fgSpan.textContent = `FG Win: ${fgCredits}`;
			infoSpan.appendChild(fgSpan);
		}
		
		// Note: Step counts are not displayed since we're not loading game blocks
		// Only show step counts if they are available (not "?")
		if (gameInfo.bgSteps && gameInfo.bgSteps !== "?") {
			const bgStepsSpan = document.createElement('span');
			bgStepsSpan.classList.add('bgsteps');
			bgStepsSpan.textContent = `BG[${gameInfo.bgSteps}]`;
			infoSpan.appendChild(bgStepsSpan);
		}
		
		if (gameInfo.fgSteps && gameInfo.fgSteps !== "?" && gameInfo.fgSteps !== "0") {
			const fgStepsSpan = document.createElement('span');
			fgStepsSpan.classList.add('fgsteps');
			fgStepsSpan.textContent = `FG[${gameInfo.fgSteps}]`;
			infoSpan.appendChild(fgStepsSpan);
		}
		
		groupHeader.appendChild(infoSpan);
	}
	
	// Note: updateGameInfoDisplay method removed since we no longer load game blocks asynchronously
	
	// Method to handle tab switching and refresh performance data
	public static onTabSwitch(tabName: string) {
		if (tabName === 'performance') {
			// Refresh spine pool data when switching to performance tab
			setTimeout(() => {
				performance_devpanel.refreshSpinePools();
			}, 100); // Small delay to ensure tab is fully visible
		}
		if (tabName === 'lwsort') {
			setTimeout(() => {
				lw_sort_devpanel.onTabActivated();
			}, 100);
		}
	}
	
	// Method to get performance statistics for external use
	public static getPerformanceStats() {
		return performance_devpanel.getSpinePoolStats();
	}
	
	// Method to refresh GPU textures only
	public static refreshGpuTextures() {
		performance_devpanel.refreshGpuTextures();
	}
	
	
}