import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAuthors } from "./authors.mjs";

test("merges by email, flags bots, counts commits", () => {
    const { authors, idOf } = buildAuthors([
        { name: "alex", email: "alex@acme.dev", ts: 1 },
        { name: "Alex Fenwick", email: "alex@acme.dev", ts: 2 },
        { name: "CI Runner", email: "runner@z.be", ts: 3 },
    ]);
    assert.equal(authors.length, 2);
    const alex = authors.find((a) => a.name === "Alex Fenwick");
    assert.equal(alex.commits, 2);
    assert.equal(idOf("alex", "alex@acme.dev"), alex.id);
    assert.equal(alex.bot, false);
    assert.equal(authors.find((a) => a.name === "CI Runner").bot, true);
});

test("merges by same lowercased name across emails", () => {
    const { authors } = buildAuthors([
        { name: "Priya Nakamura", email: "j@a.be", ts: 1 },
        { name: "priya nakamura", email: "j@b.be", ts: 2 },
    ]);
    assert.equal(authors.length, 1);
    assert.equal(authors[0].commits, 2);
    assert.deepEqual([...authors[0].emails].sort(), ["j@a.be", "j@b.be"]);
});

test("botPatterns option adds custom bot-name keywords", () => {
    const { authors } = buildAuthors(
        [
            { name: "Deploy Helper", email: "d@z.be", ts: 1 },
            { name: "Priya Nakamura", email: "p@z.be", ts: 2 },
        ],
        { botPatterns: ["deploy helper"] }
    );
    assert.equal(authors.find((a) => a.name === "Deploy Helper").bot, true);
    assert.equal(authors.find((a) => a.name === "Priya Nakamura").bot, false);
});

test("detects automated agents and ci runners as bots", () => {
    const { authors } = buildAuthors([
        { name: "Frontend developer (Automated Agent)", email: "m@z.be", ts: 1 },
        { name: "CI Runner", email: "r@z.be", ts: 2 },
        { name: "Translation Bot", email: "t@z.be", ts: 3 },
    ]);
    assert.ok(authors.every((a) => a.bot));
});
