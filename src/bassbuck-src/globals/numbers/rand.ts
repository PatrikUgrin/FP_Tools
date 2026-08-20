export class rand {
	private seed: number;
	private readonly a: number = 1664525;
	private readonly c: number = 1013904223;
	private readonly m: number = 4294967296; // 2^32
	
	constructor(seed: number) {
		this.seed = seed;
	}
	
	public next(): number {
		this.seed = (this.a * this.seed + this.c) % this.m;
		return this.seed / this.m;
	}

	public reset(seed?: number): void {
		this.seed = seed ?? this.seed;
	}

	// Get a random integer between min and max (exclusive of max)
	public getRandomInt(min: number, max: number): number {
		return Math.floor(this.next() * (max - min)) + min;
	}

	// Get a random float between min and max
	public getRandomFloat(min: number, max: number): number {
		return this.next() * (max - min) + min;
	}

	// Pick a random element from an array
	public pickRandom<T>(array: T[]): T {
		if (array.length === 0) {
			throw new Error("Cannot pick from empty array");
		}
		return array[this.getRandomInt(0, array.length - 1)];
	}

	// Shuffle an array using Fisher-Yates algorithm
	public shuffle<T>(array: T[]): T[] {
		const result = [...array];
		for (let i = result.length - 1; i > 0; i--) {
			const j = this.getRandomInt(0, i);
			[result[i], result[j]] = [result[j], result[i]];
		}
		return result;
	}

	// Get multiple random elements from an array without repetition
	public pickRandomMultiple<T>(array: T[], count: number): T[] {
		if (count > array.length) {
			throw new Error("Cannot pick more elements than array length");
		}
		return this.shuffle(array).slice(0, count);
	}

	// Get a random boolean with specified probability (0-1)
	public getRandomBoolean(probability: number = 0.5): boolean {
		return this.next() < probability;
	}

	//randomize an array
	public shuffleArray<T>(array: T[]): T[] {
		return this.shuffle(array);
	}
}