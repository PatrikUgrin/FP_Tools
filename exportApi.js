const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const { loadBakerPaths } = require("./bakerPaths");

const SAFE_NAME = /^[A-Za-z0-9_.-]+$/;
const SPINE_FILE_NAME = /^[A-Za-z0-9_.@-]+$/;
const PORT = 3456;
const spineCopyLocks = new Map();

function createExportRouter() {
	const router = express.Router();
	router.use(express.json({ limit: "64mb" }));

	router.get("/config", (_req, res) => {
		res.json(configPayload());
	});

	router.post("/config", (req, res) => {
		try {
			const spine = String(req.body && req.body.spine || "").trim();
			const exportDir = String(req.body && req.body.export || "").trim();
			const spritesheet = String(
				(req.body && (req.body.spritesheet || req.body.spriteSheet)) || ""
			).trim();
			if (!spine || !exportDir) {
				res.status(400).json({ error: "Spine and export folders are required" });
				return;
			}
			if (!spritesheet) {
				res.status(400).json({ error: "Spritesheet folder is required" });
				return;
			}
			const tps = String(
				(req.body && (req.body.tps || req.body.texturepacker)) || ""
			).trim();
			const spineExport = String(
				(req.body && (req.body.spineexport || req.body.spineExport)) || ""
			).trim();
			const spineConverted = String(
				(req.body && (req.body.spineconverted || req.body.spineConverted)) || ""
			).trim();
			const { writeBakerPaths } = loadBakerPathsModule();
			const saved = writeBakerPaths(spine, exportDir, spritesheet, tps, spineExport, spineConverted);
			console.log("[baker] saved paths");
			console.log("  Spine:         " + saved.spineResolved);
			console.log("  Spritesheet:   " + (saved.spritesheetResolved || saved.spritesheet));
			console.log("  Export:        " + saved.exportResolved);
			console.log("  TPS:           " + (saved.tpsResolved || saved.tps || "(not set)"));
			console.log("  Spine export:  " + (saved.spineExportResolved || saved.spineexport || "(not set)"));
			console.log("  Spine convert: " + (saved.spineConvertedResolved || saved.spineconverted || "(not set)"));
			if (saved.exportResolved) {
				try {
					fs.mkdirSync(saved.exportResolved, { recursive: true });
				} catch (_err) {
					// Keep the saved path; the UI will show why export is not usable.
				}
			}
			if (saved.spineConvertedResolved) {
				try {
					fs.mkdirSync(saved.spineConvertedResolved, { recursive: true });
				} catch (_err) {
					// Keep the saved path; convert will show why it is not usable.
				}
			}
			res.json(configPayload());
		} catch (err) {
			res.json(Object.assign(configPayload(), {
				saveError: err.message || String(err)
			}));
		}
	});

	router.get("/tps", (_req, res) => {
		try {
			res.json(tpsListing());
		} catch (err) {
			res.status(400).json({ error: err.message || String(err) });
		}
	});

	router.post("/pack", (req, res) => {
		packOneFromRequest(req).then((body) => {
			res.json(body);
		}).catch((err) => {
			res.status(400).json({ error: err.message || String(err) });
		});
	});

	router.post("/convert/prepare", (_req, res) => {
		prepareConvertCopy().then((body) => {
			res.json(body);
		}).catch((err) => {
			res.status(400).json({ error: err.message || String(err) });
		});
	});

	router.post("/convert", (req, res) => {
		convertOneFromRequest(req).then((body) => {
			res.json(body);
		}).catch((err) => {
			res.status(400).json({ error: err.message || String(err) });
		});
	});

	router.get("/spines", (_req, res) => {
		try {
			const cfg = loadBakerPaths();
			if (!cfg.spineExists) {
				res.status(400).json({ error: cfg.spineError || "Spine folder is missing" });
				return;
			}
			const names = fs.readdirSync(cfg.spineResolved)
				.filter((file) => file.toLowerCase().endsWith(".json"))
				.sort();
			const spines = names.map((file) => {
				const name = path.basename(file, ".json");
				return {
					name,
					url: "./spine/" + file
				};
			});
			res.json({
				spines,
				exportRoot: cfg.exportResolved
			});
		} catch (err) {
			res.status(400).json({ error: err.message || String(err) });
		}
	});

	router.post("/reset", (_req, res) => {
		const cfg = loadBakerPaths();
		if (!cfg.exportResolved) {
			res.status(400).json({ error: cfg.exportError || "Export folder is not usable" });
			return;
		}
		try {
			fs.mkdirSync(cfg.exportResolved, { recursive: true });
			const skipped = emptyFolderContents(cfg.exportResolved);
			res.json({
				ok: true,
				exportRoot: cfg.exportResolved,
				skipped
			});
		} catch (err) {
			res.status(400).json({ error: err.message || String(err) });
		}
	});

	router.post("/png", (req, res) => {
		const cfg = loadBakerPaths();
		if (!cfg.exportResolved) {
			res.status(400).json({ error: cfg.exportError || "Export folder is not usable" });
			return;
		}
		const group = String(req.body && req.body.group || "");
		const texName = String(req.body && req.body.texName || "");
		const pngBase64 = String(req.body && req.body.pngBase64 || "");
		if (!SAFE_NAME.test(group) || !SAFE_NAME.test(texName)) {
			res.status(400).json({ error: "Invalid group or texture name" });
			return;
		}
		if (!pngBase64) {
			res.status(400).json({ error: "Missing pngBase64" });
			return;
		}

		try {
			const folder = path.join(cfg.exportResolved, group);
			fs.mkdirSync(folder, { recursive: true });
			const filePath = path.join(folder, texName + ".png");
			fs.writeFileSync(filePath, Buffer.from(pngBase64, "base64"));
			res.json({
				path: filePath
			});
		} catch (err) {
			res.status(400).json({ error: err.message || String(err) });
		}
	});

	router.post("/manifest", (req, res) => {
		const cfg = loadBakerPaths();
		if (!cfg.exportResolved) {
			res.status(400).json({ error: cfg.exportError || "Export folder is not usable" });
			return;
		}
		try {
			const entries = Array.isArray(req.body && req.body.entries) ? req.body.entries : [];
			fs.mkdirSync(cfg.exportResolved, { recursive: true });
			const manifestPath = path.join(cfg.exportResolved, "manifest.json");
			fs.writeFileSync(manifestPath, JSON.stringify({
				generatedAt: new Date().toISOString(),
				count: entries.length,
				entries
			}, null, 2));
			res.json({ path: manifestPath });
		} catch (err) {
			res.status(400).json({ error: err.message || String(err) });
		}
	});

	return router;
}

