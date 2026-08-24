"use strict";

const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const PORT = 3456;
const BAKER_URL = "http://" + HOST + ":" + PORT + "/";
const AUTOBAKE_URL = BAKER_URL + "?autobake=1";
const IS_WIN = process.platform === "win32";

process.chdir(ROOT);

async function main() {
	printBanner();

	if (!hasNpm()) {
		console.error("npm was not found. Install Node.js LTS from https://nodejs.org then try again.");
		process.exit(1);
	}

	if (await isBakerUp()) {
		console.log("Baker is already running. Opening the browser to bake…");
		openBrowser(AUTOBAKE_URL);
		return;
	}

	if (!fs.existsSync(path.join(ROOT, "node_modules"))) {
		console.log("Installing npm packages (first run only)…");
		const install = runNpm(["install"]);
		if (install !== 0) {
			console.error("npm install failed.");
			process.exit(install || 1);
		}
		console.log("");
	}

	console.log("Starting baker. Leave this window open. Press Ctrl+C to stop.");
	console.log("PNGs write to export" + path.sep + "png" + path.sep);
	console.log("");

	const child = spawnNpm(["start"]);
	waitForBaker(90000)
		.then(function () {
			console.log("Opening " + AUTOBAKE_URL);
			openBrowser(AUTOBAKE_URL);
		})
		.catch(function (err) {
			console.error(err.message);
		});

	child.on("exit", function (code, signal) {
		if (signal) {
			process.exit(0);
		}
		process.exit(code == null ? 1 : code);
	});
}

function printBanner() {
	console.log("");
	console.log("Static Spine baker");
	console.log("  " + AUTOBAKE_URL);
	console.log("");
}

function hasNpm() {
	const result = spawnSync(npmFile(), ["--version"], {
		cwd: ROOT,
		stdio: "pipe",
		shell: IS_WIN,
		windowsHide: true,
		encoding: "utf8"
	});
	return result.status === 0;
}

function runNpm(args) {
	const result = spawnSync(npmFile(), args, {
		cwd: ROOT,
		stdio: "inherit",
		shell: IS_WIN,
		windowsHide: false
	});
	return result.status == null ? 1 : result.status;
}

function spawnNpm(args) {
	return spawn(npmFile(), args, {
		cwd: ROOT,
		stdio: "inherit",
		shell: IS_WIN,
		windowsHide: false
	});
}

function npmFile() {
	return IS_WIN ? "npm.cmd" : "npm";
}

function isBakerUp() {
	return new Promise(function (resolve) {
		probeBaker(800, resolve);
	});
}

function waitForBaker(timeoutMs) {
	const started = Date.now();
	return new Promise(function (resolve, reject) {
		function attempt() {
			probeBaker(400, function (ok) {
				if (ok) {
					resolve();
					return;
				}
				if (Date.now() - started > timeoutMs) {
					reject(new Error("Baker did not start at " + BAKER_URL + " in time."));
					return;
				}
				setTimeout(attempt, 400);
			});
		}
		attempt();
	});
}

function probeBaker(timeoutMs, done) {
	const req = http.get(BAKER_URL, function (res) {
		res.resume();
		done(true);
	});
	req.on("error", function () {
		done(false);
	});
	req.setTimeout(timeoutMs, function () {
		req.destroy();
		done(false);
	});
}

function openBrowser(url) {
	if (IS_WIN) {
		spawn("cmd", ["/c", "start", "", url], {
			detached: true,
			stdio: "ignore",
			windowsHide: true
		}).unref();
		return;
	}
	if (process.platform === "darwin") {
		spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
		return;
	}
	spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

main().catch(function (err) {
	console.error(err && err.stack ? err.stack : String(err));
	process.exit(1);
});
