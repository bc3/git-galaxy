import { test } from "node:test";
import assert from "node:assert/strict";
import { isGitUrl, repoNameFromUrl } from "./remote.mjs";

test("isGitUrl recognizes remote URL schemes", () => {
    assert.equal(isGitUrl("https://github.com/ngrx/platform"), true);
    assert.equal(isGitUrl("http://example.com/repo.git"), true);
    assert.equal(isGitUrl("ssh://git@example.com/repo.git"), true);
    assert.equal(isGitUrl("git://example.com/repo.git"), true);
    assert.equal(isGitUrl("git@github.com:ngrx/platform.git"), true);
});

test("isGitUrl rejects local paths", () => {
    assert.equal(isGitUrl("~/code/my-project"), false);
    assert.equal(isGitUrl("/abs/path/to/repo"), false);
    assert.equal(isGitUrl("../relative/repo.git"), false);
    assert.equal(isGitUrl("."), false);
});

test("repoNameFromUrl extracts the repo name", () => {
    assert.equal(repoNameFromUrl("https://github.com/ngrx/platform"), "platform");
    assert.equal(repoNameFromUrl("https://github.com/ngrx/platform.git"), "platform");
    assert.equal(repoNameFromUrl("https://github.com/ngrx/platform/"), "platform");
    assert.equal(repoNameFromUrl("git@github.com:ngrx/platform.git"), "platform");
});
