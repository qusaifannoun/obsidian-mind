#!/usr/bin/env node
import { fileURLToPath } from "node:url";

import { orchestrate } from "./lib/orchestrate.ts";
import { report } from "./lib/report.ts";
import type { RunOptions } from "./lib/types.ts";

const DEFAULT_CONFIG = "scripts/loom/stations.config.json";

function parseArgs(argv: readonly string[]): RunOptions {
	let jobPath: string | null = null;
	let configPath = DEFAULT_CONFIG;
	let merge = false;
	let keep = false;
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === undefined) continue;
		if (a === "--merge") merge = true;
		else if (a === "--keep") keep = true;
		else if (a === "--config") {
			const next = argv[++i];
			if (next !== undefined) configPath = next;
		} else if (!a.startsWith("--")) jobPath = a;
	}
	if (!jobPath) {
		throw new Error(
			"Usage: node --experimental-strip-types scripts/loom/run.ts <job.json> [--config path] [--merge] [--keep]",
		);
	}
	return { jobPath, configPath, merge, keep };
}

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	const outcomes = await orchestrate(options);
	report(outcomes, options.merge);
	const failed = outcomes.some(
		(o) => o.status === "red" || o.status === "error",
	);
	process.exit(failed ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main().catch((e) => {
		process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
		process.exit(1);
	});
}
