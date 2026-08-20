//This will take a string key and provide the translated text

import { fpglobals } from "../fpglobals";
import { log } from "../dev/log";

export class Translations {

    private static instance : Translations;
    private translations : Record<string, string> = {};
    private loaded : boolean = false;

    private constructor() {}

    public static getInstance() : Translations {
        if (!Translations.instance) {
            Translations.instance = new Translations();
        }
        return Translations.instance;
    }

    public async init(jsonPath : string = "translations.json") : Promise<void> {
        const response = await fetch(jsonPath);
        if (!response.ok) {
            fpglobals.GLog(`Failed to load translations from "${jsonPath}": ${response.statusText}`, log.type.ERROR);
            this.loaded = false;
            return;
        }
        try {
            this.translations = await response.json();
            this.loaded = true;
        } catch (error) {
            fpglobals.GLog(`Failed to parse translations from "${jsonPath}": ${error}`, log.type.ERROR);
            this.loaded = false;
        }
        if (!this.loaded) {
            fpglobals.GLog("Translations: failed to load or parse translations from '"+jsonPath+"'", log.type.ERROR);
        }
    }

    public get(key : string, fallback? : string) : string {
        if (!this.loaded) {
            fpglobals.GLog("Translations: not yet initialised — call init() first.", log.type.ERROR);
        }
        return this.translations[key] ?? fallback ?? key;
    }

    public has(key : string) : boolean {
        return key in this.translations;
    }

    public isLoaded() : boolean {
        return this.loaded;
    }
}