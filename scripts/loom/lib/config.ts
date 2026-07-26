import { readFileSync } from "node:fs";

import type { Job, OrchestratorConfig, Slice } from "./types.ts";

export function loadConfig(path: string): OrchestratorConfig {
	const parsed = JSON.parse(readFileSync(path, "utf-8")) as OrchestratorConfig;
	if (!parsed.stations || typeof parsed.stations !== "object") {
		throw new Error(`Config ${path} has no "stations" map.`);
	}
	if (!parsed.defaultStation) {
		throw new Error(`Config ${path} has no "defaultStation".`);
	}
	if (!parsed.stations[parsed.defaultStation]) {
		throw new Error(
			`Config ${path} defaultStation "${parsed.defaultStation}" is not defined in "stations".`,
		);
	}
	return {
		worktreeBase: parsed.worktreeBase ?? "../.loom/worktrees",
		reportBase: parsed.reportBase ?? "../.loom/reports",
		defaultStation: parsed.defaultStation,
		stations: parsed.stations,
	};
}

export function loadJob(path: string): Job {
	const parsed = JSON.parse(readFileSync(path, "utf-8")) as Job;
	if (!Array.isArray(parsed.slices) || parsed.slices.length === 0) {
		throw new Error(`Job ${path} has no "slices".`);
	}
	const ids = new Set<string>();
	for (const s of parsed.slices) {
		if (!s.id) throw new Error(`Job ${path} has a slice with no "id".`);
		if (ids.has(s.id)) throw new Error(`Job ${path} has duplicate slice id "${s.id}".`);
		ids.add(s.id);
		if (!s.plan) throw new Error(`Slice "${s.id}" has no "plan" path.`);
	}
	return parsed;
}

export function topoLayers(slices: readonly Slice[]): Slice[][] {
	const byId = new Map(slices.map((s) => [s.id, s]));
	for (const s of slices) {
		for (const d of s.deps ?? []) {
			if (!byId.has(d)) {
				throw new Error(`Slice "${s.id}" depends on unknown slice "${d}".`);
			}
		}
	}
	const done = new Set<string>();
	const layers: Slice[][] = [];
	let remaining = [...slices];
	while (remaining.length > 0) {
		const ready = remaining.filter((s) =>
			(s.deps ?? []).every((d) => done.has(d)),
		);
		if (ready.length === 0) {
			throw new Error(
				`Dependency cycle among: ${remaining.map((s) => s.id).join(", ")}`,
			);
		}
		for (const s of ready) done.add(s.id);
		layers.push(ready);
		remaining = remaining.filter((s) => !done.has(s.id));
	}
	return layers;
}
