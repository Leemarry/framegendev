# Design

AccountPanel belongs to settings/components. Replace the catalogue's generic
account pending page with this composition; keep the existing account nav value.
Settings.tsx adds this real page and validates its tab explicitly. No account API,
state or persistence is introduced: there is no commercial authentication source.

Use the same local identity already shown by WorkspaceUserMenu. Four unframed
metric columns match membership structure while replacing unknown membership,
balance and expiry with explicit pending integration. Local project count/limits
must not copy official free-account1-project limitation. Billing is an existing
local service; one command selects billing through the existing settings store.

Changed files: AccountPanel.tsx, settings-navigation.ts, Settings.tsx and related
Settings.test.tsx. No shared route/type/store/UI/style/dependency changes. Page
layout uses SettingsPanelLayout and existing design tokens with a48rem width.
Commercial controls are disabled and have precise reasons. No external links,
credentials, payment, login or requests to an official account service.
