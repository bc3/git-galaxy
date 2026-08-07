import { test } from "node:test";
import assert from "node:assert/strict";
import { injectData } from "./inject.mjs";

test("injects payload once, escapes <", () => {
    const html = "<script>window.GALAXY_DATA = /*__DATA__*/null;</script>";
    const out = injectData(html, { s: "</script>" });
    assert.ok(out.includes("\\u003c/script>"));
    assert.ok(!out.includes("/*__DATA__*/null"));
});

test("throws when marker missing", () => {
    assert.throws(() => injectData("nope", {}));
});
