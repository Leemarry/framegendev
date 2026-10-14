# Directory Structure

The real app uses `apps/workspace/src/domains/*` for feature ownership,
`shared/components/ui` for primitives, `shared/lib` for utilities,
`shared/stores` for UI preferences, `hooks` for cross-feature hooks,
`pages` for views, `types` for shared contracts, and `styles` for tokens.
Desktop host and packaging live in `apps/workspace/electron` and `scripts`.

Use `@/` imports. Feature API functions, components and stores belong in the
existing domain folders; follow neighboring naming and colocate tests.

Examples: `apps/workspace/src/domains/settings/api/settings.ts`,
`apps/workspace/src/domains/settings/components/CodexAccessPanel.tsx`,
`apps/workspace/src/shared/stores/theme.ts`.
Do not invent parallel `src/api` or `src/lib/stores` layers from template examples.
Inspect shared packages and Electron boundaries before relocating logic.