function emptyFolderContents(root) {
	const skipped = [];
	clearDir(root, skipped, true);
	return skipped;
}

function clearDir(dir, skipped, keepSelf) {
	let entries = [];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (err) {
		skipped.push(dir + " (" + (err.message || String(err)) + ")");
		return;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			clearDir(full, skipped, false);
		} else {
			removePath(full, skipped);
		}
	}
	if (!keepSelf) {
		removePath(dir, skipped);
	}
}

function removePath(target, skipped) {
	try {
		fs.rmSync(target, {
			recursive: true,
			force: true,
			maxRetries: 8,
			retryDelay: 75
		});
	} catch (err) {
		skipped.push(path.basename(target) + " (" + (err.code || err.message || String(err)) + ")");
	}
}

function createSpineStatic() {
	return createFolderStatic("spine");
}

function createSpritesheetStatic() {
	return createFolderStatic("spritesheet");
}

function createFolderStatic(kind) {
	return function folderStatic(req, res) {
		serveFolderFile(kind, req, res).catch((err) => {
			if (!res.headersSent) {
				res.status(404).send(err && err.message ? err.message : String(err));
			}
		});
	};
}

async function serveFolderFile(kind, req, res) {
	const cfg = loadBakerPathsModule().loadBakerPaths();
	const exists = kind === "spine" ? cfg.spineExists : cfg.spritesheetExists;
	const folderError = kind === "spine" ? cfg.spineError : cfg.spritesheetError;
	const root = kind === "spine" ? cfg.spineResolved : cfg.spritesheetResolved;
	const label = kind === "spine" ? "Spine" : "Spritesheet";
	if (!exists) {
		res.status(404).send(folderError || label + " folder not found");
		return;
	}
	const name = path.basename(String(req.path || ""));
	if (!name || !SPINE_FILE_NAME.test(name)) {
		res.status(404).send("Invalid " + kind + " file name");
		return;
	}
	const src = path.join(root, name);
	if (!fs.existsSync(src)) {
		res.status(404).send("Missing " + name + " in " + root);
		return;
	}
	const localPath = await copySpineToLocalCache(src, root);
	if (name.toLowerCase().endsWith(".atlas")) {
		res.type("text/plain");
	}
	res.sendFile(localPath);
}

