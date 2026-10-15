# TASK-030 configured media download paths

## Change

GenerationTaskService receives immutable WorkspaceRoot/MediaDir from existing app wiring and forwards them through all task/selection projections. Global library assets use the configured MediaDir, legacy root-relative assets use WorkspaceRoot, and explicit project/absolute/empty paths retain their behavior. No stored path relocation, file rewrite, schema/API change, extra repository lookup or dependency.

## Source Verification

- Before the fix, the real isolated local-import history and adoption returned a default-root path different from the media API. Only the incorrect response string was examined; no default directory was accessed.
- Full app regression reproduced all four wrong responses (import, history list, adoption, selection list). It intentionally configures assets outside the workspace directory; all four now match the actual media path and file bytes remain unchanged. Initial test expectation incorrectly used workspace rather than the configured MediaDir; corrected before evaluating the four regressions.
- Eight compatibility cases cover configured global/custom/legacy paths, absolute/empty paths, explicit project directories, project-relative fallback and missing directory. Focused generation tests passed7.389s; app regression passed6.393s; standalone go build passed.
- Actual isolated31450: existing global asset-b0b867434dbc600a imported locally, history and adoption paths corrected. Complete records differ from old output only in downloadPath; both projects' full documents and media metadata remain identical. Corrected path is checked inside the isolated root before reading. Source file, content API and actual copied PNG hashes match.
- Real backend stop/restart retained the complete corrected task and selection. Actual unadopt removed only the fixture selection; imported task and both full document sets stayed unchanged.
- Browser-harness actual preview click rendered the existing480x640 image; evidence/source-preview.png inspected. Escape closed it. Actual save click returned to the enabled save control without a success claim in browser mode; no Electron directory dialog was available. Native save/cancel remains unverified; the filesystem copy is not native-dialog acceptance.
- Full Windows check passed: tidy/fmt/vet/lint, three executable builds, Swagger and all-package race. App42.621s; full log remains .cache/parity/task-030-path/windows-check.log. Temporary LF normalization restored original tracked bytes. Standalone embedded executable built and ran.
- Frontend unchanged: lint/full705-fileformat/build plus generatedResultActions/downloads/MediaGenerationWorkspace3files57tests passed. Existing main full235files1552tests passed for the unchanged frontend in the prior accepted item; do not represent that as rerun for this item.

## Limits And Integration

Main integration and production smoke pending. No real provider generation, Agent, login/payment, native Jianying reopening or session2 native-window acceptance. Overall030/080/150 remain incomplete. Session2 branch remains617a80d.
