import { readFileSync } from "node:fs";

import { exec, type ProcResult } from "./proc.ts";
import type { StationConfig, StationPlaceholders } from "./types.ts";

function readPlan(promptFile: string): string {
	try {
		return readFileSync(promptFile, "utf-8");
	} catch {
		return "";
	}
}

function substitute(input: string, vars: Record<string, string>): string {
	return input.replace(/\{(\w+)\}/g, (match, key: string) => {
		const value = vars[key];
		return value !== undefined ? value : match;
	});
}

export function resolvePlaceholders(
	base: Omit<StationPlaceholders, "promptText">,
): StationPlaceholders {
	return { ...base, promptText: readPlan(base.promptFile) };
}

export function runStation(
	station: StationConfig,
	placeholders: StationPlaceholders,
	options: { stream?: string } = {},
): Promise<ProcResult> {
	const vars: Record<string, string> = {
		worktree: placeholders.worktree,
		promptFile: placeholders.promptFile,
		promptText: placeholders.promptText,
		output: placeholders.output,
	};
	const command = substitute(station.command, vars);
	const args = station.args.map((a) => substitute(a, vars));
	const cwd = station.cwd ? substitute(station.cwd, vars) : placeholders.worktree;
	const execOptions: { cwd: string; timeoutMs?: number; stream?: string } = { cwd };
	if (station.timeoutMs !== undefined) execOptions.timeoutMs = station.timeoutMs;
	if (options.stream !== undefined) execOptions.stream = options.stream;
	return exec(command, args, execOptions);
}
