"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname);
const PATHS_FILE = path.join(ROOT, "baker-paths.txt");
const DEFAULTS = {
	spine: "static/spine",
	export: "export/png",
	spritesheet: "static"
};

function loadBakerPaths() {
	let spine = DEFAULTS.spine;
	let exportDir = DEFAULTS.export;
	let spritesheet = "";
	if (fs.existsSync(PATHS_FILE)) {
		const parsed = parsePathsFile(fs.readFileSync(PATHS_FILE, "utf8"));
		if (parsed.spine) {
			spine = parsed.spine;
		}
		if (parsed.export) {
			exportDir = parsed.export;
		}
		if (parsed.spritesheet) {
			spritesheet = parsed.spritesheet;
		}
	} else {
		writeBakerPathsFile(spine, exportDir, spritesheet);
	}
	if (spritesheet) {
		spritesheet = folderFromMaybeFile(spritesheet);
	}
	const spineInfo = inspectDir(spine);
	const exportInfo = inspectDir(exportDir);
	const sheetInfo = spritesheet
		? inspectDir(spritesheet)
		: { resolved: "", exists: false, error: "Spritesheet folder not set" };
	return {
		spine,
		export: exportDir,
		spritesheet,
		spineResolved: spineInfo.resolved,
		exportResolved: exportInfo.resolved,
		spritesheetResolved: sheetInfo.resolved,
		spineExists: spineInfo.exists,
		exportExists: exportInfo.exists,
		spritesheetExists: sheetInfo.exists,
		spineError: spineInfo.error,
		exportError: exportInfo.error,
		spritesheetError: sheetInfo.error,
		file: PATHS_FILE
	};
}

function parsePathsFile(text) {
	const out = { spine: "", export: "", spritesheet: "" };
	const lines = String(text || "").split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.charAt(0) === "#") {
			continue;
		}
		const eq = trimmed.indexOf("=");
		if (eq < 1) {
			continue;
		}
		const key = trimmed.slice(0, eq).trim().toLowerCase();
		const value = stripQuotes(trimmed.slice(eq + 1).trim());
		if (key === "spine" || key === "export" || key === "spritesheet") {
			out[key] = value;
		}
	}
	return out;
}

function stripQuotes(value) {
	const text = String(value || "").trim();
	if (text.length >= 2) {
		const start = text.charAt(0);
		const end = text.charAt(text.length - 1);
		if ((start === "\"" && end === "\"") || (start === "'" && end === "'")) {
			return text.slice(1, -1).trim();
		}
	}
	return text;
}

function writeBakerPathsFile(spine, exportDir, spritesheet) {
	const body = [
		"# Spine baker folders. Edit here or press Save paths in the web UI.",
		"# Relative paths are from this project folder.",
		"spine=" + String(spine || "").trim(),
		"export=" + String(exportDir || "").trim(),
		"spritesheet=" + String(spritesheet || "").trim(),
		""
	].join("\n");
	fs.writeFileSync(PATHS_FILE, body, "utf8");
}

function writeBakerPaths(spine, exportDir, spritesheet) {
	const existing = parseExistingPaths();
	const nextSpine = stripQuotes(spine || existing.spine || DEFAULTS.spine);
	const nextExport = stripQuotes(exportDir || existing.export || DEFAULTS.export);
	let nextSheet = stripQuotes(spritesheet || existing.spritesheet || "");
	if (nextSheet) {
		nextSheet = folderFromMaybeFile(nextSheet);
	}
	writeBakerPathsFile(nextSpine, nextExport, nextSheet);
	return loadBakerPaths();
}

function parseExistingPaths() {
	if (!fs.existsSync(PATHS_FILE)) {
		return { spine: "", export: "", spritesheet: "" };
	}
	return parsePathsFile(fs.readFileSync(PATHS_FILE, "utf8"));
}

function folderFromMaybeFile(value) {
	try {
		const resolved = resolveUserDir(value);
		if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
			return path.dirname(resolved);
		}
	} catch (_err) {
		// keep the typed path; inspectDir will explain
	}
	return value;
}

function inspectDir(value) {
	try {
		const resolved = resolveUserDir(value);
		if (!fs.existsSync(resolved)) {
			return {
				resolved,
				exists: false,
				error: "Folder not found: " + resolved
			};
		}
		const stat = fs.statSync(resolved);
		if (!stat.isDirectory()) {
			return {
				resolved,
				exists: false,
				error: "Not a folder: " + resolved
			};
		}
		return {
			resolved,
			exists: true,
			error: null
		};
	} catch (err) {
		return {
			resolved: String(value || "").trim(),
			exists: false,
			error: err && err.message ? err.message : String(err)
		};
	}
}

function resolveUserDir(value) {
	const trimmed = stripQuotes(String(value || "").trim());
	if (!trimmed) {
		throw new Error("Folder path is empty");
	}
	const resolved = path.resolve(ROOT, trimmed);
	const root = path.parse(resolved).root;
	if (path.normalize(resolved) === path.normalize(root)) {
		throw new Error("Refusing to use a drive root as a baker folder");
	}
	return resolved;
}

function listLanIPv4() {
	const nets = os.networkInterfaces();
	const ips = [];
	Object.keys(nets).forEach((name) => {
		(nets[name] || []).forEach((net) => {
			const family = net.family === "IPv4" || net.family === 4;
			if (family && !net.internal) {
				ips.push(net.address);
			}
		});
	});
	return ips;
}

module.exports = {
	ROOT,
	PATHS_FILE,
	DEFAULTS,
	loadBakerPaths,
	writeBakerPaths,
	resolveUserDir,
	listLanIPv4
};
