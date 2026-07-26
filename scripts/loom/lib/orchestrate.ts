import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { loadConfig, loadJob, topoLayers } from "./config.ts";
import {
	addWorktree,
	currentBranch,
	diffStat,
	exec,
	git,
	hasChanges,
	mergeBranch,
	removeWorktree,
	stageAll,
	workingTreeClean,
} from "./proc.ts";
import { resolvePlaceholders, runStation } from "./station.ts";
import type {
	Job,
	OrchestratorConfig,
	RunOptions,
	Slice,
	SliceOutcome,
} from "./types.ts";

function absDir(base: string): string {
	return isAbsolute(base) ? base : resolve(process.cwd(), base);
}

function ensureDir(path: string): void {
	mkdirSync(path, { recursive: true });
}

function resetWorktree(path: string, branch: string): void {
	if (existsSync(path)) removeWorktree(path);
	git(["worktree", "prune"]);
	git(["branch", "-D", branch]);
}

async function runTest(command: string, cwd: string): Promise<boolean> {
	const r = await exec("bash", ["-c", command], { cwd });
	return r.status === 0;
}

async function runSlice(
	slice: Slice,
	config: OrchestratorConfig,
	base: string,
	worktreeDir: string,
	reportDir: string,
): Promise<SliceOutcome> {
	const stationName = slice.station ?? config.defaultStation;
	const station = config.stations[stationName];
	const branch = slice.branch ?? `orch/${slice.id}`;
	const worktree = join(worktreeDir, slice.id);
	const reportPath = join(reportDir, `${slice.id}.md`);

	const shell = (detail: string, status: SliceOutcome["status"]): SliceOutcome => ({
		id: slice.id,
		station: stationName,
		branch,
		worktree,
		changed: false,
		diffStat: "",
		testPassed: null,
		merged: false,
		reportPath,
		status,
		detail,
	});

	if (!station) {
		return shell(`Unknown station "${stationName}".`, "error");
	}

	resetWorktree(worktree, branch);
	const added = addWorktree(worktree, branch, base);
	if (added.status !== 0) {
		return shell(`worktree add failed: ${added.stderr.trim()}`, "error");
	}

	const placeholders = resolvePlaceholders({
		worktree,
		promptFile: resolve(process.cwd(), slice.plan),
		output: reportPath,
	});
	process.stderr.write(`\n→ [${slice.id}] station "${stationName}" running…\n`);
	const run = await runStation(station, placeholders, { stream: slice.id });

	stageAll(worktree);
	const changed = hasChanges(worktree, base);
	const stat = diffStat(worktree, base);

	let testPassed: boolean | null = null;
	if (slice.test) testPassed = await runTest(slice.test, worktree);

	let status: SliceOutcome["status"];
	let detail: string;
	if (run.status !== 0 && !changed) {
		status = "error";
		detail = `station exited ${run.status ?? "null"} with no changes`;
	} else if (!changed) {
		status = "red";
		detail = "station produced no changes";
	} else if (testPassed === false) {
		status = "red";
		detail = "changes produced, test failed";
	} else {
		status = "green";
		detail = testPassed === true ? "changes produced, test passed" : "changes produced";
	}

	return {
		id: slice.id,
		station: stationName,
		branch,
		worktree,
		changed,
		diffStat: stat,
		testPassed,
		merged: false,
		reportPath,
		status,
		detail,
	};
}

export async function orchestrate(
	options: RunOptions,
): Promise<SliceOutcome[]> {
	const config = loadConfig(options.configPath);
	const job = loadJob(options.jobPath);
	return orchestrateJob(job, config, options);
}

export async function orchestrateJob(
	job: Job,
	config: OrchestratorConfig,
	options: { merge: boolean; keep: boolean },
): Promise<SliceOutcome[]> {
	const base = job.base ?? currentBranch();

	const worktreeDir = absDir(config.worktreeBase);
	const reportDir = absDir(config.reportBase);
	ensureDir(dirname(worktreeDir));
	ensureDir(worktreeDir);
	ensureDir(reportDir);

	const layers = topoLayers(job.slices);
	const outcomes: SliceOutcome[] = [];

	for (const layer of layers) {
		const results = await Promise.all(
			layer.map((slice) =>
				runSlice(slice, config, base, worktreeDir, reportDir),
			),
		);

		for (const result of results) {
			let final = result;
			if (
				options.merge &&
				result.status === "green" &&
				currentBranch() === base &&
				workingTreeClean()
			) {
				const merged = mergeBranch(result.branch);
				final = {
					...result,
					merged: merged.status === 0,
					detail:
						merged.status === 0
							? `${result.detail}; merged into ${base}`
							: `${result.detail}; merge failed: ${merged.stderr.trim()}`,
				};
			}
			outcomes.push(final);
			if (!options.keep) resetWorktree(result.worktree, result.branch);
		}
	}

	return outcomes;
}