function copySpineToLocalCache(src, spineRoot) {
	const prev = spineCopyLocks.get(src) || Promise.resolve();
	const job = prev.then(function () {
		return copySpineToLocalCacheNow(src, spineRoot);
	}, function () {
		return copySpineToLocalCacheNow(src, spineRoot);
	});
	spineCopyLocks.set(src, job.catch(function () { /* keep queue moving */ }));
	return job;
}

async function copySpineToLocalCacheNow(src, spineRoot) {
	const hash = crypto.createHash("sha1").update(spineRoot).digest("hex").slice(0, 12);
	const dir = path.join(os.tmpdir(), "fp-baker-spine", hash);
	await fs.promises.mkdir(dir, { recursive: true });
	const dest = path.join(dir, path.basename(src));
	let copyNeeded = true;
	try {
		const [srcStat, destStat] = await Promise.all([
			fs.promises.stat(src),
			fs.promises.stat(dest)
		]);
		copyNeeded = srcStat.mtimeMs > destStat.mtimeMs || srcStat.size !== destStat.size;
	} catch (_err) {
		copyNeeded = true;
	}
	if (copyNeeded) {
		await fs.promises.copyFile(src, dest);
	}
	return dest;
}

function loadBakerPathsModule() {
	const id = require.resolve("./bakerPaths");
	delete require.cache[id];
	return require("./bakerPaths");
}

function loadTpsPacker() {
	const id = require.resolve("./tpsPacker");
	delete require.cache[id];
	return require("./tpsPacker");
}

function loadRgbaConvert() {
	const id = require.resolve("./rgbaConvert");
	delete require.cache[id];
	return require("./rgbaConvert");
}

function tpsListing() {
	const cfg = loadBakerPathsModule().loadBakerPaths();
	const packer = loadTpsPacker();
	const cli = packer.findTexturePackerCli();
	const files = cfg.tpsExists ? packer.listTpsFiles(cfg.tpsResolved) : [];
	return {
		cli: cli.cli,
		cliError: cli.error,
		folder: cfg.tpsResolved || cfg.tps,
		folderError: cfg.tpsError,
		files: files.map((file) => ({
			name: file.name,
			relative: file.relative
		}))
	};
}

async function packOneFromRequest(req) {
	const cfg = loadBakerPathsModule().loadBakerPaths();
	if (!cfg.tpsExists) {
		throw new Error(cfg.tpsError || "TexturePacker .tps folder is not set");
	}
	const packer = loadTpsPacker();
	const cli = packer.findTexturePackerCli();
	if (cli.error) {
		throw new Error(cli.error);
	}
	const relative = String(req.body && req.body.relative || "").trim();
	if (!relative) {
		throw new Error("Missing .tps file (relative)");
	}
	const tpsFile = packer.resolveListedTps(cfg.tpsResolved, relative);
	console.log("[baker] packing " + tpsFile);
	const result = await packer.packTpsFile(cli.cli, tpsFile);
	return {
		ok: result.ok,
		relative: relative,
		file: tpsFile,
		code: result.code,
		stdout: result.stdout,
		stderr: result.stderr
	};
}

