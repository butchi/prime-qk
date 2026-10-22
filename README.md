# prime-qk

[English](./README.md) | [日本語](./README.ja.md)

An npm workspaces monorepo for Prime QK apps.

## Structure

```text
prime-qk/
├── apps/
│   ├── web-console/  # Prime QK Console (including the existing _lib)
│   ├── kantan/       # Kantan Sosu Daifugo (Vue app and CLI)
│   └── db/           # Number catalog and search site (Vue app)
├── packages/
│   └── catalog/      # Shared catalog types, data, generation, and search
├── scripts/          # Data generation scripts
├── package.json
└── package-lock.json
```

## Development

Run these commands from the repository root:

```sh
npm ci
npm run dev
```

`npm run dev` starts Prime QK Console. To run its scripts explicitly, use
`npm run <script> --workspace=@prime-qk/web-console`.

To start Kantan Sosu Daifugo:

```sh
npm run dev --workspace=@prime-qk/kantan
```

To run both apps at once, start them in separate terminals with explicit ports:

```sh
npm run dev --workspace=@prime-qk/web-console -- --port 5173 --strictPort
npm run dev --workspace=@prime-qk/kantan -- --port 5174 --strictPort
```

Kantan also provides a CLI and tests:

```sh
npm run cli --workspace=@prime-qk/kantan
npm run test --workspace=@prime-qk/kantan
```

See [the Kantan README](apps/kantan/README.md) for app-specific settings and
import provenance. Shared logic remains inside each app for now.

### Number catalog site

The service is named "QKサーチ — 素数大富豪の数を検索・判定".
Catalog search and integer/card-sequence primality checking are available.

```sh
npm run dev --workspace=@prime-qk/db -- --port 5175 --strictPort
npm run build --workspace=@prime-qk/db
npm run preview --workspace=@prime-qk/db
```

DB uses Vue 3, TypeScript, and Vite, and imports `@prime-qk/catalog` through
npm workspaces. The catalog covers every prime representation using 1–4 ranks
from A–K, plus every 5–6-card representation using only T/J/Q/K.
Jokers and suits are excluded, and each rank is limited to four copies.
There are 3,302 distinct numbers, generated independently rather than copied
from a third-party catalog. Five/six-card coverage is intentionally partial;
missing values or representations do not imply that no prime can be formed.

`packages/catalog/src/` defines the initial public types and exports.
`packages/catalog/data/entries.ts` holds the generated dataset.
`CatalogEntry.value` is a decimal integer string to avoid JavaScript number
precision loss. Its mathematical classification is `prime`, `composite`, or
`neither` (for example, 1); this does not define eligibility under game rules.
Every included prime has a deterministic trial-division verification record;
probabilistic primality testing is not used in this bounded dataset.
The list labels these simply as primes; verification details are available in
the collapsed "判定情報" section rather than repeating certainty in each badge.
Checker results beyond the deterministic range are labeled as prime candidates,
not confirmed primes.
Do not treat a number missing from this catalog as composite.

The search supports exact value, inclusive minimum/maximum, card count, digit
count, and numeric ascending/descending order. Conditions are combined with AND.
An entry matches a card-count condition if at least one representation matches;
only matching representations are shown in its expandable details.
For example, 113 has `AA3`, `AK`, and `J3`; a two-card filter shows the latter
two. Digit count describes the decimal number, not the number of card tokens.
Results are paginated at 50 numbers per page using a lightweight text UI.
Search and export controls support up to 6 cards and 12 decimal digits.

Regenerate and validate from the repository root:

```sh
npm run generate --workspace=@prime-qk/catalog
npm run test --workspace=@prime-qk/catalog
```

The generator enumerates all ordered 1–4-card sequences from 13 ranks, plus
5–6-card sequences from ranks 10–13 (at most four copies per rank), performs
trial division by sieved primes, and writes a stable dataset grouped by value.
All generated values are at most 12 digits and safely below Number.MAX_SAFE_INTEGER.
Tests independently verify full 1–4-card coverage with a sieve and restricted
5–6-card coverage with a separate odd-divisor trial-division implementation.
Commit the generated data with generator changes; the app build does not run
generation. Catalog integers are stored as strings, and searches use BigInt.

Catalog exports TypeScript source for Vite to bundle; its build script performs
type checking without generating artifacts. The DB output is `apps/db/dist/`.
There is no dependency on a prebuilt catalog, so the DB build works independently.
The generated catalog is bundled into a separate data chunk for caching independently of UI changes.
Existing game logic has not been moved to `packages/core`.

#### Implementation status and handoff

- [x] Agree on initial scope: no jokers, 1–3 cards, primes only.
- [x] Generate and verify the catalog with deterministic primality results.
- [x] Add basic search, matching card representations, and paginated text UI.
- [ ] Discuss the next increment before implementation: joker declarations,
  hand-based searches, composite numbers, equivalence/dominance relations,
  priorities, or card UI.
