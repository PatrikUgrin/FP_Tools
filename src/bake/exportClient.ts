export async function resetExport(): Promise<void> {
	const response = await fetch("/api/reset", { method: "POST" });
	if (!response.ok) {
		throw new Error("Failed to clear export/png (" + response.status + ")");
	}
}

export async function savePng(group: string, texName: string, pngBase64: string): Promise<string> {
	const response = await fetch("/api/png", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			group,
			texName,
			pngBase64
		})
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error("Save failed for " + group + "/" + texName + ": " + text);
	}
	const body = await response.json() as { path: string };
	return body.path;
}

export async function saveManifest(entries: Array<{ group: string; texName: string; path: string }>): Promise<void> {
	const response = await fetch("/api/manifest", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ entries })
	});
	if (!response.ok) {
		throw new Error("Failed to write manifest (" + response.status + ")");
	}
}
