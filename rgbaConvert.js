"use strict";

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const CONVERT_TIMEOUT_MS = 90 * 1000;
const MAX_DEPTH = 8;
const BAT_PATH = path.join(__dirname, "scripts", "convert-rgba5555.bat");

function listPngFiles(root) {
	const files = [];
	walkPng(root, root, 0, files);
	files.sort(function (a, b) {
		return a.relative.localeCompare(b.relative, undefined, { sensitivity: "base" });
	});
	return files;
}

function walkPng(root, dir, depth, out) {
	if (depth > MAX_DEPTH) {
		return;
	}
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (_err) {
		return;
	}
	for (let i = 0; i < entries.length; i++) {
		const ent = entries[i];
		const name = ent.name;
		if (!name || name.charAt(0) === "." || name === "node_modules") {
			continue;
		}
		const full = path.join(dir, name);
		if (ent.isDirectory()) {
			walkPng(root, full, depth + 1, out);
		} else if (ent.isFile() && name.toLowerCase().endsWith(".png")) {
			out.push({
				name: name,
				path: full,
				relative: path.relative(root, full)
			});
		}
	}
}

function assertDistinctFolders(src, dest) {
	const a = path.resolve(src);
	const b = path.resolve(dest);
	if (a.toLowerCase() === b.toLowerCase()) {
		throw new Error("Convert input and output must be different folders");
	}
	const outRel = path.relative(a, b);
	if (outRel && !outRel.startsWith("..") && !path.isAbsolute(outRel)) {
		throw new Error("Convert output cannot sit inside the input folder");
	}
	const inRel = path.relative(b, a);
	if (inRel && !inRel.startsWith("..") && !path.isAbsolute(inRel)) {
		throw new Error("Convert input cannot sit inside the output folder");
	}
}

function copyFolderContents(src, dest) {
	assertDistinctFolders(src, dest);
	fs.mkdirSync(dest, { recursive: true });
	const skipped = emptyFolderContents(dest);
	const entries = fs.readdirSync(src, { withFileTypes: true });
	for (let i = 0; i < entries.length; i++) {
		const name = entries[i].name;
		fs.cpSync(path.join(src, name), path.join(dest, name), { recursive: true });
	}
	return skipped;
}

function emptyFolderContents(root) {
	const skipped = [];
	let entries = [];
	try {
		entries = fs.readdirSync(root, { withFileTypes: true });
	} catch (_err) {
		return skipped;
	}
	for (let i = 0; i < entries.length; i++) {
		const full = path.join(root, entries[i].name);
		try {
			fs.rmSync(full, {
				recursive: true,
				force: true,
				maxRetries: 8,
				retryDelay: 75
			});
		} catch (err) {
			skipped.push(path.basename(full) + " (" + (err.code || err.message || String(err)) + ")");
		}
	}
	return skipped;
}

function resolveListedPng(root, relative) {
	const trimmed = String(relative || "").trim();
	if (!trimmed || path.isAbsolute(trimmed)) {
		throw new Error("Invalid PNG path");
	}
	const resolved = path.resolve(root, trimmed);
	const rootResolved = path.resolve(root);
	const rel = path.relative(rootResolved, resolved);
	if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
		throw new Error("Refusing to convert a file outside the convert output folder");
	}
	if (!resolved.toLowerCase().endsWith(".png")) {
		throw new Error("Not a PNG file");
	}
	if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
		throw new Error("Missing " + resolved);
	}
	return resolved;
}

function convertPngFile(pngFile) {
	if (!fs.existsSync(BAT_PATH)) {
		return Promise.resolve({
			ok: false,
			code: -1,
			file: pngFile,
			stdout: "",
			stderr: "Missing " + BAT_PATH
		});
	}
	return new Promise(function (resolve) {
		let finished = false;
		let timedOut = false;
		const child = spawn("cmd.exe", ["/d", "/c", BAT_PATH, pngFile], {
			cwd: path.dirname(pngFile),
			windowsHide: true,
			stdio: ["ignore", "pipe", "pipe"],
			env: process.env
		});
		let stdout = "";
		let stderr = "";
		if (child.stdout) {
			child.stdout.on("data", function (chunk) {
				stdout += chunk.toString("utf8");
			});
		}
		if (child.stderr) {
			child.stderr.on("data", function (chunk) {
				stderr += chunk.toString("utf8");
			});
		}
		console.log("[baker] convert-rgba5555 " + pngFile);
		const timer = setTimeout(function () {
			timedOut = true;
			console.log("[baker] convert timed out, killing PID " + child.pid);
			killProcessTree(child);
			setTimeout(function () {
				finish({
					ok: false,
					code: -1,
					file: pngFile,
					stdout: stdout.trim(),
					stderr: timeoutMessage(stderr)
				});
			}, 1500);
		}, CONVERT_TIMEOUT_MS);

		function finish(result) {
			if (finished) {
				return;
			}
			finished = true;
			clearTimeout(timer);
			resolve(result);
		}

		child.on("error", function (err) {
			finish({
				ok: false,
				code: -1,
				file: pngFile,
				stdout: stdout.trim(),
				stderr: ((stderr ? stderr + "\n" : "") + (err.message || String(err))).trim()
			});
		});
		child.on("close", function (code) {
			if (timedOut) {
				finish({
					ok: false,
					code: code == null ? -1 : code,
					file: pngFile,
					stdout: stdout.trim(),
					stderr: timeoutMessage(stderr)
				});
				return;
			}
			finish({
				ok: code === 0,
				code: code == null ? -1 : code,
				file: pngFile,
				stdout: stdout.trim(),
				stderr: stderr.trim()
			});
		});
	});
}

function timeoutMessage(stderr) {
	return (String(stderr || "").trim() + "\nTimed out after " + (CONVERT_TIMEOUT_MS / 1000) + "s and killed the converter").trim();
}

function killProcessTree(child) {
	if (!child || !child.pid) {
		return;
	}
	if (process.platform === "win32") {
		spawnSync("taskkill", ["/F", "/T", "/PID", String(child.pid)], {
			windowsHide: true,
			stdio: "ignore"
		});
		return;
	}
	try {
		child.kill("SIGKILL");
	} catch (_err) {
		// already exited
	}
}

module.exports = {
	BAT_PATH,
	listPngFiles,
	copyFolderContents,
	resolveListedPng,
	convertPngFile
};
