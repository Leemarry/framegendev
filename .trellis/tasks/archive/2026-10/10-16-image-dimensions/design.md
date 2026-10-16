# Existing Image Dimensions

The gap lives in media/store.go: only video import/listing enriches existing
width/height fields. Use image.DecodeConfig (already registered PNG/JPEG/GIF
decoders in the package) to inspect local headers without decoding pixel data.
Reuse the current metadata backfill attempt guard/repository metadata update;
retain video behavior and skip complete image dimensions. Failed reads leave
dimensions absent and mark metadata failed, without failing file storage/listing.

AssetLibraryButton detail reads the physical mediaAsset width/height. Show the
row only with positive finite dimensions for image/video. No model, schema,
route, dependency, image processing, sorting/filtering or NLE changes.

Owned files: media/store.go plus image_metadata.go and focused tests; workspace
AssetLibraryButton.tsx and its existing tests. Common specs/ledger stay session1.
Rollback is reverting this isolated commit; original media bytes never change.
