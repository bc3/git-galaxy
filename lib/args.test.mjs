import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "./args.mjs";

test("defaults to the last 2 weeks of the current directory", () => {
    const o = parseArgs([], "/work");
    assert.equal(o.since, "2 weeks ago");
    assert.equal(o.forever, false);
    assert.equal(o.repo, "/work");
    assert.equal(o.out, "/work/dist/git-galaxy.html");
    assert.equal(o.duration, 90);
    assert.deepEqual(o.bots, []);
});

test("accepts --key=value and --key value", () => {
    const o = parseArgs(["--since=1 month ago", "--repo", "/r", "--duration=30", "--bots", "renovate, ci scout"], "/work");
    assert.equal(o.since, "1 month ago");
    assert.equal(o.repo, "/r");
    assert.equal(o.duration, 30);
    assert.deepEqual(o.bots, ["renovate", "ci scout"]);
});

test("--forever is a boolean flag and does not swallow the next argument", () => {
    const o = parseArgs(["--forever", "--repo", "/r"], "/work");
    assert.equal(o.forever, true);
    assert.equal(o.repo, "/r");
});

test("--forever accepts an explicit true/false value", () => {
    assert.equal(parseArgs(["--forever=false"], "/work").forever, false);
    assert.equal(parseArgs(["--forever=true"], "/work").forever, true);
    assert.throws(() => parseArgs(["--forever=maybe"], "/work"), /takes no value/);
});

test("--forever and --since cannot be combined", () => {
    assert.throws(() => parseArgs(["--forever", "--since=1 year ago"], "/work"), /mutually exclusive/);
});

test("rejects unknown options, missing values and bad durations", () => {
    assert.throws(() => parseArgs(["--nope"], "/work"), /unknown option --nope/);
    assert.throws(() => parseArgs(["--since"], "/work"), /missing value for --since/);
    assert.throws(() => parseArgs(["--duration=abc"], "/work"), /positive number/);
    assert.throws(() => parseArgs(["--duration=0"], "/work"), /positive number/);
});
