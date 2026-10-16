# Design

Extend the existing physical media metadata contract. Add `Favorite bool` to
`domain.AssetModel` and `service/media.MediaAsset`; Gorm AutoMigrate adds the
non-null false column to existing workspace databases. Extend
`MediaAssetUpdateRequest` with `Favorite *bool`, and include it in the existing
metadata validation/update map so omitted and explicit false remain distinct.

The repository remains the only SQL boundary. `MediaAssets.List` and
`ListWithUsage` continue to project the same scope and visibility rules. The
existing PUT routes accept the new field, so no route shape changes are needed.

The frontend adds `favorite` to `MediaAsset`, sends it through the existing
metadata editor save payload, and adds a `favorite` filter to
`filterAssetLibraryItems`. The filter is a view-only condition intersected with
the existing predicates. The preview/editor uses a star toggle for the
physical media item and revalidates the current SWR list after saving. Selected
adoption-only rows have no independent favorite state and do not render the
toggle.

Out of scope: recycle-bin semantics, permanent deletion changes, external
provider favorites, account sync, and localStorage-only preference persistence.
