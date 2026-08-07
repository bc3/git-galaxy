import { test } from "node:test";
import assert from "node:assert/strict";
import { inferBranches } from "./branches.mjs";

const mk = (hash, parents, ts, subject = "s") => ({
    hash,
    parents,
    ts,
    subject,
    name: "A",
    email: "a@z",
    files: 1,
});

test("assigns branch via merge-commit walk, emits birth+merge", () => {
    const commits = [
        mk("m1", ["a2", "f2"], 400, "Merge branch 'PROJ-1' into 'main'"),
        mk("f2", ["f1"], 300),
        mk("a2", ["a1"], 250),
        mk("f1", ["a1"], 200),
        mk("a1", [], 100),
    ];
    const { events, branches } = inferBranches(commits, []);
    assert.deepEqual(branches, [{ name: "PROJ-1", birth: 200, mergedAt: 400 }]);
    const merge = events.find((e) => e.type === "merge");
    assert.equal(merge.into, "main");
    assert.equal(merge.branch, "PROJ-1");
    assert.equal(
        events.filter((e) => e.type === "commit" && e.branch === "PROJ-1").length,
        2
    );
    assert.ok(events.every((e, i) => i === 0 || events[i - 1].ts <= e.ts));
    const birth = events.find((e) => e.type === "branch-birth");
    assert.equal(birth.ts, 200);
});

test("unmerged refTip walk stops at mainline", () => {
    const commits = [mk("t2", ["t1"], 300), mk("t1", ["a1"], 200), mk("a1", [], 100)];
    const { branches } = inferBranches(
        commits,
        [{ branch: "PROJ-2", tip: "t2" }],
        "a1"
    );
    assert.deepEqual(branches, [{ name: "PROJ-2", birth: 200 }]);
});

test("unassigned commits fall back to main, origin/ stripped from merge subject", () => {
    const commits = [
        mk("m1", ["a1", "f1"], 300, "Merge remote-tracking branch 'origin/feat-x'"),
        mk("f1", [], 200),
        mk("a1", [], 100),
    ];
    const { commits: out, branches } = inferBranches(commits, []);
    assert.equal(branches[0].name, "feat-x");
    assert.equal(out.find((c) => c.hash === "a1").branch, "main");
    assert.equal(out.find((c) => c.hash === "m1").branch, "main");
});

test("master repos: 'into master' merges mark the mainline", () => {
    const commits = [
        mk("m1", ["a2", "f2"], 400, "Merge branch 'feat-y' into 'master'"),
        mk("f2", ["f1"], 300),
        mk("a2", ["a1"], 250),
        mk("f1", ["a1"], 200),
        mk("a1", [], 100),
    ];
    const { commits: out, branches } = inferBranches(commits, [], undefined, "master");
    assert.deepEqual(branches, [{ name: "feat-y", birth: 200, mergedAt: 400 }]);
    assert.equal(out.find((c) => c.hash === "a2").branch, "main");
    assert.equal(out.find((c) => c.hash === "f1").branch, "feat-y");
});
