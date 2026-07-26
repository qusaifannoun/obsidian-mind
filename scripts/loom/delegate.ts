#!/usr/bin/env -S node --experimental-strip-types
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "./lib/config.ts";
import { orchestrateJob } from "./lib/orchestrate.ts";
import { report } from "./lib/report.ts";
import type { Job } from "./lib/types.ts";

const DEFAULT_CONFIG = "scripts/loom/stations.config.json";

type DelegateOptions = {
	readonly task: string;
	readonly station: string | undefined;
	readonly test: string | undefined;
	readonly id: string | undefined;
	readonly base: string | undefined;
	readonly configPath: string;
	readonly merge: boolean;
	readonly keep: boolean;
};

function parseArgs(argv: readonly string[]): DelegateOptions {
	const positional: string[] = [];
	let station: string | undefined;
	let test: string | undefined;
	let id: string | undefined;
	let base: string | undefined;
	let configPath = DEFAULT_CONFIG;
	let merge = false;
	let keep = false;
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === undefined) continue;
		if (a === "--merge") merge = true;
		else if (a === "--keep") keep = true;
		else if (a === "--station") station = argv[++i];
		else if (a === "--test") test = argv[++i];
		else if (a === "--id") id = argv[++i];
		else if (a === "--base") base = argv[++i];
		else if (a === "--config") configPath = argv[++i] ?? configPath;
		else if (!a.startsWith("--")) positional.push(a);
	}
	const task = positional.join(" ").trim();
	if (!task) {
		throw new Error(
			'Usage: delegate "<task>" [--station codex] [--test "<cmd>"] [--id name] [--base branch] [--merge] [--keep]',
		);
	}
	return { task, station, test, id, base, configPath, merge, keep };
}

function slug(text: string): string {
	const s = text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40)
		.replace(/-+$/, "");
	return s || "task";
}

function absDir(base: string): string {
	return isAbsolute(base) ? base : resolve(process.cwd(), base);
}

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	const config = loadConfig(options.configPath);
	const id = options.id ?? slug(options.task);

	const plansDir = join(dirname(absDir(config.worktreeBase)), "plans");
	mkdirSync(plansDir, { recursive: true });
	const planPath = join(plansDir, `${id}.md`);
	writeFileSync(planPath, `${options.task}\n`, "utf-8");

	const slice = {
		id,
		plan: planPath,
		...(options.station !== undefined ? { station: options.station } : {}),
		...(options.test !== undefined ? { test: options.test } : {}),
	};
	const job: Job = {
		...(options.base !== undefined ? { base: options.base } : {}),
		slices: [slice],
	};

	const stationName = options.station ?? config.defaultStation;
	process.stderr.write(
		`\nDelegating "${options.task}" → station "${stationName}" (slice ${id})\n`,
	);

	const outcomes = await orchestrateJob(job, config, options);
	report(outcomes, options.merge);
	const failed = outcomes.some((o) => o.status === "red" || o.status === "error");
	process.exit(failed ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main().catch((e) => {
		process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
		process.exit(1);
	});
}
