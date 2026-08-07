# Git Galaxy 🌌

A flashy, modern [Gource](https://gource.io/) replacement. Turns any git repository's
recent history into an animated **galaxy movie**: the default branch is a glowing core,
feature branches orbit as spiral arms, authors fly around as comets firing commit
particles, and merges explode into the core with shockwaves.

Zero dependencies. One command in, one self-contained HTML file out — double-click it,
no server needed.

## Usage

```bash
# visualize the repo you're currently in (last 2 weeks)
node generate.mjs

# any other repo, any range
node generate.mjs --repo ~/code/my-project --since="1 month ago"

# open the result
open dist/git-galaxy.html
```

### Options

| Flag         | Default                 | Description                                    |
| ------------ | ----------------------- | ---------------------------------------------- |
| `--repo`     | current directory       | Path to the git repository to visualize        |
| `--since`    | `"2 weeks ago"`         | Any `git log --since` expression               |
| `--out`      | `dist/git-galaxy.html`  | Output file path                               |
| `--duration` | `90`                    | Movie length in seconds at 1× speed            |
| `--bots`     | _(none)_                | Comma-separated extra bot-name keywords (case-insensitive), e.g. `--bots "renovate,ci scout"` |

## What you see

- **Core** — the default branch (`main`/`master`, auto-detected), pulsing at the center
- **Spiral arms** — branches, each with its own color and label; they grow out on birth
  and collapse into the core with a shockwave + particle burst when merged
- **Comets** — authors, flying to the branch they commit to; particle stream size scales
  with the number of files touched
- **Hexagons ⬡** — bots (dependency-update bots, CI agents, …) are drawn differently from
  humans
- **HUD** — repo-time clock, live author leaderboard, scrolling event ticker
- **Playback bar** — play/pause (spacebar), timeline scrubber (seeking deterministically
  rebuilds the world state), speed 0.5×–8×

Quiet periods (gaps > 4 h without activity) are automatically time-compressed so nights
and weekends don't stall the movie.

## How it works

`generate.mjs` runs `git log --all` plus `git for-each-ref`, then:

1. **Parses** commits with file-touch counts (`lib/parse.mjs`)
2. **Merges author identities** across name/email variants and flags bots (`lib/authors.mjs`)
3. **Infers branches** — GitLab/GitHub-style merge-commit subjects
   (`Merge branch 'X' into 'Y'`) name the merged branch; commits are assigned by walking
   first-parent chains from merge points and unmerged branch tips (`lib/branches.mjs`)
4. **Time-warps** the event stream onto the movie timeline (`lib/timewarp.mjs`)
5. **Injects** the JSON payload into `template.html` → `dist/git-galaxy.html`

The template is a single vanilla-JS Canvas 2D app; the page makes no network requests.

## Notes & limits

- Branch inference relies on merge-commit subjects. Squash-merge / fast-forward-only
  repos still work, but branch attribution is limited to unmerged branch tips.
- Repos without an `origin` remote fall back to local branches.
- Author identities merge on identical email **or** identical (case-insensitive) name.
- Bot detection defaults to a generic name pattern (`bot`/`automated agent`/`ci runner`).
  Pass `--bots "name1,name2"` to add your org's actual bot/service-account names.

## Development

```bash
node --test lib/*.test.mjs
```

Requires Node 18+.
