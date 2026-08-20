import * as PIXI from "pixi.js";
import { Point } from "pixi.js";


import { ReelSymbol } from "../reelspin/ReelSymbol";
import { fpglobals } from "./fpglobals";
import { fp_error } from "./fp_error";
import { log } from "../globals/dev/log";
import { collector_symbol, largewild_symbol, smallwild_symbol, SpinDataset } from "../reelspin/SpinDataset";
import { SYMBOL_STATE, gfxsym } from "../reelspin/Symbol/Core/GraphicSymbol";
import { SymbolFactory } from "../reelspin/Symbol/Core/SymbolFactory";
import { add } from "@tweenjs/tween.js";
import { CollSYM, SDSym } from "../reelspin/BaseGame/BGWin";
import { rand } from "./numbers/rand";

//https://greensock.com/docs/v3/Plugins/PixiPlugin

export abstract class Macro{
	
	static AllSpritesheets : Array<PIXI.Spritesheet>;
	
	static getCoordsPerPos(pos : Point, addSymbolCenterOffset = false){
		if(addSymbolCenterOffset){
			return new Point(
				pos.x * fpglobals.sym_x + fpglobals.sym_x / 2,
				pos.y * fpglobals.sym_y + fpglobals.sym_y / 2
			);
		}
		return new Point(
			pos.x * fpglobals.sym_x,
			pos.y * fpglobals.sym_y
		);
	}
	

	static getDistanceBetweenPoints(point1 : Point, point2 : Point){
		return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
	}
	static removePositionsFromArray(arr : Array<Point>, poss : Array<Point>){
		for(let i = 0; i < poss.length; i++){
			let pos = poss[i];
			let index = arr.indexOf(pos);
			if(index > -1){
				arr.splice(index, 1);
			}
		}
		return arr;
	}

	static sortCollSymByDistanceFromPoint(arr : Array<CollSYM>, point : Point){
		arr.sort((a, b) => {
			const aPosPixels = Macro.getCoordsPerPos(a.position, true);
			const bPosPixels = Macro.getCoordsPerPos(b.position, true);
			return Macro.getDistanceBetweenPoints(point, aPosPixels) - Macro.getDistanceBetweenPoints(point, bPosPixels);
		});
		return arr;
	}
	static sortPointsByDistanceFromPoint(arr : Array<Point>, point : Point){
		arr.sort((a, b) => {
			return Macro.getDistanceBetweenPoints(point, a) - Macro.getDistanceBetweenPoints(point, b);
		});
		return arr;
	}
	
	static getSpritesheetByName() : PIXI.Spritesheet{
		return this.AllSpritesheets[0];
	}
	
	static getRadiansFromDegrees(degrees : number) : number{
		return degrees * (Math.PI / 180);
	}
	
	static rgbToHex(r : number, g : number, b : number) {
		const hexR = r.toString(16).padStart(2, '0');
		const hexG = g.toString(16).padStart(2, '0');
		const hexB = b.toString(16).padStart(2, '0');
		return `0x${hexR}${hexG}${hexB}`;
	}
	
	static rgbToHexNumber(r : number, g : number, b : number) {
		const hexR = r << 16;
		const hexG = g << 8;
		return hexR | hexG | b;
	}
	static HexToRgb(hex : number){
		const r = (hex >> 16) & 0xFF;
		const g = (hex >> 8) & 0xFF;
		const b = hex & 0xFF;
		return {r,g,b};
	}
	
	//get value between start and end using 0 to 1 progress linearly
	static LinearInterpolation(start: number, end: number, t: number) {
		return start * (1 - t) + end * t;
	}
	
	//return progress between start and end using current value, output 0 to 1
	static getProgress(start: number, end: number, current: number) {
		return (current - start) / (end - start);
	}
	
	// Example usage
//	const red = 255;
//	const green = 128;
///	const blue = 0;
//	const hexColor = rgbToHex(red, green, blue);
//	console.log(hexColor); // Output: 0xFF8000
	
	
	
