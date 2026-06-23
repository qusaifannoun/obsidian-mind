#!/usr/bin/env node
/**
 * jira.mjs — minimal Jira Cloud CLI for the vault workflow.
 *
 * Reads credentials from the vault-root .env (gitignored):
 *   ATLASSIAN_API_KEY, ATLASSIAN_EMAIL, ATLASSIAN_SITE_URL, JIRA_PROJECT_KEY
 * Auth is HTTP Basic: base64("<email>:<token>"). Uses Node's global fetch.
 *
 * Read commands (safe):
 *   node .claude/scripts/jira.mjs myself
 *   node .claude/scripts/jira.mjs search "<jql>" [--max N] [--fields a,b,c]
 *   node .claude/scripts/jira.mjs get <KEY>                 # full detail + description text
 *   node .claude/scripts/jira.mjs transitions <KEY>         # available status moves
 *
 * Write commands (outward-facing — confirm before running):
 *   node .claude/scripts/jira.mjs transition <KEY> "<status name>"
 *   node .claude/scripts/jira.mjs comment <KEY> "<text>"
 *
 * Output is plain text for reading, or add --json for raw JSON.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadEnv() {
  const env = {};
  let raw = "";
  try { raw = readFileSync(resolve(ROOT, ".env"), "utf8"); }
  catch { fail(".env not found at vault root"); }
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  for (const k of ["ATLASSIAN_API_KEY", "ATLASSIAN_EMAIL", "ATLASSIAN_SITE_URL"])
    if (!env[k]) fail(`missing ${k} in .env`);
  return env;
}

const E = loadEnv();
const SITE = E.ATLASSIAN_SITE_URL.replace(/\/$/, "");
const AUTH = "Basic " + Buffer.from(`${E.ATLASSIAN_EMAIL}:${E.ATLASSIAN_API_KEY}`).toString("base64");

function fail(msg) { console.error("jira: " + msg); process.exit(1); }

async function api(method, path, body) {
  const res = await fetch(SITE + path, {
    method,
    headers: { Authorization: AUTH, Accept: "application/json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) fail(`HTTP ${res.status} ${method} ${path}\n${JSON.stringify(data, null, 2)}`);
  return data;
}

// Flatten Atlassian Document Format (ADF) to plain text for reading.
function adfText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";
  let s = (node.content || []).map(adfText).join("");
  if (["paragraph", "heading"].includes(node.type)) s += "\n";
  if (node.type === "listItem") s = "  - " + s;
  if (node.type === "codeBlock") s = "\n```\n" + s + "\n```\n";
  return s;
}

// Build ADF from plain text: each line becomes a paragraph (blank line = spacer),
// so multi-line comments render with real line breaks instead of collapsing.
function adf(text) {
  const content = text.split("\n").map((line) =>
    line.length
      ? { type: "paragraph", content: [{ type: "text", text: line }] }
      : { type: "paragraph" },
  );
  return { type: "doc", version: 1, content };
}

const args = process.argv.slice(2);
const cmd = args[0];
const wantJson = args.includes("--json");
const flag = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };

function line(i) {
  const f = i.fields || {};
  const st = f.status?.name ?? "?";
  const ty = f.issuetype?.name ?? "?";
  const pa = f.parent?.key ? `^${f.parent.key} ` : "";
  const asg = f.assignee?.displayName ?? "-";
  return `  ${i.key.padEnd(9)}[${ty.padEnd(6)}] [${st.padEnd(18)}] ${pa}${(f.summary || "").slice(0, 90)}  (${asg})`;
}

const run = {
  async myself() {
    const d = await api("GET", "/rest/api/3/myself");
    if (wantJson) return console.log(JSON.stringify(d, null, 2));
    console.log(`${d.displayName} <${d.emailAddress}>  accountId=${d.accountId}  tz=${d.timeZone}`);
  },
  async search() {
    const jql = args[1];
    if (!jql) fail('search needs a JQL string, e.g. search "project=TAT AND statusCategory!=Done"');
    const fields = flag("--fields", "summary,status,issuetype,assignee,parent,updated");
    const max = flag("--max", "50");
    const d = await api("GET",
      `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${max}&fields=${encodeURIComponent(fields)}`);
    if (wantJson) return console.log(JSON.stringify(d, null, 2));
    const iss = d.issues || [];
    console.log(`# ${iss.length} issue(s)${d.nextPageToken ? " (more pages available)" : ""}`);
    for (const i of iss) console.log(line(i));
  },
  async get() {
    const key = args[1]; if (!key) fail("get needs an issue KEY");
    const d = await api("GET",
      `/rest/api/3/issue/${key}?fields=summary,status,issuetype,assignee,reporter,priority,parent,labels,components,description,subtasks,issuelinks,created,updated,duedate`);
    if (wantJson) return console.log(JSON.stringify(d, null, 2));
    const f = d.fields;
    console.log(`${d.key}  [${f.issuetype?.name}]  ${f.status?.name}`);
    console.log(`Summary: ${f.summary}`);
    console.log(`Assignee: ${f.assignee?.displayName ?? "-"}   Reporter: ${f.reporter?.displayName ?? "-"}   Priority: ${f.priority?.name ?? "-"}`);
    if (f.parent) console.log(`Parent:   ${f.parent.key} — ${f.parent.fields?.summary ?? ""}`);
    if (f.labels?.length) console.log(`Labels:   ${f.labels.join(", ")}`);
    if (f.components?.length) console.log(`Components: ${f.components.map(c => c.name).join(", ")}`);
    if (f.duedate) console.log(`Due:      ${f.duedate}`);
    console.log(`Updated:  ${f.updated}`);
    if (f.issuelinks?.length) {
      console.log("Links:");
      for (const l of f.issuelinks) {
        const o = l.outwardIssue || l.inwardIssue;
        const rel = l.outwardIssue ? l.type.outward : l.type.inward;
        if (o) console.log(`  ${rel} ${o.key} — ${o.fields?.summary ?? ""} [${o.fields?.status?.name ?? ""}]`);
      }
    }
    if (f.subtasks?.length) {
      console.log("Subtasks:");
      for (const s of f.subtasks) console.log(`  ${s.key} [${s.fields?.status?.name}] ${s.fields?.summary}`);
    }
    console.log("\n--- Description ---");
    console.log(adfText(f.description).trim() || "(empty)");
  },
  async transitions() {
    const key = args[1]; if (!key) fail("transitions needs an issue KEY");
    const d = await api("GET", `/rest/api/3/issue/${key}/transitions`);
    if (wantJson) return console.log(JSON.stringify(d, null, 2));
    console.log(`# transitions for ${key}:`);
    for (const t of d.transitions) console.log(`  ${t.id}\t-> ${t.to.name}   (action: "${t.name}")`);
  },
  async transition() {
    const key = args[1], target = args[2];
    if (!key || !target) fail('transition needs KEY and target status, e.g. transition TAT-12 "In Progress"');
    const d = await api("GET", `/rest/api/3/issue/${key}/transitions`);
    const t = d.transitions.find(
      x => x.to.name.toLowerCase() === target.toLowerCase() || x.name.toLowerCase() === target.toLowerCase());
    if (!t) fail(`no transition to "${target}" from current status. Available:\n` +
      d.transitions.map(x => `  -> ${x.to.name} (action "${x.name}")`).join("\n"));
    await api("POST", `/rest/api/3/issue/${key}/transitions`, { transition: { id: t.id } });
    console.log(`✅ ${key} -> ${t.to.name}`);
  },
  async comment() {
    const key = args[1], text = args[2];
    if (!key || !text) fail('comment needs KEY and text');
    await api("POST", `/rest/api/3/issue/${key}/comment`, { body: adf(text) });
    console.log(`✅ commented on ${key}`);
  },
};

if (!run[cmd]) {
  console.error("usage: jira.mjs <myself|search|get|transitions|transition|comment> [...] [--json]");
  process.exit(1);
}
await run[cmd]();
