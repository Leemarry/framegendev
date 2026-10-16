# Component Guidelines

Reuse `@/shared/components/ui`, Radix, `lucide-react`,
`cn` from `@/shared/lib/utils`, and `useToast` from `@/hooks/useToast`.
Type props and keep feature composition in its domain.

`domains/settings/components/SettingsPanelLayout.tsx` owns the full-height
header and scrolling content. Compose one layout per panel; nesting complete
panels creates duplicate headers and scroll containers. Its existing pattern:

```tsx
<div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-5", contentClassName)}>{children}</div>
```

Use existing semantic/IDE theme utilities; add new color variables to
`src/styles/tokens.css` first. Match official density and light/dark states.
Preserve Electron drag/no-drag regions. Use accessible dialogs, cancel paths,
keyboard focus, labeled buttons and tooltips for unfamiliar icons.

Examples: `CodexAccessPanel.tsx`, `AgentModelProfilesPanel.tsx` and their tests
in the settings domain. Loading, empty, error and disabled states must reflect
real data. A visible card/button alone does not establish working functionality.

Root project management owns its single header (`Projects.tsx`); `App.tsx`
suppresses the common header only for the projects sidebar screen. Its fixed
325px sidebar does not change persisted widths of other screens. Scoped
`--ide-sidebar` applies the reference surface to utility-colored sidebar screens.
CSS component rules cannot override later Tailwind utility layers by specificity:
use responsive utility visibility for the recent-project section. Kebab and card
open controls are sibling buttons; right-click and kebab share lifecycle actions.

WorkspaceUserMenu uses Radix CheckboxItem for theme state; preventDefault in
onSelect keeps the menu open while existing theme setMode persists changes.
Its portal owns --popover via the user-menu token, since root sidebar variables
are not inherited through portals. Radix sideways language submenus overflow
390px viewports; at <=700px use the same popup with a back row and restore focus.
Verify parent and submenu bounds separately, including a low-height scroll case.

Project workspace (`AppLayout.projectWorkspace`) shares a 325px sidebar and
55px project header across documents/settings. `workspace-shell.css` uses scoped,
unlayered rules to override existing Tailwind utility dimensions; moving them
into a components layer restores the old utility sizes. Other sidebar widths
still use the persisted store. Narrow navigation is keyed by pathname/search,
closes on route changes, and handles Escape only inside its DOM so a Radix portal
menu can close independently. Verify focus restoration and short-height scrolling.

`SidebarScreenStack` sets `inert={!isActive}` on inactive sections. Native inert
already excludes their descendants from focus and the accessibility tree; adding
aria-hidden before inert triggers Chrome's retained-focus warning on navigation.
Its tests cover exactly one interactive section through push/pop/root changes.

AssetLibraryMetadataEditor uses the physical media ID as its React key, so changing
selection discards the old draft. Revalidation supplies saved tags/note/rating;
failed writes keep the draft. Radix Dialog's native Escape listener runs before
React's bubbling onKeyDown: its Content.onEscapeKeyDown must prevent dismissal
when the event target is inside [data-asset-metadata-editor], allowing the form
to cancel first. The next Escape can close the library. Verify this through the
actual parent dialog, not only an isolated editor test.

AssetLibraryWorkspace shares one data/operation implementation for dialog and
page presentations. Project navigation opens /assets; App skips its outer shell
and Agent/Document sync there. Page return state preserves pathname/search and
the original route state, including through nested settings navigation. Refresh
revalidates media, selected resources and documents used for association filters.
Page controls must not render Radix Dialog Title/Description without a Root.
Scope IDE surface overrides to .asset-library-page; do not alter editor tokens
globally to match the library reference.

Page usage filtering requests includeUsage only for a specific usage filter,
using a distinct SWR media key. Unknown usage never matches unused. Adopted-only
items can match selected using actual adoption rows; physical files require the
server projection. All restores the original request/key; scope/open resets the
local choice. Keep existing loading/error/retry and intersect folder/tag/source
filters. Import lineage is not generation reference usage. Official menu choices
are confirmed; local relationship semantics do not prove official nonempty rules.

The page's dedicated tag filter matches only saved media tags (trimmed,
case-insensitive substring) and intersects existing folder/search/type/rating
filters. Full-text search still includes notes and filenames. Filter text is local
view state, cleared on scope/open changes; filtering must never save metadata.
Keep unknown tags nonmatching and failure states free of cached actions. Verify
saved tags separately from filter preference persistence after reload/restart.

Include-subfolders is local page state using the existing cycle-safe folder path;
retain direct-folder defaults and reject foreign scope before descendant matching.
Keep immediate child navigation. Filter popup height follows Radix available
height with scrolling and collision padding so all controls remain reachable at
390x480; inspect both the top checkbox and bottom tag field after scrolling.

Directory/all browse mode uses the same scoped API data; all ignores folder
placement and hides folder cards while keeping the current upload destination.
Opening a folder resets directory mode. Disable include-subfolders in all mode
without losing its choice; scope/open resets both local preferences. Do not
requery global assets to implement an all-folders view within a project.

Apply the visible source filter in both global and project library views. Its
existing media/selected values describe physical assets versus adoption records,
not provider provenance. Global mode never fetches project adoption records;
selected-only therefore has an empty result instead of leaking other projects.

Page provenance is separate from media/selected resource records. Use recorded
physical media source first; only absent physical source falls back to adoption
sourceType. Upload/import types are local, generation/toolbox/edited generated,
unknown nonempty or conflicting fallback groups other, absent records unrecorded.
Never infer source from filenames. Browser capture remains disabled pending a
producer contract. Provenance intersects existing filters and never writes data.
