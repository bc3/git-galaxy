// Generic default; pass botPatterns (or --bots on the CLI) to match your org's
// actual bot/service-account names.
const DEFAULT_BOT_RE = /\bbot\b|automated agent|ci runner/i;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildBotRegex(botPatterns) {
    const extra = (botPatterns || []).map((s) => s.trim()).filter(Boolean);
    if (!extra.length) return DEFAULT_BOT_RE;
    return new RegExp(
        `\\bbot\\b|automated agent|ci runner|${extra.map(escapeRegex).join("|")}`,
        "i"
    );
}

/**
 * Merge author identities: same lowercased email OR same lowercased full name.
 * Returns {authors: [{id, name, emails, bot, commits}], idOf(name, email)}
 * Display name = longest variant seen.
 */
export function buildAuthors(commits, { botPatterns } = {}) {
    const BOT_RE = buildBotRegex(botPatterns);
    // union-find over identity keys
    const parent = new Map();
    const find = (k) => {
        let root = k;
        while (parent.get(root) !== root) root = parent.get(root);
        let cur = k;
        while (parent.get(cur) !== cur) {
            const next = parent.get(cur);
            parent.set(cur, root);
            cur = next;
        }
        return root;
    };
    const add = (k) => {
        if (!parent.has(k)) parent.set(k, k);
    };
    const union = (a, b) => {
        add(a);
        add(b);
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) parent.set(rb, ra);
    };

    const keyOf = (name, email) => {
        const e = (email || "").toLowerCase().trim();
        const n = (name || "").toLowerCase().trim();
        return { e: e && `e:${e}`, n: n && `n:${n}` };
    };

    for (const c of commits) {
        const { e, n } = keyOf(c.name, c.email);
        if (e && n) union(e, n);
        else add(e || n);
    }

    // aggregate per root
    const groups = new Map();
    for (const c of commits) {
        const { e, n } = keyOf(c.name, c.email);
        const root = find(e || n);
        let g = groups.get(root);
        if (!g) {
            g = { names: new Set(), emails: new Set(), commits: 0 };
            groups.set(root, g);
        }
        if (c.name) g.names.add(c.name);
        if (c.email) g.emails.add(c.email.toLowerCase());
        g.commits += 1;
    }

    const authors = [];
    const rootToId = new Map();
    let i = 0;
    for (const [root, g] of groups) {
        const name = [...g.names].sort((a, b) => b.length - a.length)[0] || "unknown";
        const id = `a${i++}`;
        rootToId.set(root, id);
        authors.push({
            id,
            name,
            emails: [...g.emails],
            bot: [...g.names].some((n) => BOT_RE.test(n)),
            commits: g.commits,
        });
    }
    authors.sort((a, b) => b.commits - a.commits);

    const idOf = (name, email) => {
        const { e, n } = keyOf(name, email);
        const key = e || n;
        if (!parent.has(key) && !(n && parent.has(n))) return undefined;
        return rootToId.get(find(parent.has(key) ? key : n));
    };

    return { authors, idOf };
}
