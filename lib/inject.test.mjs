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

test("payload containing $-patterns (e.g. a commit subject with \"$'\") is inserted literally", () => {
    const html = "<script>window.GALAXY_DATA = /*__DATA__*/null;</script>\n<script>tail</script>";
    const out = injectData(html, { subject: "cover redirectToListing$'s country guard" });
    assert.ok(out.includes("cover redirectToListing$'s country guard"));
    // the real template tail must appear exactly once, not spliced in early by "$'"
    assert.equal(out.split("tail").length - 1, 1);
});