	static getDummy(sym : gfxsym){
		//let dummy = new gfxsym(sym.LibSym, sym.pos, sym.cashvalue, true);
		let dummy = SymbolFactory.getNewSymbol(sym.LibSym, sym.pos, sym.cashvalue,sym.getIsFeature(), true);
		if((sym as any).isBasket){
			dummy.SymProperty.ScatterProperty = sym.SymProperty.ScatterProperty;
			dummy.setSymbolSprite();
		}
		else if((sym as any).isWeed){
			dummy.WEED_ANIM_INDEX = sym.WEED_ANIM_INDEX;
			//((sym as any)._main_spine()!.state as any).getCurrent(0).Animation;
			let prevSpine = (sym as any)._main_spine;
			if(prevSpine!=null && prevSpine != undefined){
				//let ret = prevSpine.getAnimationTime("idle");//prevSpine.getCurrentAnimationSpineTime();
				let ret = prevSpine.getAnimationTime(sym.WEED_ANIM_INDEX);//prevSpine.getCurrentAnimationSpineTime();
				//we can transfer time from one animation to another
				dummy.param_spine_animation_track_time = ret;
				//dummy.setupWeedFishSpine(null);
				//dummy.set
			}
		}
		//problem seed = 871983!
		if(dummy.getIsBasket()){ //TODO CHECK THIS HAS UNINTENDED CONSEQUENCES FOR MID SPIN -> THEN ANIMATION PLAY 
			dummy.SyncMainSpine(sym);
		}
		
		dummy.position_cords(dummy.pos);
		dummy.name = "dummy_" + dummy.LibSym;
		return dummy;
	}
	
	static getDoesResourceExistTEX(resname : string, res : string){
		let _res = PIXI.Loader.shared.resources[resname] as any;
		return _res.data.frames[res] != undefined;
	}
	static getDoesResourceExist(resname : string){
		let _res = PIXI.Loader.shared.resources[resname] as any;
		if(_res == undefined){return false;}
		return _res.data != undefined;
	}
	static getDoesResourceSpineExist(resname : string){
		let _res = PIXI.Loader.shared.resources[resname] as any;
		if(_res == undefined){return false;}
		return _res.spineData != undefined;
	}
	
	static getResourceByName(name : any){
		if(fpglobals._DEBUG_){
			let lib = PIXI.Loader.shared.resources;
			let res = PIXI.Loader.shared.resources[name];
			return res;
		}
		
		return PIXI.Loader.shared.resources[name];
		
		
	}
	static getAllSpineResources(){
		let toRet : Array<any> = [];
		for(let key in PIXI.Loader.shared.resources){
			let res = PIXI.Loader.shared.resources[key];
			if(res.spineData != undefined){
				toRet.push(res);
			}
		}
		return toRet;
	}
	
	
	public static sortArrayByProperty(arr : Array<any>, prop : string){
		arr.sort(function(a, b){
			return a[prop] - b[prop];
		});
	}
	public static sortPositionsDescending(arr : Array<Point>){
		arr.sort(function(a,b){
			if(a.y < b.y){
				return -1;
			}
			if(a.y > b.y){
				return 1;
			}
			//if y the same, sort by x
			if(a.x < b.x){
				return -1;
			}
			if(a.x > b.x){
				return 1;
			}
			return 0;
		});
		return arr;
	}

	public static sortSDSymsForBassFrenzy(arr : Array<SDSym>){
		arr = fpglobals.randInstance.shuffleArray(arr);
		//sort based on Collector/Wild first, then randomize

		arr.sort(function(a,b){
			const aHasSmallWild = a.libsym.indexOf(smallwild_symbol) >= 0;
			const bHasSmallWild = b.libsym.indexOf(smallwild_symbol) >= 0;
			if (aHasSmallWild && !bHasSmallWild) return -1; // a comes first
			if (!aHasSmallWild && bHasSmallWild) return 1;  // b comes first
			return 0;
		});
		arr.sort(function(a,b){
			const aHasLargeWild = a.libsym.indexOf(largewild_symbol) >= 0;
			const bHasLargeWild = b.libsym.indexOf(largewild_symbol) >= 0;
			if (aHasLargeWild && !bHasLargeWild) return -1; // a comes first
			if (!aHasLargeWild && bHasLargeWild) return 1;  // b comes first
			return 0;
		});
		
		return arr;
	}
	
