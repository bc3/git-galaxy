import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTimeline } from "./timewarp.mjs";

const H = 3600;

test("compresses >4h gaps, maps to duration", () => {
    const evs = [{ ts: 0 }, { ts: 2 * H }, { ts: 26 * H }]; // 24h gap → 4h
    const { events, anchors } = buildTimeline(evs, { durationSec: 90 });
    assert.equal(events[0].simT, 0);
    assert.equal(events[2].simT, 90);
    // effective: 2h then min(24h,4h)=4h → total 6h; event1 at 2/6
    assert.ok(Math.abs(events[1].simT - 90 * (2 / 6)) < 1e-9);
    assert.equal(anchors.length, 3);
    assert.equal(anchors[0].realT, 0);
    assert.equal(anchors[2].simT, 90);
});

test("empty events", () => {
    assert.deepEqual(buildTimeline([], {}), {
        events: [],
        anchors: [],
        realSpan: null,
    });
});

test("single event maps to 0, realSpan set", () => {
    const { events, realSpan } = buildTimeline([{ ts: 500 }], { durationSec: 90 });
    assert.equal(events[0].simT, 0);
    assert.deepEqual(realSpan, { from: 500, to: 500 });
});
