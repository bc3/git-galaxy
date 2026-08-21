/**
 * Command-line argument parsing for git-galaxy.
 *
 * Pure: takes argv (without node/script), returns an options object.
 * Throws on unknown options, missing values and conflicting flags — the caller
 * decides how to report that.
 */
import { join } from "node:path";

const BOOLEAN_FLAGS = new Set(["--forever"]);
const VALUE_FLAGS = new Set(["--since", "--repo", "--out", "--duration", "--bots"]);

function boolValue(key, val) {
    if (val === undefined || val === "true") return true;
    if (val === "false") return false;
    throw new Error(`${key} takes no value (got "${val}")`);
}

export function parseArgs(argv, cwd = process.cwd()) {
    const opts = {
        since: "2 weeks ago",
        forever: false,
        repo: cwd,
        out: join(cwd, "dist", "git-galaxy.html"),
        duration: 90,
        bots: [],
    };
    let sinceGiven = false;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const eq = arg.indexOf("=");
        const key = eq === -1 ? arg : arg.slice(0, eq);
        if (!BOOLEAN_FLAGS.has(key) && !VALUE_FLAGS.has(key)) {
            throw new Error(`unknown option ${arg}`);
        }
        let val;
        if (eq !== -1) {
            val = arg.slice(eq + 1);
        } else if (!BOOLEAN_FLAGS.has(key)) {
            val = argv[++i];
            if (val === undefined) throw new Error(`missing value for ${key}`);
        }
        switch (key) {
            case "--since": opts.since = val; sinceGiven = true; break;
            case "--forever": opts.forever = boolValue(key, val); break;
            case "--repo": opts.repo = val; break;
            case "--out": opts.out = val; break;
            case "--duration": opts.duration = Number(val); break;
            case "--bots": opts.bots = val.split(",").map((s) => s.trim()).filter(Boolean); break;
        }
    }

    if (opts.forever && sinceGiven) {
        throw new Error("--forever and --since are mutually exclusive");
    }
    if (!Number.isFinite(opts.duration) || opts.duration <= 0) {
        throw new Error(`--duration must be a positive number`);
    }
    return opts;
}