	public static getIndexOfPositionInArray(arr : Array<Point>, pos : Point){
		for(let i = 0; i < arr.length; i++){
			if(arr[i].x == pos.x && arr[i].y == pos.y){
				return i;
			}
		}
		return -1;
	}
	public static sortSDSymsByCashValue(arr : Array<SDSym>){
		//object.cval is cashvalue integer
		arr.sort(function(a,b){
			return (a.value) - (b.value);
		});
		return arr;
	}
	public static sortCollSymsByCashValue(arr : Array<CollSYM>, reverse : boolean = false){
		//object.cval is cashvalue integer
		arr.sort(function(a,b){
			return (a.value) - (b.value);
		});
		if(reverse){
			arr.reverse();
		}
		return arr;
	}
	public static sortRAWSymbolsByCashValue(arr : Array<any>){
		//object.cval is cashvalue integer
		arr.sort(function(a,b){
			return SpinDataset.parser_getCashValueFromFullSym(a) - SpinDataset.parser_getCashValueFromFullSym(b);
		});
		return arr;
	}
	
	
	public static makeButtonDev(
			button_text : string,
			callback_on_click : any,
			color : any = 0xFFFFFF
		) {
		
			//init
		let hodler = new PIXI.Container();
		let text = new PIXI.Text(button_text);
		let filler = new PIXI.Graphics();
		let txtscale = 1.0;
		let padding_px = 5;
		
		//gfx
		filler.beginFill(color);
		filler.drawRect(
			0 - padding_px,
			0 - padding_px,
			text.width*txtscale + padding_px * 2,
			text.height*txtscale + padding_px * 2
			);
		filler.endFill();
		
		text.scale.x = text.scale.x * txtscale;
		text.scale.y = text.scale.y * txtscale;
		
		//attach callback
		filler.interactive = true;
		filler.on("pointerdown", callback_on_click);
		
		//parent
		hodler.addChild(filler);
		filler.addChild(text);
		
		//return
		return hodler;
	}
	
	public static getRandomColour(){
		let r = Math.floor(Math.random() * 256);
		let g = Math.floor(Math.random() * 256);
		let b = Math.floor(Math.random() * 256);
		return PIXI.utils.rgb2hex([r,g,b]);
	}
	
	public static getIsPositionIncluded(pos: Point, allpos : Array<Point>){
		//check if pos is included in allpos
		for(let i = 0; i < allpos.length; i++){
			if(allpos[i].x == pos.x && allpos[i].y == pos.y){
				return true;
			}
		}
		return false;
	}
	
	public static getIsElementIncluded(el : any, all : Array<any>){
		for(let i = 0; i < all.length; i++){
			if(all[i] == el){
				return true;
			}
		}
		return false;
	}
	
	public static getRandomPoints(): PIXI.Point[] {
		const minPoints = 4;
		const maxPoints = 15;
		const minX = 0;
		const maxX = 4;
		const minY = 0;
		const maxY = 5;
	
		// Generate a random number of points between minPoints and maxPoints
		const numPoints = Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints;
	
		// Generate the points
		const points: PIXI.Point[] = [];
		for (let i = 0; i < numPoints; i++) {
			const x = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
			const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
			points.push(new PIXI.Point(x, y));
		}
	
		return points;
	}
	
	
	
