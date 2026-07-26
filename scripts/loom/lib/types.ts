export type StationConfig = {
	readonly command: string;
	readonly args: readonly string[];
	readonly cwd?: string;
	readonly timeoutMs?: number;
};

export type OrchestratorConfig = {
	readonly worktreeBase: string;
	readonly reportBase: string;
	readonly defaultStation: string;
	readonly stations: Readonly<Record<string, StationConfig>>;
};

export type Slice = {
	readonly id: string;
	readonly plan: string;
	readonly station?: string;
	readonly test?: string;
	readonly deps?: readonly string[];
	readonly branch?: string;
};

export type Job = {
	readonly base?: string;
	readonly slices: readonly Slice[];
};

export type StationPlaceholders = {
	readonly worktree: string;
	readonly promptFile: string;
	readonly promptText: string;
	readonly output: string;
};

export type SliceStatus = "green" | "red" | "error" | "skipped";

export type SliceOutcome = {
	readonly id: string;
	readonly station: string;
	readonly branch: string;
	readonly worktree: string;
	readonly changed: boolean;
	readonly diffStat: string;
	readonly testPassed: boolean | null;
	readonly merged: boolean;
	readonly reportPath: string;
	readonly status: SliceStatus;
	readonly detail: string;
};

export type RunOptions = {
	readonly configPath: string;
	readonly jobPath: string;
	readonly merge: boolean;
	readonly keep: boolean;
};
