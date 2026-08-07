const MARKER = "/*__DATA__*/null";

/**
 * Replace the template's data marker with the JSON payload.
 * `<` is escaped so "</script>" inside strings can't break the inline script.
 */
export function injectData(html, payload) {
    if (!html.includes(MARKER)) {
        throw new Error(`git-galaxy: template is missing the ${MARKER} marker`);
    }
    const json = JSON.stringify(payload).replaceAll("<", "\\u003c");
    return html.replace(MARKER, json);
}
