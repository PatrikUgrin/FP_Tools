import { accounting } from "./accounting";

//   WinValue
//
//   Canonical monetary-win wrapper used throughout the game code.
//   Only credits are stored; currency and multiplier are projected live from
//   the current BET and DENOMINATION on `accounting`.
//
//   Rules of thumb:
//     - Construct via fromCredits/fromCurrency/fromMultiplier at the boundary
//       where game-data semantics are known. This is the one place where the
//       unit must be decided explicitly.
//     - If a raw number is genuinely ambiguous, default to fromCredits.
//       The game can be re-checked visually and the site corrected.
//     - Use add/sub/scale for arithmetic. Never mix WinValue with raw numbers
//       without going through a constructor or a projection getter.
//
//   The conversion primitives have been intentionally moved out of accounting
//   into this module so that every unit conversion in the codebase routes
//   through a WinValue instance.

export class WinValue {
	private _credits : number;
	
	private constructor(credits : number){
		this._credits = credits;
	}
	
	// ---- constructors (explicit unit of incoming number) ----
	public static fromCredits(credits : number) : WinValue {
		return new WinValue(credits);
	}
	public static fromCurrency(currency : number) : WinValue {
		return new WinValue(currency * accounting.getDenomination());
	}
	public static fromMultiplier(multiplier : number) : WinValue {
		return new WinValue(multiplier * accounting.getBetInCredits());
	}
	public static zero() : WinValue {
		return new WinValue(0);
	}
	
	// ---- projections (computed live from accounting state) ----
	public get credits() : number {
		return this._credits;
	}
	public get currency() : number {
		return this._credits / accounting.getDenomination();
	}
	public get multiplier() : number {
		return this._credits / accounting.getBetInCredits();
	}
	
	// ---- arithmetic (immutable) ----
	public add(other : WinValue) : WinValue {
		return new WinValue(this._credits + other._credits);
	}
	public sub(other : WinValue) : WinValue {
		return new WinValue(this._credits - other._credits);
	}
	public scale(scalar : number) : WinValue {
		return new WinValue(this._credits * scalar);
	}
	
	// ---- predicates ----
	public isZero() : boolean { return this._credits === 0; }
	public isPositive() : boolean { return this._credits > 0; }
	public multiplierAtLeast(threshold : number) : boolean {
		return this.multiplier >= threshold;
	}
	public creditsGreaterThan(other : WinValue) : boolean {
		return this._credits > other._credits;
	}
	
	public clone() : WinValue {
		return new WinValue(this._credits);
	}
	
	public toString() : string {
		return `WinValue(${this._credits}cr | ${this.currency}cur | x${this.multiplier})`;
	}
}
