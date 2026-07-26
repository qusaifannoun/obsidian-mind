import { spawn, spawnSync } from "node:child_process";

export type ProcResult = {
	readonly status: number | null;
	readonly stdout: string;
	readonly stderr: string;
};

type LineTee = { feed: (chunk: string) => void; flush: () => void };

function lineTee(label: string, sink: NodeJS.WritableStream): LineTee {
	let buffer = "";
	const emit = (line: string) => sink.write(`  ${label} │ ${line}\n`);
	return {
		feed(chunk) {
			buffer += chunk;
			let idx = buffer.indexOf("\n");
			while (idx !== -1) {
				emit(buffer.slice(0, idx));
				buffer = buffer.slice(idx + 1);
				idx = buffer.indexOf("\n");
			}
		},
		flush() {
			if (buffer.length > 0) {
				emit(buffer);
				buffer = "";
			}
		},
	};
}

export function exec(
	command: string,
	args: readonly string[],
	options: { cwd?: string; timeoutMs?: number; stream?: string } = {},
): Promise<ProcResult> {
	return new Promise((resolve) => {
		const child = spawn(command, args as string[], {
			cwd: options.cwd,
			env: process.env,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		let settled = false;
		const tee = options.stream ? lineTee(options.stream, process.stderr) : null;
		const finish = (status: number | null) => {
			if (settled) return;
			settled = true;
			tee?.flush();
			resolve({ status, stdout, stderr });
		};
		const timer =
			options.timeoutMs !== undefined
				? setTimeout(() => {
						child.kill("SIGKILL");
						stderr += `\n[orchestrator] station timed out after ${options.timeoutMs}ms\n`;
						finish(null);
					}, options.timeoutMs)
				: null;
		child.stdout.on("data", (d) => {
			const s = String(d);
			stdout += s;
			tee?.feed(s);
		});
		child.stderr.on("data", (d) => {
			const s = String(d);
			stderr += s;
			tee?.feed(s);
		});
		child.on("error", (e) => {
			if (timer) clearTimeout(timer);
			stderr += String(e);
			finish(null);
		});
		child.on("close", (code) => {
			if (timer) clearTimeout(timer);
			finish(code);
		});
	});
}

export function git(args: readonly string[], cwd?: string): ProcResult {
	const r = spawnSync("git", args as string[], { cwd, encoding: "utf-8" });
	return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

export function currentBranch(): string {
	return git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim() || "HEAD";
}

export function workingTreeClean(): boolean {
	return git(["status", "--porcelain"]).stdout.trim() === "";
}

export function addWorktree(
	path: string,
	branch: string,
	base: string,
): ProcResult {
	return git(["worktree", "add", "-b", branch, path, base]);
}

export function removeWorktree(path: string): ProcResult {
	return git(["worktree", "remove", "--force", path]);
}

export function stageAll(cwd: string): ProcResult {
	return git(["add", "-A"], cwd);
}

export function hasChanges(cwd: string, base: string): boolean {
	return git(["diff", "--cached", "--quiet", base], cwd).status !== 0;
}

export function diffStat(cwd: string, base: string): string {
	return git(["diff", "--cached", "--stat", base], cwd).stdout.trim();
}

export function mergeBranch(branch: string): ProcResult {
	return git(["merge", "--no-ff", "--no-edit", branch]);
}
