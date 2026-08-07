/**
 * Parse `git log --pretty=format:%x01%H|%P|%an|%ae|%at|%s --name-status` output.
 * Each record starts with \x01; header line is followed by name-status lines.
 * Returns [{hash, parents, name, email, ts, subject, files}]
 */
export function parseGitLog(raw) {
    const commits = [];
    for (const record of raw.split("\x01")) {
        if (!record.trim()) continue;
        const lines = record.split("\n");
        const header = lines[0];
        const parts = header.split("|");
        if (parts.length < 6) {
            console.warn(`git-galaxy: skipping malformed log line: ${header.slice(0, 80)}`);
            continue;
        }
        const [hash, parentsRaw, name, email, tsRaw] = parts;
        const subject = parts.slice(5).join("|");
        const ts = Number(tsRaw);
        if (!hash || Number.isNaN(ts)) {
            console.warn(`git-galaxy: skipping malformed log line: ${header.slice(0, 80)}`);
            continue;
        }
        const files = lines
            .slice(1)
            .filter((l) => /^[A-Z]\d*\t/.test(l)).length;
        commits.push({
            hash,
            parents: parentsRaw ? parentsRaw.split(" ").filter(Boolean) : [],
            name,
            email,
            ts,
            subject,
            files,
        });
    }
    return commits;
}
