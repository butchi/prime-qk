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
npm workspaces. The initial catalog includes all primes formed by concatenating
1–3 ranks from A–K, without jokers. Each rank has four physical cards, and suits
are ignored. Because at most three cards are used, this inventory cannot be
exceeded. The 337 distinct numbers and all their ordered card representations
are generated independently, not copied from a third-party catalog.

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
For example, 113 has `A A 3`, `A K`, and `J 3`; a two-card filter shows the latter
two. Digit count describes the decimal number, not the number of card tokens.
Results are paginated at 50 numbers per page using a lightweight text UI.

Regenerate and validate from the repository root:

```sh
npm run generate --workspace=@prime-qk/catalog
npm run test --workspace=@prime-qk/catalog
```

The generator enumerates all 2,379 ordered rank sequences (13 + 13² + 13³),
performs trial division, groups by numeric value, and writes a stable dataset.
Tests independently verify completeness using a sieve of Eratosthenes.
Commit the generated data with generator changes; the app build does not run
generation. Catalog integers are stored as strings, and searches use BigInt.

Catalog exports TypeScript source for Vite to bundle; its build script performs
type checking without generating artifacts. The DB output is `apps/db/dist/`.
There is no dependency on a prebuilt catalog, so the DB build works independently.
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

- `/` redirects to `/numbers`.
- `/numbers` lists entries; query keys are `exact`, `min`, `max`, `cards`,
  `digits`, `sort`, and `page`. Defaults and empty filters are omitted.
- `/numbers/1213` identifies the integer; `#cards-12-13` highlights Q K.
- `/checker?value=1213` checks an integer; `/checker?sequence=12-13` checks Q K.
- `/sequences/12-13` is reserved for future sequence-specific pages.
- Searches and pagination update browser history and restore on reload/back/forward.
  Invalid, duplicate, or unknown conditions and out-of-range pages show errors.
- Unlisted numbers return a 404 explaining the catalog scope, not a composite verdict.

The DB build prerenders the list, checker, all 337 detail pages, and a top-level `404.html`
using Vue's server renderer at build time only. No runtime SSR or Workers are needed.
Detail files such as `numbers/113.html` use Cloudflare Pages' extensionless URLs.
Generated `_redirects` handles the root, trailing slashes, and leading zeros
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

### Primality checker

The checker switches between decimal integers (up to 200 digits, excluding sign
and surrounding whitespace but including leading zeros) and card sequences.
Card input accepts `QK`/`A23` using `A23456789TJQK` (case-insensitive), or
hyphen-separated ranks such as `12-13`/`1-2-3`. A single numeric rank is also valid.
Ambiguous multi-card digits, mixed forms such as `12K`, suits, jokers, leading
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