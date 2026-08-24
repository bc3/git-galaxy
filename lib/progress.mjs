/**
 * Console progress reporting for long-running steps (cloning, reading the
 * commit log, …) so the terminal isn't silent while git-galaxy works.
 */
import { cyan, dim, green, red } from "./colors.mjs";

const isTTY = Boolean(process.stdout.isTTY);

export function step(label) {
    const start = Date.now();
    process.stdout.write(`${cyan("→")} ${label}...${isTTY ? "" : "\n"}`);

    const finish = (icon, color, message) => {
        const elapsed = dim(`(${((Date.now() - start) / 1000).toFixed(1)}s)`);
        const line = `${color(icon)} ${message ?? label} ${elapsed}\n`;
        process.stdout.write(isTTY ? `\r\x1b[2K${line}` : line);
    };

    return {
        done: (message) => finish("✓", green, message),
        fail: (message) => finish("✗", red, message),
    };
}