async function prepareConvertCopy() {
	const cfg = loadBakerPathsModule().loadBakerPaths();
	if (!cfg.spineExportExists) {
		throw new Error(cfg.spineExportError || "Spine export convert folder is not set");
	}
	if (!cfg.spineconverted) {
		throw new Error(cfg.spineConvertedError || "Converted spine output folder is not set");
	}
	const convert = loadRgbaConvert();
	if (cfg.spineConvertedResolved) {
		fs.mkdirSync(cfg.spineConvertedResolved, { recursive: true });
	}
	const dest = cfg.spineConvertedResolved || convertDestFromConfig(cfg);
	console.log("[baker] copying spine export to " + dest);
	const skipped = convert.copyFolderContents(cfg.spineExportResolved, dest);
	const files = convert.listPngFiles(dest);
	return {
		folder: dest,
		copiedFrom: cfg.spineExportResolved,
		skipped: skipped,
		files: files.map((file) => ({
			name: file.name,
			relative: file.relative
		}))
	};
}

function convertDestFromConfig(cfg) {
	if (cfg.spineConvertedResolved) {
		return cfg.spineConvertedResolved;
	}
	throw new Error(cfg.spineConvertedError || "Converted spine output folder is not usable");
}

async function convertOneFromRequest(req) {
	const cfg = loadBakerPathsModule().loadBakerPaths();
	if (!cfg.spineConvertedExists && !cfg.spineConvertedResolved) {
		throw new Error(cfg.spineConvertedError || "Converted spine output folder is not set");
	}
	const convert = loadRgbaConvert();
	const dest = cfg.spineConvertedResolved;
	if (!dest) {
		throw new Error(cfg.spineConvertedError || "Converted spine output folder is not usable");
	}
	const relative = String(req.body && req.body.relative || "").trim();
	if (!relative) {
		throw new Error("Missing PNG file (relative)");
	}
	const pngFile = convert.resolveListedPng(dest, relative);
	const result = await convert.convertPngFile(pngFile);
	return {
		ok: result.ok,
		relative: relative,
		file: pngFile,
		code: result.code,
		stdout: result.stdout,
		stderr: result.stderr
	};
}

function configPayload() {
	const paths = loadBakerPathsModule();
	const cfg = paths.loadBakerPaths();
	const lan = paths.listLanIPv4();
	return {
		spine: cfg.spine,
		export: cfg.export,
		spritesheet: cfg.spritesheet,
		tps: cfg.tps,
		spineexport: cfg.spineexport,
		spineconverted: cfg.spineconverted,
		spineResolved: cfg.spineResolved,
		exportResolved: cfg.exportResolved,
		spritesheetResolved: cfg.spritesheetResolved,
		tpsResolved: cfg.tpsResolved,
		spineExportResolved: cfg.spineExportResolved,
		spineConvertedResolved: cfg.spineConvertedResolved,
		spineExists: cfg.spineExists,
		exportExists: cfg.exportExists,
		spritesheetExists: cfg.spritesheetExists,
		tpsExists: cfg.tpsExists,
		spineExportExists: cfg.spineExportExists,
		spineConvertedExists: cfg.spineConvertedExists,
		spineError: cfg.spineError,
		exportError: cfg.exportError,
		spritesheetError: cfg.spritesheetError,
		tpsError: cfg.tpsError,
		spineExportError: cfg.spineExportError,
		spineConvertedError: cfg.spineConvertedError,
		file: cfg.file,
		defaultFile: cfg.defaultFile,
		usingUserFile: cfg.usingUserFile,
		port: PORT,
		localhost: "http://127.0.0.1:" + PORT + "/",
		lanUrls: lan.map((ip) => "http://" + ip + ":" + PORT + "/")
	};
}

module.exports = { createExportRouter, createSpineStatic, createSpritesheetStatic };
