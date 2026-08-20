const fs = require("fs");
const path = require("path");
const express = require("express");

const SAFE_NAME = /^[A-Za-z0-9_.-]+$/;
const SPINE_DIR = path.resolve(__dirname, "static", "spine");
const EXPORT_ROOT = path.resolve(__dirname, "export", "png");

function createExportRouter() {
	const router = express.Router();
	router.use(express.json({ limit: "64mb" }));

	router.get("/spines", (_req, res) => {
		if (!fs.existsSync(SPINE_DIR)) {
			res.status(500).json({ error: "static/spine is missing" });
			return;
		}
		const names = fs.readdirSync(SPINE_DIR)
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
			exportRoot: "export/png/<group>/"
		});
	});

	router.post("/reset", (_req, res) => {
		if (fs.existsSync(EXPORT_ROOT)) {
			fs.rmSync(EXPORT_ROOT, { recursive: true, force: true });
		}
		fs.mkdirSync(EXPORT_ROOT, { recursive: true });
		res.json({ ok: true, exportRoot: "export/png/<animation or blur>/" });
	});

	router.post("/png", (req, res) => {
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

		const folder = path.join(EXPORT_ROOT, group);
		fs.mkdirSync(folder, { recursive: true });
		const filePath = path.join(folder, texName + ".png");
		fs.writeFileSync(filePath, Buffer.from(pngBase64, "base64"));
		res.json({
			path: "export/png/" + group + "/" + texName + ".png"
		});
	});

	router.post("/manifest", (req, res) => {
		const entries = Array.isArray(req.body && req.body.entries) ? req.body.entries : [];
		fs.mkdirSync(EXPORT_ROOT, { recursive: true });
		const manifestPath = path.join(EXPORT_ROOT, "manifest.json");
		fs.writeFileSync(manifestPath, JSON.stringify({
			generatedAt: new Date().toISOString(),
			count: entries.length,
			entries
		}, null, 2));
		res.json({ path: "export/png/manifest.json" });
	});

	return router;
}

module.exports = { createExportRouter };