	/**
	 * Returns the position of `childContainer` as if it had the same parent as `parentContainer`.
	 *
	 * @param parentContainer - The container whose space we want to use.
	 * @param childContainer - The container whose global position we want to convert.
	 * @returns {PIXI.Point} - The position of `childContainer` relative to `parentContainer`.
	 */
	public static getRelativePosition(parentContainer: PIXI.Container, childContainer: PIXI.Container): PIXI.Point {
		// Get the global position of the childContainer
		const globalPosition = childContainer.getGlobalPosition();
		// Convert the global position to the local space of the parentContainer
		const localPosition = parentContainer.toLocal(globalPosition);
		return localPosition;
	}
	
	public static sortPositionsClockwise(positions: Array<Point>, center: Point): Array<Point> {
		return positions.sort((a, b) => {
			const angleA = Math.atan2(a.y - center.y, a.x - center.x);
			const angleB = Math.atan2(b.y - center.y, b.x - center.x);
			return angleA - angleB;
		});
	}
	
	
	public static sortCollSymsClockwise(positions: Array<CollSYM>, center: Point): Array<CollSYM> {
		return positions.sort((a, b) => {
			// Calculate angles and adjust to start at 12 o'clock (top)
			// atan2 returns -π/2 for 12 o'clock, so we add π/2 to make it 0
			let angleA = Math.atan2(a.position.y - center.y, a.position.x - center.x) + Math.PI / 2;
			let angleB = Math.atan2(b.position.y - center.y, b.position.x - center.x) + Math.PI / 2;
			// Normalize to [0, 2π] range
			if (angleA < 0) angleA += 2 * Math.PI;
			if (angleB < 0) angleB += 2 * Math.PI;
			return angleA - angleB;
		});
	}
	
	public static sortPositionsCounterClockwise(positions: Array<Point>, center: Point): Array<Point> {
		// First find bottom-left most point to start from
		const startPoint = positions.reduce((prev, curr) => {
			if (curr.y > prev.y || (curr.y === prev.y && curr.x < prev.x)) {
				return curr;
			}
			return prev;
		}, positions[0]);

		// Sort counter-clockwise around center point
		return positions.sort((a, b) => {
			const angleA = Math.atan2(a.y - center.y, a.x - center.x);
			const angleB = Math.atan2(b.y - center.y, b.x - center.x);
			
			// If one of the points is the start point, it comes first
			if (a === startPoint) return -1;
			if (b === startPoint) return 1;

			// Otherwise sort counter-clockwise
			return angleB - angleA;
		});
	}
}