- [x] Add integer/card-sequence checking with explicit prime-candidate results
  beyond the verified deterministic range.
- [ ] Evaluate larger datasets and computation costs before choosing Web Workers,
  server computation, caching, or SSR. The initial app remains static.

## Build and preview

### DB URLs and static generation

- `/` provides the primality checker, with links to catalog search and number details.
  The legacy `/checker` redirects to `/`, preserving query parameters.
- `/numbers` lists entries; query keys are `exact`, `min`, `max`, `cards`,
  `digits`, `sort`, `page`, and `undominated`. Defaults and empty filters are omitted.
- `/numbers/list` shows the complete catalog grouped by card count and digit count.
  `/numbers/list.json` and `/numbers/list.txt` provide the same grouped list as static files.
- `/numbers/1213` identifies the integer; `#cards-12-13` highlights Q K.
- `/?value=1213` checks an integer; `/?sequence=12-13` checks Q K.
- `/sequences/12-13` is reserved for future sequence-specific pages.
- Searches and pagination update browser history and restore on reload/back/forward.
  Invalid, duplicate, or unknown conditions and out-of-range pages show errors.
- Unlisted numbers return a 404 explaining the catalog scope, not a composite verdict.

The DB build prerenders the search, grouped list, checker, all 3,302 detail pages, and a top-level `404.html`
using Vue's server renderer at build time only. No runtime SSR or Workers are needed.
Detail files such as `numbers/113.html` use Cloudflare Pages' extensionless URLs.
Generated `_redirects` handles the legacy checker URL, trailing slashes, and leading zeros
(one leading zero per redirect). Local preview also normalizes URLs and serves 404s.
The production origin is `https://db.primeqk.butchi.jp`. Generated list and detail
pages include absolute canonical and Open Graph URLs, titles, and descriptions.
Search variants use `/numbers` as their canonical URL. The 404 page remains
`noindex` without a canonical URL. An OGP image is not configured yet.
Attach this custom domain to the DB project in Cloudflare Pages and follow its
DNS setup instructions; repository changes alone do not configure DNS or deploy.

```sh
npm run test --workspace=@prime-qk/db
```

### Complete lists and exports

The grouped list uses the independently generated, trial-division-verified catalog:
no jokers, complete 1–4-card coverage, and T/J/Q/K-only 5–6-card coverage:
3,302 distinct primes. It does not reproduce a third-party list.
Card-count totals are 6, 38, 308, 2,865, 64, and 189 respectively.
Five/six-card groups explicitly note that they do not cover other ranks.
Values appear once per card-count/digit-count group, in numeric ascending order.
A value that has representations using different card counts appears in each applicable group,
so adding card-count totals does not give the distinct-value total.
Numbers and all card representations for that card count are shown together
(e.g. `113 (AK / J3)` for two cards). Card links highlight the matching representation
on the detail page. The search page links to this full list;
the minimal homepage remains unchanged.

Both exports are generated at build time and are also available in the Vite dev server.
JSON has `schemaVersion: 2`,
`scope: { jokers: false, minCards: 1, maxCards: 6, completeThroughCards: 4, extendedRanks: [10, 11, 12, 13] }`,
`total` (the distinct-value count), and `groups`.
Each group has `cardCount`, `count`, and `digits`; each digit group has `digitCount`
and `entries`. Each entry has `value` (a decimal string) and `representations`,
each with numeric `ranks` and formatted `cards` (e.g. `"QK"`).
Card notation uses one character per rank, without spaces, throughout the UI and exports.
Version 2 replaces version 1's `values` array with these entries.
TXT is UTF-8 with `#` scope/count headings; each data line is a decimal value,
a tab, and card representations separated by ` | `. Blank lines separate groups.
Ignore blank lines and `#` lines when reading TXT programmatically, and deduplicate
values from the first tab-separated column if a flat list of distinct primes is needed.
View/save links on the grouped page provide both formats.

The grouped page also offers client-side custom exports, with a preview and TXT/JSON
save buttons. Custom exports and detailed catalog notes are collapsed by default
to keep the start of the list in view. Card count (1–6) and digit count (1–12) filter both exports; totals are
recalculated for the selection. JSON keeps the same version 2 structure, including
both numbers and representations; `scope` describes the source catalog's limits.
TXT can contain numbers only, individual card representations only, or both
(`113 (AK / J3)`), separated by newlines, commas, or tabs, with optional
card-count/digit-count headings. Classification order and numeric order are retained;
duplicates across card counts remain. Empty selections show feedback and disable saving.
The complete on-page list and fixed export URLs are unchanged.

### Card permutation search

