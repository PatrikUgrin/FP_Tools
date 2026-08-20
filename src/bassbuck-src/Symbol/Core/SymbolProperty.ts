export interface SymbolProperty{
	ScatterProperty : any | null; //order of fish on scatter
	Used : boolean; //if symbol is used in feature | NA for persistent
	NumProp : number | null; //Multiplier or Charges
//	Multiplier : number | null; //if symbol is a multiplier
//	Charges : number | null; //if symbol is a six pack

	preview : boolean; //if symbol is a preview, always false, only true in assets.ts
	//preview effectively only disables cashvalue display
	
	//activated_state : boolean; //When symbol is drawn, it is activated, then it is deactivated / similar to used
}