export function ____getTextureFromDisplayObject(
	displayObject: PIXI.DisplayObject,
	forSpine : boolean = false, renderer : PIXI.Renderer | null = null
	): PIXI.Texture {
	let bounds = displayObject.getLocalBounds();
	if(forSpine){ //if bounds are in negative -> spine cannot comprehend
		if(bounds.x < 0){
			displayObject.position.set(bounds.x*(-1), displayObject.y);
		}
		if(bounds.y < 0){
			displayObject.position.set(displayObject.x, bounds.y*(-1));
		}
	}
	let baseRenderTexture = new PIXI.BaseRenderTexture({ width: bounds.width, height: bounds.height});
	let renderTexture = new PIXI.RenderTexture(baseRenderTexture);
	if(renderer == null){
		renderer = fpglobals.GApp.renderer as PIXI.Renderer;
	}
	renderer.render(displayObject, {renderTexture});
	return renderTexture;
}
export function getTextureFromDisplayObject( //WOrks with offset of half of negative x and y | (-20 = 10px offset)
    displayObject: PIXI.DisplayObject,
    forSpine: boolean = false,
    renderer: PIXI.Renderer | null = null,
	offset : Point = new Point(0,0) //extra offset
//): PIXI.Texture {
) {
    let bounds = displayObject.getLocalBounds();

    // If the bounds have negative values, adjust to positive
    let offsetX = bounds.x < 0 ? Math.abs(bounds.x) : 0;
    let offsetY = bounds.y < 0 ? Math.abs(bounds.y) : 0;
	
    // Add the extra offset to the calculated offsets
    offsetX += offset.x;
    offsetY += offset.y;
	
    // Create a new container to offset negative bounds to positive coordinates
    const container = new PIXI.Container();
    container.addChild(displayObject);
    displayObject.position.set(offsetX, offsetY);

    // Calculate the texture size based on the bounds and offsets
    const textureWidth = bounds.width + offsetX;
    const textureHeight = bounds.height + offsetY;

    let baseRenderTexture = new PIXI.BaseRenderTexture({ width: textureWidth, height: textureHeight });
    let renderTexture = new PIXI.RenderTexture(baseRenderTexture);

    if (renderer == null) {
        renderer = fpglobals.GApp.renderer as PIXI.Renderer;
    }

    // Render the container (with adjusted displayObject) to the renderTexture
    renderer.render(container, { renderTexture});

    // Reset the display object position if needed (optional)
    displayObject.position.set(-offsetX, -offsetY);

    return {tex: renderTexture, offset_x: offsetX, offset_y: offsetY};
}
export function __getTextureFromDisplayObject(
    displayObject: PIXI.DisplayObject,
    forSpine: boolean = false,
    renderer: PIXI.Renderer | null = null
): PIXI.Texture {
    // Calculate the local bounds of the display object
    let bounds = displayObject.getLocalBounds();

    // Calculate offsets to handle negative bounds values
    const offsetX = bounds.x < 0 ? Math.abs(bounds.x) : 0;
    const offsetY = bounds.y < 0 ? Math.abs(bounds.y) : 0;

    // Create a new container to hold the display object and adjust its position
    const container = new PIXI.Container();
    container.addChild(displayObject);

    // Reposition the display object inside the container to have positive bounds
    displayObject.position.set(offsetX, offsetY);

    // Calculate the render texture dimensions, accounting for offsets
    const renderTextureWidth = bounds.width + offsetX;
    const renderTextureHeight = bounds.height + offsetY;

    // Create a base render texture with the calculated dimensions
    let baseRenderTexture = new PIXI.BaseRenderTexture({ width: renderTextureWidth, height: renderTextureHeight });
    let renderTexture = new PIXI.RenderTexture(baseRenderTexture);

    // Use the provided renderer or the default global renderer
    if (renderer == null) {
        renderer = fpglobals.GApp.renderer as PIXI.Renderer;
    }

    // Render the container to the render texture
    renderer.render(container, { renderTexture });

    // Fix texture alignment issues by adjusting the frame and orig properties
    if (forSpine) {
        // Adjust the texture's frame and orig to correct the offset and size
        renderTexture.frame = new PIXI.Rectangle(0, 0, bounds.width, bounds.height);

        // Create a new texture based on the cropped frame to eliminate unwanted offsets
        const croppedTexture = new PIXI.Texture(
            renderTexture.baseTexture,
            renderTexture.frame,
            new PIXI.Rectangle(0, 0, bounds.width, bounds.height), // Crop to the original bounds
            new PIXI.Rectangle(0, 0, bounds.width, bounds.height),
            renderTexture.rotate
        );

        // Update `orig` property for Spine compatibility
        croppedTexture.orig = new PIXI.Rectangle(0, 0, bounds.width, bounds.height);

        return croppedTexture;
    }

    // Return the render texture if not adjusting for Spine
    return renderTexture;
}




/*
za centrirat SPINE bi rabli pol imet vnaprej points informacijo
- koliko je bounds v x in y
- pol offsetat spine player pozicijo za koliko je X pozicij in Y
- za 1 simbol se offseta za 1/2 simbola
- za 2 simbola se offseta za 1 simbol
- za 3 simbole se offseta za 1.5 simbola etc.

Rabimo pol se kje se zacne X in Y
najdi najbol levi X

*/
export function getFirstAnchorBounds(positions : Array<Point>) : PIXI.Point{
	let minX = 0;
	let minY = 0;
	positions.forEach(element => {
		if(element.x < minX){
			minX = element.x;
		}
		if(element.y < minY){
			minY = element.y;
		}
	});
	return new PIXI.Point(minX,minY);
}
export function getBoundsPosition(positions : Array<Point>) : PIXI.Rectangle{
	let minX = 0;
	let minY = 0;
	let maxX = 0;
	let maxY = 0;
	positions.forEach(element => {
		if(element.x < minX){
			minX = element.x;
		}
		if(element.y < minY){
			minY = element.y;
		}
		if(element.x > maxX){
			maxX = element.x;
		}
		if(element.y > maxY){
			maxY = element.y;
		}
	});
	return new PIXI.Rectangle(minX,minY,maxX,maxY);
}


