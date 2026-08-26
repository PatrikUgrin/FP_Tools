/**
 * Bake jobs copied from bassbuck-src/index.ts Loader.onComplete
 * (generateSymbolBlurAssetsForLoad / generateBonusSymbolAssetsForLoad /
 * generateSymbolTextureAssetsForDeactivated) plus each symbol class's
 * setPreviewSprite().
 *
 * Export folders match TexturePacker sheets under _BakeTexturePacker:
 *   base_game_symbols   — hi-lo cards + lw_appear / sw_appear
 *   bonus_game_symbols  — bonus spin / blur / deactivated (+ bl_b)
 *   cash_game_symbols   — fish values (appear / green / blur / blur_green)
 *
 * Filenames are texture-cache names. Bonus *_appear duplicates are not baked.
 */

export interface BakeJob {
	libsym: string;
	spine: string;
	url: string;
	skin: string | null;
	animation: string;
	group: string;
	texName: string;
	blur: boolean;
	spriteSheet: string | null;
	spriteFrame: string | null;
}

export const PACK_BASE = "base_game_symbols";
export const PACK_BONUS = "bonus_game_symbols";
export const PACK_CASH = "cash_game_symbols";

const FISH = "f";
const FISH_VALUES = [1, 2, 3, 5, 10, 25, 50, 100, 250, 500, 1000, 2000];
const CARDS = ["l1", "l2", "l3", "l4", "h1", "h2", "h3", "h4"];

const COLLECTOR = "c";
const CATCHBOOST = "cb";
const DROPSHOT = "ds";
const FULLSWEEP = "fs";
const TRUCK = "ctr";
const SIXPACK = "sp";
const BOAT = "bo";
const PLUSONE = "ob";
const BLANK = "bl";
const LUCKYBOOT = "lb";
const LARGEWILD = "lw";
const SMALLWILD = "sw";

/**
 * lib_bonus_symbols_blur (basket is not in this list).
 * Blank is blur-only: Blank.setSymbolSprite never poses spine for preview.
 */
const BONUS_BLUR = [
	COLLECTOR, DROPSHOT, TRUCK, SIXPACK, CATCHBOOST, FULLSWEEP,
	PLUSONE, BLANK, BOAT, LUCKYBOOT
];

const BONUS_SPINE = BONUS_BLUR.filter((libsym) => libsym !== BLANK);

const DEACTIVATED = [
	COLLECTOR, FULLSWEEP, DROPSHOT, CATCHBOOST,
	SIXPACK, BOAT, LUCKYBOOT, PLUSONE
];

const FISH_VALUE_SET = new Set(FISH_VALUES.map(String));
const CARD_SET = new Set(CARDS);

function spineUrl(file: string): string {
	return "./spine/" + file + ".json";
}

function job(partial: Omit<BakeJob, "url" | "group" | "spriteSheet" | "spriteFrame"> & {
	spriteSheet?: string | null;
	spriteFrame?: string | null;
}): BakeJob {
	return {
		spriteSheet: null,
		spriteFrame: null,
		...partial,
		group: packFolderFor(partial.texName),
		url: partial.spine ? spineUrl(partial.spine) : ""
	};
}

/** Map texture-cache name → one of the three TPS pack folders. */
export function packFolderFor(texName: string): string {
	if (texName === "lw_appear" || texName === "sw_appear") {
		return PACK_BASE;
	}
	if (CARD_SET.has(texName)) {
		return PACK_BASE;
	}
	for (const card of CARDS) {
		if (texName === card + "_appear") {
			return PACK_BASE;
		}
	}

	const cashStem = texName
		.replace(/_b_green$/, "")
		.replace(/_b$/, "")
		.replace(/_green$/, "");
	if (FISH_VALUE_SET.has(cashStem) && (
		texName === cashStem
		|| texName === cashStem + "_b"
		|| texName === cashStem + "_green"
		|| texName === cashStem + "_b_green"
	)) {
		return PACK_CASH;
	}

	return PACK_BONUS;
}

function bonusPose(libsym: string): { spine: string; skin: string | null; animation: string } {
	switch (libsym) {
		case COLLECTOR:
			return { spine: "buck_sym", skin: "collector", animation: "static_spin" };
		case CATCHBOOST:
			return { spine: "buck_sym", skin: "catchboost", animation: "static_spin" };
		case DROPSHOT:
			return { spine: "buck_sym", skin: "dropshot", animation: "static_spin" };
		case FULLSWEEP:
			return { spine: "buck_sym", skin: "fullsweep", animation: "static_spin" };
		case TRUCK:
			return { spine: "ctr", skin: null, animation: "static_spin" };
		case SIXPACK:
			return { spine: "sp", skin: null, animation: "static_spin" };
		case BOAT:
			return { spine: "bo", skin: "no_multi", animation: "static_spin" };
		case PLUSONE:
			return { spine: "plusonespin", skin: null, animation: "static_spin" };
		case LUCKYBOOT:
			return { spine: "luckyboot_sym", skin: null, animation: "static_spin" };
		default:
			throw new Error("Unknown bonus libsym: " + libsym);
	}
}

