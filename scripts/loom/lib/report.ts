import type { SliceOutcome } from "./types.ts";

const ICON: Record<SliceOutcome["status"], string> = {
	green: "✓",
	red: "✗",
	error: "!",
	skipped: "·",
};

export function report(outcomes: readonly SliceOutcome[], merge: boolean): void {
	process.stdout.write("\nOrchestration report\n");
	process.stdout.write("────────────────────\n");
	for (const o of outcomes) {
		process.stdout.write(
			`${ICON[o.status]} ${o.id}  [${o.station}]  ${o.status.toUpperCase()}\n`,
		);
		process.stdout.write(`    ${o.detail}\n`);
		if (o.diffStat) {
			for (const line of o.diffStat.split("\n")) {
				process.stdout.write(`    ${line.trim()}\n`);
			}
		}
		if (merge) process.stdout.write(`    merged: ${o.merged ? "yes" : "no"}\n`);
	}
	const green = outcomes.filter((o) => o.status === "green").length;
	process.stdout.write(
		`\n${green}/${outcomes.length} green${merge ? "" : "  (dry-run — pass --merge to integrate)"}\n`,
	);
}
