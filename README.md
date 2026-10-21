# prime-qk

An npm workspaces monorepo for Prime QK apps.

## Structure

```text
prime-qk/
├── apps/
│   ├── web-console/  # Prime QK Console (including the existing _lib)
│   └── kantan/       # Reserved for Kantan Sosu Daifugo
├── packages/         # Reserved for shared code
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

## Build and preview

```sh
npm run build
npm run preview
```

The build command builds all workspaces that define a build script. Console
output is written to `apps/web-console/dist/`. The preview command serves the
built Console app.

Keep dependencies in each app's package manifest and maintain the single
root lockfile with `npm install` from the repository root.
Runtime libraries belong in `dependencies`; types, compilers, and build tools
belong in `devDependencies`. Do not create lockfiles inside individual apps.

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

The dashboard settings are not changed by editing this repository. Apply the
settings to the existing Pages project and trigger a new deployment; verify
the deployed Console, its favicon, command input, and score modal afterward.