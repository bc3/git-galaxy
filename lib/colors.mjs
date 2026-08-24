/**
 * Minimal ANSI color helpers — zero dependency, respects NO_COLOR and
 * non-TTY output (e.g. output piped to a file or CI log).
 */
const enabled = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

function paint(code) {
    return enabled ? (text) => `\x1b[${code}m${text}\x1b[0m` : (text) => text;
}

export const bold = paint(1);
export const dim = paint(2);
export const red = paint(31);
export const green = paint(32);
export const yellow = paint(33);
export const cyan = paint(36);
