/**
 * Map real event timestamps to sim seconds, compressing quiet gaps.
 * Gaps longer than maxGapHours count as maxGapHours of "effective" time.
 * Returns {events (with simT), anchors: [{simT, realT}], realSpan: {from, to}}
 */
export function buildTimeline(events, { durationSec = 90, maxGapHours = 4 } = {}) {
    if (!events.length) return { events: [], anchors: [], realSpan: null };

    const sorted = [...events].sort((a, b) => a.ts - b.ts);
    const maxGap = maxGapHours * 3600;

    const eff = [0];
    for (let i = 1; i < sorted.length; i++) {
        eff.push(eff[i - 1] + Math.min(sorted[i].ts - sorted[i - 1].ts, maxGap));
    }
    const total = eff[eff.length - 1];

    const anchors = [];
    const out = sorted.map((e, i) => {
        const simT = total === 0 ? 0 : (eff[i] / total) * durationSec;
        const prev = anchors[anchors.length - 1];
        if (!prev || prev.simT !== simT) anchors.push({ simT, realT: e.ts });
        return { ...e, simT };
    });

    return {
        events: out,
        anchors,
        realSpan: { from: sorted[0].ts, to: sorted[sorted.length - 1].ts },
    };
}
