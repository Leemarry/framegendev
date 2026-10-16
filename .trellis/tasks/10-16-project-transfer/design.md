# Design

`document.Service` owns the transfer implementation. Export walks only the
project manifest, `work`, and project `assets` roots, rejecting symlinks and
unsafe archive names. Import extracts to a staging directory under the
workspace, validates the package manifest and project manifest, then atomically
moves the staged project directory into the selected destination and registers
one project row. A failed registration removes the moved directory. Existing
project IDs or destination paths are conflicts unless the caller requests a
fresh destination and the package identity is still unique.

Handlers stay thin and pass local absolute paths. The UI uses the existing
desktop file/directory pickers; browser fallback remains a manual path prompt.
