#!/usr/bin/env node
/**
 * Git Galaxy — generate a self-contained animated visualization of repo activity.
 *
 * Usage:
 *   node tools/git-galaxy/generate.mjs [--since="2 weeks ago"] [--repo <path>]
 *                                      [--out <file>] [--duration <sec>]
 *                                      [--bots "renovate,ci scout"]
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseGitLog } from "./lib/parse.mjs";
import { buildAuthors } from "./lib/authors.mjs";
import { inferBranches } from "./lib/branches.mjs";
import { buildTimeline } from "./lib/timewarp.mjs";
import { injectData } from "./lib/inject.mjs";

const here = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
    const opts = {
        since: "2 weeks ago",
        repo: process.cwd(),
        out: join(here, "dist", "git-galaxy.html"),
        duration: 90,
        bots: [],
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const eq = arg.indexOf("=");
        const key = eq === -1 ? arg : arg.slice(0, eq);
        const val = eq === -1 ? argv[++i] : arg.slice(eq + 1);
        switch (key) {
            case "--since": opts.since = val; break;
            case "--repo": opts.repo = val; break;
            case "--out": opts.out = val; break;
            case "--duration": opts.duration = Number(val); break;
            case "--bots": opts.bots = val.split(",").map((s) => s.trim()).filter(Boolean); break;
            default:
                console.error(`git-galaxy: unknown option ${arg}`);
                process.exit(1);
        }
    }
    return opts;
}

function git(repo, args) {
    return execFileSync("git", ["-C", repo, ...args], {
        encoding: "utf8",
        maxBuffer: 512 * 1024 * 1024,
    });
}

const opts = parseArgs(process.argv.slice(2));
const repo = resolve(opts.repo);

let repoRoot;
try {
    repoRoot = git(repo, ["rev-parse", "--show-toplevel"]).trim();
} catch {
    console.error(`git-galaxy: ${repo} is not a git repository`);
    process.exit(1);
}

const rawLog = git(repo, [
    "log", "--all", "--date-order", `--since=${opts.since}`,
    "--pretty=format:%x01%H|%P|%an|%ae|%at|%s", "--name-status",
]);
const commits = parseGitLog(rawLog);
if (!commits.length) {
    console.error(`git-galaxy: no commits found since "${opts.since}"`);
    process.exit(1);
}

// default branch: first of origin/main, origin/master, main, master that exists
let mainTip;
let mainName = "main";
for (const ref of ["origin/main", "origin/master", "main", "master"]) {
    try {
        mainTip = git(repo, ["rev-parse", "--verify", "--quiet", ref]).trim();
        mainName = ref.replace(/^origin\//, "");
        break;
    } catch {
        mainTip = undefined; // pass 0 still infers mainline from merge subjects
    }
}

// branch tips: remote branches when there's an origin, local branches otherwise
const parseRefs = (raw) =>
    raw
        .split("\n")
        .filter(Boolean)
        .map((l) => {
            const [ref, tip] = l.split("|");
            return { branch: ref.replace(/^origin\//, ""), tip };
        })
        .filter((r) => r.branch && r.tip && r.branch !== "origin" && r.branch !== "HEAD" && r.branch !== mainName);

let refTips = parseRefs(git(repo, [
    "for-each-ref", "refs/remotes/origin", "--format=%(refname:short)|%(objectname)",
]));
if (!refTips.length) {
    refTips = parseRefs(git(repo, [
        "for-each-ref", "refs/heads", "--format=%(refname:short)|%(objectname)",
    ]));
}

const { authors, idOf } = buildAuthors(commits, { botPatterns: opts.bots });
const { branches, events: rawEvents } = inferBranches(commits, refTips, mainTip, mainName);
const { events, anchors, realSpan } = buildTimeline(rawEvents, {
    durationSec: opts.duration,
});

// strip raw identities → authorId
for (const e of events) {
    if (e.authorKey) {
        e.authorId = idOf(e.authorKey.name, e.authorKey.email);
        delete e.authorKey;
    }
}

const payload = {
    generatedAt: new Date().toISOString(),
    repoName: basename(repoRoot),
    mainBranch: mainName,
    range: { since: opts.since, from: realSpan.from, to: realSpan.to },
    durationSec: opts.duration,
    authors: authors.map(({ id, name, bot, commits: n }) => ({ id, name, bot, commits: n })),
    branches,
    events,
    anchors,
};

const template = readFileSync(join(here, "template.html"), "utf8");
const html = injectData(template, payload);
mkdirSync(dirname(resolve(opts.out)), { recursive: true });
writeFileSync(resolve(opts.out), html);

console.log(
    `git-galaxy: ${commits.length} commits, ${branches.length} branches, ` +
    `${authors.length} authors → ${opts.out}`
);
