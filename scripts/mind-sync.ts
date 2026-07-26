#!/usr/bin/env -S node --experimental-strip-types
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type SyncConfig = {
	readonly infra: readonly string[];
	readonly neverTouch: readonly string[];
};

type InfraFile = { readonly rel: string; readonly abs: string };

const IGNORE = new Set(["node_modules", ".git", ".qmd", ".DS_Store"]);

function walk(absDir: string, root: string, out: InfraFile[]): void {
	for (const name of readdirSync(absDir)) {
		if (IGNORE.has(name)) continue;
		const abs = join(absDir, name);
		const st = statSync(abs);
		if (st.isDirectory()) walk(abs, root, out);
		else if (st.isFile()) out.push({ rel: relative(root, abs), abs });
	}
}

function collectInfra(source: string, entries: readonly string[]): InfraFile[] {
	const files: InfraFile[] = [];
	for (const entry of entries) {
		const abs = join(source, entry);
		if (!existsSync(abs)) {
			process.stderr.write(`  (skip: "${entry}" not present in source)\n`);
			continue;
		}
		if (statSync(abs).isDirectory()) walk(abs, source, files);
		else files.push({ rel: relative(source, abs), abs });
	}
	return files;
}

function assertBoundary(files: readonly InfraFile[], neverTouch: readonly string[]): void {
	for (const f of files) {
		for (const nt of neverTouch) {
			if (f.rel === nt || f.rel.startsWith(nt + "/")) {
				throw new Error(
					`Refusing: infra file "${f.rel}" falls under protected content path "${nt}".`,
				);
			}
		}
	}
}

function sameContent(a: string, b: string): boolean {
	try {
		return readFileSync(a).equals(readFileSync(b));
	} catch {
		return false;
	}
}

function manifestVersion(root: string): string {
	try {
		const m = JSON.parse(
			readFileSync(join(root, "vault-manifest.json"), "utf-8"),
		) as { version?: unknown };
		return typeof m.version === "string" ? m.version : "?";
	} catch {
		return "?";
	}
}

function discover(source: string): string[] {
	const grand = resolve(source, "..", "..");
	const found: string[] = [];
	let projects: string[];
	try {
		projects = readdirSync(grand);
	} catch {
		return found;
	}
	for (const proj of projects) {
		const projAbs = join(grand, proj);
		let subs: string[];
		try {
			if (!statSync(projAbs).isDirectory()) continue;
			subs = readdirSync(projAbs);
		} catch {
			continue;
		}
		for (const sub of subs) {
			const mindAbs = join(projAbs, sub);
			if (existsSync(join(mindAbs, "vault-manifest.json"))) found.push(mindAbs);
		}
	}
	return found.filter((p) => resolve(p) !== resolve(source));
}

type SyncResult = { news: string[]; changed: string[]; same: number };

function syncTo(target: string, files: readonly InfraFile[], apply: boolean): SyncResult {
	const news: string[] = [];
	const changed: string[] = [];
	let same = 0;
	for (const f of files) {
		const tgt = join(target, f.rel);
		if (!existsSync(tgt)) news.push(f.rel);
		else if (!sameContent(f.abs, tgt)) changed.push(f.rel);
		else {
			same++;
			continue;
		}
		if (apply) {
			mkdirSync(dirname(tgt), { recursive: true });
			copyFileSync(f.abs, tgt);
		}
	}
	return { news, changed, same };
}

function parseArgs(argv: readonly string[]): {
	from: string | undefined;
	to: string[];
	apply: boolean;
} {
	let from: string | undefined;
	const to: string[] = [];
	let apply = false;
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === undefined) continue;
		if (a === "--apply") apply = true;
		else if (a === "--from") from = argv[++i];
		else if (a === "--to") {
			const v = argv[++i];
			if (v !== undefined) to.push(v);
		}
	}
	return { from, to, apply };
}

function main(): void {
	const args = parseArgs(process.argv.slice(2));
	const source = resolve(args.from ?? process.cwd());
	const cfg = JSON.parse(
		readFileSync(join(source, "scripts/mind-sync.config.json"), "utf-8"),
	) as SyncConfig;

	const files = collectInfra(source, cfg.infra);
	assertBoundary(files, cfg.neverTouch ?? []);
	const targets = args.to.length ? args.to.map((t) => resolve(t)) : discover(source);

	process.stdout.write(`\nmind-sync ${args.apply ? "· APPLY" : "· dry-run"}\n`);
	process.stdout.write(`source: ${source} (v${manifestVersion(source)})\n`);
	process.stdout.write(
		`infra:  ${files.length} files from [${cfg.infra.join(", ")}]\n`,
	);
	if (!targets.length) {
		process.stdout.write("\nNo target minds found.\n");
		return;
	}

	let totalWrites = 0;
	for (const t of targets) {
		const r = syncTo(t, files, args.apply);
		totalWrites += r.news.length + r.changed.length;
		process.stdout.write(`\n▶ ${t} (v${manifestVersion(t)})\n`);
		process.stdout.write(
			`  new ${r.news.length} · changed ${r.changed.length} · same ${r.same}\n`,
		);
		const show = (mark: string, list: readonly string[]) => {
			for (const x of list.slice(0, 24)) process.stdout.write(`    ${mark} ${x}\n`);
			if (list.length > 24) process.stdout.write(`    … +${list.length - 24} more\n`);
		};
		show("+", r.news);
		show("~", r.changed);
		if (args.apply && r.news.length + r.changed.length > 0) {
			process.stdout.write(`  ✓ wrote ${r.news.length + r.changed.length} files\n`);
		}
	}

	process.stdout.write(
		args.apply
			? `\nApplied ${totalWrites} file writes across ${targets.length} mind(s). Content paths untouched.\n`
			: `\nDry run — ${totalWrites} file writes pending across ${targets.length} mind(s). Re-run with --apply to write. Content paths are never touched.\n`,
	);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	try {
		main();
	} catch (e) {
		process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
		process.exit(1);
	}
}
