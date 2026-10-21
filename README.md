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
When probabilistic results are introduced, label those separately as prime
candidates instead of treating them as confirmed primes.
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
  priorities, card UI, or a standalone primality checker.
- [ ] Introduce probabilistic results and their evidence only when expanding
  beyond a verified deterministic range.
- [ ] Evaluate larger datasets and computation costs before choosing Web Workers,
  server computation, caching, or SSR. The initial app remains static.

## Build and preview

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