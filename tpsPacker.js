"use strict";

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const PACK_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_DEPTH = 8;

function findTexturePackerCli() {
	const extras = [
		process.env.ProgramFiles && path.join(process.env.ProgramFiles, "CodeAndWeb", "TexturePacker", "bin", "TexturePacker.exe"),
		"C:\\Program Files\\CodeAndWeb\\TexturePacker\\bin\\TexturePacker.exe",
		process.env["ProgramFiles(x86)"] && path.join(process.env["ProgramFiles(x86)"], "CodeAndWeb", "TexturePacker", "bin", "TexturePacker.exe"),
		"/usr/local/bin/TexturePacker",
		"/Applications/TexturePacker.app/Contents/MacOS/TexturePacker"
	].filter(Boolean);

	for (let i = 0; i < extras.length; i++) {
		if (fs.existsSync(extras[i])) {
			return { cli: extras[i], error: null };
		}
	}

	const which = process.platform === "win32" ? "where" : "which";
	const result = spawnSync(which, ["TexturePacker"], {
		encoding: "utf8",
		windowsHide: true,
		shell: process.platform === "win32"
	});
	const line = String(result.stdout || "").split(/\r?\n/).map(function (item) {
		return item.trim();
	}).filter(Boolean)[0];
	if (line && fs.existsSync(line)) {
		return { cli: line, error: null };
	}

	return {
		cli: "",
		error: "TexturePacker CLI was not found. Install TexturePacker, then use File / Install Command Line Tool."
	};
}

function listTpsFiles(root) {
	const files = [];
	walkTps(root, root, 0, files);
	files.sort(function (a, b) {
		return a.relative.localeCompare(b.relative, undefined, { sensitivity: "base" });
	});
	return files;
}

function walkTps(root, dir, depth, out) {
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
			walkTps(root, full, depth + 1, out);
		} else if (ent.isFile() && name.toLowerCase().endsWith(".tps")) {
			out.push({
				name: name,
				path: full,
				relative: path.relative(root, full)
			});
		}
	}
}

function resolveListedTps(root, relative) {
	const trimmed = String(relative || "").trim();
	if (!trimmed || path.isAbsolute(trimmed)) {
		throw new Error("Invalid .tps path");
	}
	const resolved = path.resolve(root, trimmed);
	const rootResolved = path.resolve(root);
	const rel = path.relative(rootResolved, resolved);
	if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
		throw new Error("Refusing to pack a file outside the .tps folder");
	}
	if (!resolved.toLowerCase().endsWith(".tps")) {
		throw new Error("Not a .tps file");
	}
	if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
		throw new Error("Missing " + resolved);
	}
	return resolved;
}

function packTpsFile(cli, tpsFile) {
	return new Promise(function (resolve) {
		const child = spawn(cli, ["--force-publish", tpsFile], {
			windowsHide: true,
			env: process.env
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", function (chunk) {
			stdout += chunk.toString("utf8");
		});
		child.stderr.on("data", function (chunk) {
			stderr += chunk.toString("utf8");
		});
		const timer = setTimeout(function () {
			child.kill();
		}, PACK_TIMEOUT_MS);
		child.on("error", function (err) {
			clearTimeout(timer);
			resolve({
				ok: false,
				code: -1,
				file: tpsFile,
				stdout: stdout.trim(),
				stderr: ((stderr ? stderr + "\n" : "") + (err.message || String(err))).trim()
			});
		});
		child.on("close", function (code, signal) {
			clearTimeout(timer);
			const timedOut = signal === "SIGTERM" || signal === "SIGKILL";
			resolve({
				ok: code === 0,
				code: code == null ? -1 : code,
				file: tpsFile,
				stdout: stdout.trim(),
				stderr: (stderr.trim() + (timedOut ? "\nTimed out after 5 minutes" : "")).trim()
			});
		});
	});
}

module.exports = {
	findTexturePackerCli,
	listTpsFiles,
	resolveListedTps,
	packTpsFile
};
