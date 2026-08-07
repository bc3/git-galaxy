import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGitLog } from "./parse.mjs";

const raw =
    "\x01aaa|bbb ccc|Alex Fenwick|alex@acme.dev|1754500000|Merge branch 'x' into 'main'\n" +
    "\x01bbb|ddd|Robin|robin@z.be|1754400000|feat: thing\nM\ta.ts\nA\tb.ts\n\n" +
    "\x01broken-line-no-pipes\n";

test("parses headers, parents, file counts; skips malformed", () => {
    const c = parseGitLog(raw);
    assert.equal(c.length, 2);
    assert.deepEqual(c[0].parents, ["bbb", "ccc"]);
    assert.equal(c[0].files, 0);
    assert.equal(c[1].files, 2);
    assert.equal(c[1].ts, 1754400000);
    assert.equal(c[1].subject, "feat: thing");
    assert.equal(c[1].name, "Robin");
    assert.equal(c[1].email, "robin@z.be");
});

test("subject may contain pipes", () => {
    const c = parseGitLog("\x01abc||A|a@z|100|fix: a | b | c\n");
    assert.equal(c[0].subject, "fix: a | b | c");
    assert.deepEqual(c[0].parents, []);
});

test("empty input gives empty array", () => {
    assert.deepEqual(parseGitLog(""), []);
});
