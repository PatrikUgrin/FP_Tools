 //for information on currecnt device
 
 //const deviceInfo = require('../../node_modules/device/lib/device.js');
 
// import * as DV from "device";
 
 export const isMobile = () => {
	//user agent check
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };
  
  export const isTablet = () => {
	//user agent check
	return /iPad|Android|Tablet/i.test(navigator.userAgent);
  };
  
  export const isDesktop = () => {
	//user agent check
	return !isMobile() && !isTablet();
  };
  
  export const isPortrait = () => {
	return window.innerHeight > window.innerWidth;
  };
  
  export const isLandscape = () => {
	return window.innerWidth > window.innerHeight;
  };
  
  export const isTouchDevice = () => {
	return "ontouchstart" in window || navigator.maxTouchPoints;
  };
  
  export const isMouseDevice = () => {
	return !isTouchDevice();
  };
  
  export const isDarkMode = () => {
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  
  export const isLightMode = () => {
	return window.matchMedia("(prefers-color-scheme: light)").matches;
  };
  
  export const isReducedMotion = () => {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };
  
  export const isNotReducedMotion = () => {
	return window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  };
  
  export const isNotTouchDevice = () => {
	return !isTouchDevice();
  };
  
  export const isNotMouseDevice = () => {
	return isTouchDevice();
  };
  
  export const isNotDarkMode = () => {
	return !isDarkMode();
  };
  
  export const isNotLightMode = () => {
	return !isLightMode();
  };
  
  export const isNotPortrait = () => {
	return !isPortrait();
  };
  
  export const isNotLandscape = () => {
	return !isLandscape();
  };
  
  export const isNotMobile = () => {
	return !isMobile();
  };
  
  export const isNotTablet = () => {
	return !isTablet();
  };
  
  export const isNotDesktop = () => {
	return !isDesktop();
  };
  
  export const isNotDarkModeAndNotTouchDevice = () => {
	return !isDarkMode() && !isTouchDevice();
  };
  
  export const isNotLightModeAndNotMouseDevice = () => {
	return !isLightMode() && !isMouseDevice();
  }
  
  //Test all functions and ouput in console
  export function getOutputAllDeviceInfo() : string{
	let toRet = "";
	
	toRet += "isMobile: " + isMobile() + "\n";
	toRet += "isTablet: " + isTablet() + "\n";
	toRet += "isDesktop: " + isDesktop() + "\n";
	toRet += "isPortrait: " + isPortrait() + "\n";
	toRet += "isLandscape: " + isLandscape() + "\n";
	toRet += "isTouchDevice: " + isTouchDevice() + "\n";
	toRet += "isMouseDevice: " + isMouseDevice() + "\n";
	toRet += "isDarkMode: " + isDarkMode() + "\n";
	toRet += "isLightMode: " + isLightMode() + "\n";
	toRet += "isReducedMotion: " + isReducedMotion() + "\n";
	
	//output full user agent
	toRet+= "User Agent: " + navigator.userAgent + "\n";
	
	//deviceInfo;
	
	
	return toRet;
  }
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  