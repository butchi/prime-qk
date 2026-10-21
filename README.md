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