function deactivatedPose(libsym: string, boatMulti: number | null): { spine: string; skin: string | null; animation: string } {
	if (libsym === BOAT) {
		const skin = boatMulti === 2 ? "2_multi" : boatMulti === 3 ? "3_multi" : "no_multi";
		return { spine: "bo", skin, animation: "static_deactivated" };
	}
	if (libsym === PLUSONE) {
		// Plus1Spin.setPreviewSprite ignores Used and always plays static_spin
		return { spine: "plusonespin", skin: null, animation: "static_spin" };
	}
	if (libsym === LUCKYBOOT) {
		return { spine: "luckyboot_sym", skin: null, animation: "static_deactivated" };
	}
	if (libsym === SIXPACK) {
		return { spine: "sp", skin: null, animation: "static_deactivated" };
	}
	const base = bonusPose(libsym);
	return { ...base, animation: "static_deactivated" };
}

export function buildBakeJobs(): BakeJob[] {
	const jobs: BakeJob[] = [];

	for (const value of FISH_VALUES) {
		jobs.push(job({
			libsym: FISH,
			spine: "cash_sym",
			skin: String(value),
			animation: "static_appear",
			texName: value + "_b",
			blur: true
		}));
	}

	for (const libsym of BONUS_SPINE) {
		const pose = bonusPose(libsym);
		jobs.push(job({
			libsym,
			spine: pose.spine,
			skin: pose.skin,
			animation: pose.animation,
			texName: libsym + "_b",
			blur: true
		}));
	}

	jobs.push(job({
		libsym: BLANK,
		spine: "",
		skin: null,
		animation: "sprite",
		texName: "bl_b",
		blur: true,
		spriteSheet: "./spritesheet/symbols_img.json",
		spriteFrame: "bl.png"
	}));

	for (const value of FISH_VALUES) {
		jobs.push(job({
			libsym: FISH,
			spine: "cash_sym",
			skin: String(value),
			animation: "static_appear",
			texName: String(value),
			blur: false
		}));
	}

	for (const value of FISH_VALUES) {
		jobs.push(job({
			libsym: FISH,
			spine: "cash_sym",
			skin: String(value),
			animation: "static_appear_green",
			texName: value + "_green",
			blur: false
		}));
	}

	// Bonus symbols do not bake *_appear. Hi-lo + wilds do.
	const appearSymbols = [LARGEWILD, SMALLWILD].concat(CARDS);
	for (const libsym of appearSymbols) {
		if (libsym === LARGEWILD) {
			jobs.push(job({
				libsym,
				spine: "wild",
				skin: null,
				animation: "static_buck",
				texName: "lw_appear",
				blur: false
			}));
			continue;
		}
		if (libsym === SMALLWILD) {
			jobs.push(job({
				libsym,
				spine: "wild",
				skin: null,
				animation: "static_wild",
				texName: "sw_appear",
				blur: false
			}));
			continue;
		}
		jobs.push(job({
			libsym,
			spine: "hilo_sym",
			skin: libsym,
			animation: "static_appear",
			texName: libsym + "_appear",
			blur: false
		}));
	}

	const spinSymbols = BONUS_SPINE.concat(CARDS);
	for (const libsym of spinSymbols) {
		if (CARDS.indexOf(libsym) >= 0) {
			jobs.push(job({
				libsym,
				spine: "hilo_sym",
				skin: libsym,
				animation: "static_spin",
				texName: libsym,
				blur: false
			}));
			continue;
		}
		const pose = bonusPose(libsym);
		jobs.push(job({
			libsym,
			spine: pose.spine,
			skin: pose.skin,
			animation: pose.animation,
			texName: libsym,
			blur: false
		}));
	}

	for (const libsym of DEACTIVATED) {
		if (libsym === BOAT) {
			for (let multi = 1; multi <= 3; multi++) {
				const pose = deactivatedPose(libsym, multi);
				jobs.push(job({
					libsym,
					spine: pose.spine,
					skin: pose.skin,
					animation: pose.animation,
					texName: "bo_deactivated_" + multi,
					blur: false
				}));
			}
			continue;
		}
		const pose = deactivatedPose(libsym, null);
		jobs.push(job({
			libsym,
			spine: pose.spine,
			skin: pose.skin,
			animation: pose.animation,
			texName: libsym + "_deactivated",
			blur: false
		}));
	}

	for (const value of FISH_VALUES) {
		// Original green blur never switched animation; baker uses static_appear_green.
		jobs.push(job({
			libsym: FISH,
			spine: "cash_sym",
			skin: String(value),
			animation: "static_appear_green",
			texName: value + "_b_green",
			blur: true
		}));
	}

	return jobs;
}
