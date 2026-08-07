const MERGE_RE = /^Merge (?:remote-tracking )?branch '([^']+)'(?: into '?([^'\n]+?)'?)?$/;

const stripOrigin = (name) => name.replace(/^origin\//, "");

/**
 * Assign commits to branches and build the event stream.
 *
 * Pass 0: mark the mainline (first-parent chain from mainTip and from merges
 * into main) so branch walks stop at the fork point.
 * Pass 1: GitLab-style merge commits name the merged branch; walk the merge's
 * second parent via first-parent links, claiming unassigned commits.
 * Pass 2: same walk from unmerged remote branch tips (refTips).
 * Everything left belongs to "main".
 *
 * mainName is the repo's real default branch ("main", "master", "develop"…);
 * it is treated as the mainline alongside the literal "main".
 *
 * Returns {commits, branches, events} — events sorted ascending by ts.
 */
export function inferBranches(commits, refTips = [], mainTip, mainName = "main") {
    const isMain = (n) => n === "main" || n === mainName;
    const byHash = new Map(commits.map((c) => [c.hash, c]));
    const branchOf = new Map(); // hash -> branch name
    const mergedAt = new Map(); // branch -> ts
    const merges = []; // {ts, branch, into, authorKey, subject}

    const walkAssign = (startHash, branch) => {
        let cur = byHash.get(startHash);
        while (cur && !branchOf.has(cur.hash)) {
            branchOf.set(cur.hash, branch);
            cur = byHash.get(cur.parents[0]);
        }
    };

    const asc = [...commits].sort((a, b) => a.ts - b.ts);

    // Pass 0: mainline — first-parent chains from mainTip and merges into main
    if (mainTip) walkAssign(mainTip, "main");
    const desc = [...asc].reverse();
    for (const c of desc) {
        if (c.parents.length < 2) continue;
        const m = c.subject.match(MERGE_RE);
        if (!m) continue;
        const into = stripOrigin(m[2] || "main");
        if (isMain(into)) walkAssign(c.hash, "main");
    }

    // Pass 1: merge commits (oldest first so earlier merges claim their commits first)
    for (const c of asc) {
        if (c.parents.length < 2) continue;
        const m = c.subject.match(MERGE_RE);
        if (!m) continue;
        const branch = stripOrigin(m[1]);
        const into = stripOrigin(m[2] || "main");
        if (isMain(branch) || branch === into) continue;
        walkAssign(c.parents[1], branch);
        if (!mergedAt.has(branch)) mergedAt.set(branch, c.ts);
        merges.push({
            ts: c.ts,
            branch,
            into,
            authorKey: { name: c.name, email: c.email },
            subject: c.subject,
        });
    }

    // Pass 2: unmerged remote tips
    for (const { branch, tip } of refTips) {
        const name = stripOrigin(branch);
        if (isMain(name) || name === "HEAD") continue;
        walkAssign(tip, name);
    }

    // Rest → main
    for (const c of commits) {
        c.branch = branchOf.get(c.hash) || "main";
    }

    // branches: birth = min ts of assigned commits
    const birth = new Map();
    for (const c of commits) {
        if (c.branch === "main") continue;
        const b = birth.get(c.branch);
        if (b === undefined || c.ts < b) birth.set(c.branch, c.ts);
    }
    // a merge may reference a branch with no surviving commits in range
    for (const m of merges) {
        if (!birth.has(m.branch)) birth.set(m.branch, m.ts);
    }

    const branches = [...birth.entries()]
        .map(([name, b]) => {
            const entry = { name, birth: b };
            if (mergedAt.has(name)) entry.mergedAt = mergedAt.get(name);
            return entry;
        })
        .sort((a, b) => a.birth - b.birth);

    const events = [];
    for (const [name, b] of birth) {
        events.push({ ts: b, type: "branch-birth", branch: name });
    }
    for (const c of commits) {
        events.push({
            ts: c.ts,
            type: "commit",
            branch: c.branch,
            authorKey: { name: c.name, email: c.email },
            files: c.files,
            subject: c.subject,
        });
    }
    for (const m of merges) {
        events.push({
            ts: m.ts,
            type: "merge",
            branch: m.branch,
            into: m.into,
            authorKey: m.authorKey,
            subject: m.subject,
        });
    }
    // stable order: by ts, births before commits before merges at equal ts
    const rank = { "branch-birth": 0, commit: 1, merge: 2 };
    events.sort((a, b) => a.ts - b.ts || rank[a.type] - rank[b.type]);

    return { commits, branches, events };
}