After checking a card sequence, a separate Web Worker searches permutations using
every input card with the original multiplicities, including four or more cards.
Integer-only input is never split into cards. Results show numbers and card notation
in descending numeric order, grouping sequences that produce the same number.
Links check the corresponding sequence.

Search is limited to five seconds and 100 displayed distinct values; finding a
101st value also stops the search. Partial results are retained, but timeout,
limit, cancellation, and errors explicitly mean incomplete search, not proof of
the maximum or absence of primes. Only a complete search without probable-prime
candidates may claim the largest prime. Candidates retain the same 2^64 certainty
boundary as the checker and are explicitly unproven, never confirmed upgrades.
Search can be cancelled/retried and is terminated on new input or navigation.
This search is independent of catalog coverage.

### Hiding dominated representations

Search and the grouped list offer an opt-in filter that retains only representations
of the largest prime obtainable by permuting the same card multiset (including rank
multiplicities). Comparison uses the full catalog before other filters. A number
remains if at least one representation survives. For example, 13 keeps `K` but loses
`A3` because `3A` makes 31. Detail pages retain every representation.
This is not game-state or joker-aware dominance.

Search persists this option as `undominated=1` in URLs/history.
The grouped list updates immediately and applies the same filter to custom TXT/JSON.
Fixed export files remain complete and unfiltered; their links are inside the
collapsed data-export panel so the list stays in the first viewport.

### Primality checker

The checker automatically detects the input format without a mode selector.
Digits alone (including `13` and `1213`, with an optional sign) are decimal integers
(up to 200 digits, excluding sign and surrounding whitespace but including leading zeros);
they are never automatically split into cards.
Card input accepts `QK`/`A23` using `A23456789TJQK` (case-insensitive), or
hyphen-separated ranks such as `12-13`/`1-2-3`. Existing `sequence` URLs still explicitly
parse cards, including a single numeric rank; `value` URLs explicitly parse integers.
Mixed forms such as `12K`, suits, jokers, leading
zeros in ranks, and space-separated cards are rejected. Each rank is limited to
four copies and the deck to 52 cards. This is not a game-state legality checker.

Computation runs locally in a Web Worker with a five-second timeout and cancellation.
Integers below 2 are neither prime nor composite. For n < 2^64, Miller–Rabin
uses bases 2, 325, 9375, 28178, 450775, 9780504, and 1795265022 for deterministic
classification after small-prime checks. Reference for the base set and bound:
[Deterministic variants of the Miller-Rabin primality test](https://miller-rabin.appspot.com/).
Above that range, passing fixed bases (the twelve primes from 2 through 37)
means only "prime candidate"; no randomized error probability is claimed.
Timeouts, cancellations, and errors never become primality verdicts.
Factorization is not implemented. Inputs are not sent to a server.

### Workspace builds

```sh
npm run build
npm run preview
```

The build command builds all workspaces that define a build script. Console
output is written to `apps/web-console/dist/`. The preview command serves the
built Console app.

Build and preview Kantan independently with:

```sh
npm run build --workspace=@prime-qk/kantan
npm run preview --workspace=@prime-qk/kantan
```

Kantan output is written to `apps/kantan/dist/`.

Keep dependencies in each app's package manifest and maintain the single
root lockfile with `npm install` from the repository root.
Runtime libraries belong in `dependencies`; types, compilers, and build tools
belong in `devDependencies`. Do not create lockfiles inside individual apps.

Console uses Vite 5 while Kantan and DB use Vite 6. Root overrides keep their Vue
and Vuetify plugins on Vite 6 even when npm hoists them beside Console's Vite 5.
The GTM plugin's optional Vue Router dependency stays on version 4, as in the
imported app, rather than pulling in Vue Router 5's newer Vite requirements.

## Cloudflare Pages

For the Console's Git-integrated Pages project, use the following build settings
in the Cloudflare dashboard:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Root directory | Leave empty (repository root) |
| Build command | `npm run build --workspace=@prime-qk/web-console` |
| Build output directory | `apps/web-console/dist` |

Install dependencies from the repository root so npm uses the workspace
configuration and the root `package-lock.json`. Development dependencies must
be installed for the TypeScript and Vite build.

These settings replace any previous root-level `dist` output directory.
Do not set the Pages root directory to `apps/web-console`: dependency
installation needs the root workspace manifest and lockfile. Using the
Console-specific build command also avoids building future apps.

For a separate Kantan Pages project, keep the root directory empty and use
`npm run build --workspace=@prime-qk/kantan` with the output directory
`apps/kantan/dist`. Kantan's local Vite environment files belong in
`apps/kantan/`, not the repository root.

For a separate DB Pages project, keep the root directory empty and use
`npm run build --workspace=@prime-qk/db` with the output directory `apps/db/dist`.

The dashboard settings are not changed by editing this repository. Apply the
settings to the existing Pages project and trigger a new deployment; verify
the deployed Console, its favicon, command input, and score modal afterward.