export function sortPositionsClockwise(positions: Point[], centerPoint: Point): Point[] {
	// Calculate angles for each position relative to center point
	const posWithAngles = positions.map(pos => {
		// Calculate angle in radians
		const angle = Math.atan2(
			pos.y - centerPoint.y,
			pos.x - centerPoint.x
		);
		
		return {
			position: pos,
			angle: angle
		};
	});

	// Sort based on angles (clockwise from rightmost point)
	posWithAngles.sort((a, b) => {
		// Convert angles to degrees for easier comparison
		const angleA = (a.angle * 180 / Math.PI + 360) % 360;
		const angleB = (b.angle * 180 / Math.PI + 360) % 360;
		return angleA - angleB;
	});

	// Return just the sorted positions
	return posWithAngles.map(item => item.position);
}

export function isPointInArray(point : Point, array : Array<Point>) : boolean{
	for(let i = 0; i < array.length; i++){
		if(array[i].x == point.x && array[i].y == point.y){
			return true;
		}
	}
	return false;
}


interface StandardEnum<T> {
    [id: string]: T | string;
    [nu: number]: string;
}

/**
 * Converts the given representation of the value of one enumerated constant to an equivalent enumerated type.
 *
 * @param type - An enumeration type
 * @param value - A value to convert
 */
export const genericValueToEnum = <T, K extends StandardEnum<T>> (
    type: StandardEnum<T>,
    value: K[keyof K]
): T | undefined => {
    const keys = Object.keys(type); // ...but, not really.
    const values = Object.values(type)
        // Filter enum member names because `Object.values()` includes them.
        .filter((value) => !(
            typeof value === 'string' &&
            keys.includes(value) &&
            type[value] !== value
        ));

    return values.includes(value)
        ? value as unknown as T
        : undefined;
}
//https://stackoverflow.com/questions/17380845/how-do-i-convert-a-string-to-enum-in-typescript/73339724#73339724

/**
 * Converts a PIXI.Texture to an image file and triggers a browser download.
 * For debug testing purposes.
 * 
 * @param texture - The PIXI.Texture to convert and download
 * @param filename - Optional filename for the downloaded image (default: "texture_[timestamp].png")
 * @param renderer - Optional renderer instance (defaults to fpglobals.GApp.renderer)
 */
export function downloadTextureAsImage(
	texture: PIXI.Texture,
	filename?: string,
	renderer?: PIXI.Renderer
): void {
	try {
		// Use provided renderer or default to global renderer
		if (!renderer) {
			renderer = fpglobals.GApp.renderer as PIXI.Renderer;
		}

		if (!renderer) {
			fp_error.onerror("Renderer is null in downloadTextureAsImage");
			return;
		}

		// Extract canvas from texture using renderer's extract API
		const canvas = renderer.extract.canvas(texture);
		
		// Convert canvas to blob
		canvas.toBlob((blob : any) => {
			if (!blob) {
				fp_error.onerror("Failed to create blob from texture");
				return;
			}
			
			// Create download URL
			const url = URL.createObjectURL(blob);
			
			// Generate filename if not provided
			const downloadFilename = filename || `texture_${Date.now()}.png`;
			
			// Create temporary anchor element and trigger download
			const a = document.createElement('a');
			a.href = url;
			a.download = downloadFilename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			
			// Clean up URL
			URL.revokeObjectURL(url);
		}, 'image/png');
	} catch (error) {
		fp_error.onerror(`Error downloading texture: ${error}`);
	}
}




