/**
 * Remote repository support — detect git URLs (`--repo https://github.com/...`)
 * and clone them to a throwaway temp directory so they can be visualized
 * exactly like a local checkout.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const URL_PATTERN = /^(https?:\/\/|git@|ssh:\/\/|git:\/\/)/i;

export function isGitUrl(str) {
    return URL_PATTERN.test(str);
}

export function repoNameFromUrl(url) {
    const cleaned = url.replace(/\.git$/, "").replace(/[/:]+$/, "");
    const lastSegment = cleaned.split(/[/:]/).filter(Boolean).pop();
    return lastSegment || "repo";
}

export function cloneRepo(url, { log = () => {} } = {}) {
    // `git clone` treats a leading "-" as an option, not a URL — refuse it
    // rather than letting it inject arbitrary flags into the command.
    if (url.startsWith("-")) {
        throw new Error(`refusing to clone suspicious url "${url}"`);
    }
    const dir = mkdtempSync(join(tmpdir(), "git-galaxy-"));
    log(`git-galaxy: cloning ${url}...`);
    execFileSync("git", ["clone", "--quiet", "--", url, dir], {
        stdio: ["ignore", "ignore", "inherit"],
    });
    return dir;
}
