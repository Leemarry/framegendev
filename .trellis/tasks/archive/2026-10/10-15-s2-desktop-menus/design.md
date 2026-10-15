# Design

Native menus belong to Electron main. Use built-in roles for editing, zoom,
window management and close/quit; no hand-written keyboard emulation. A small
typed one-way menu-command event connects main to preload to the existing
ProjectNavigator callbacks. Renderer subscribes/unsubscribes with component
lifecycle and ignores invalid events. Nothing crosses the backend boundary.

About uses dialog.showMessageBox on the active parent. File close/quit preserve
the existing before-quit and prompt-pack close guard. New project windows remain
unimplemented until181. Updating continues through the existing real update
capability panel; this task never triggers installation.

Native menu titles/order match screenshots07-14, but those screenshots do not
show every submenu. Do not claim unknown submenu fidelity. Retain useful native
edit/zoom commands and record that choice. Rollback is reverting this item;
no persisted application data changes.
