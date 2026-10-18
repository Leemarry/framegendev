# vendor

Prepares native ACP agent binaries and external media tools for MediaGo Drama.

The stable ACP agent output contract is:

```text
dist/<agent-id>/
  agent.json
  <agent binary>
  codex/             # Codex only: pinned native Codex distribution
```

`agent.json` stores relative launch metadata. The server joins it with the
runtime agent bin directory so development and packaged desktop resource paths can differ.

## Usage

```bash
task prepare AGENT=codex
task prepare AGENT=opencode
task prepare:tool TOOL=ffmpeg
task prepare:tool TOOL=ffprobe
task prepare:tool TOOL=dreamina
task prepare:tool TOOL=libtv
task prepare:tool TOOL=pippit
task prepare:media-tools
task prepare:generation-clis GENERATION_CLIS=dreamina,libtv,pippit
task prepare:rights PLATFORM=darwin-arm64
task prepare:all
task prepare:clean
```

Supported agents and pinned versions are defined in `agents.json`. OpenCode is
prepared from its matching GitHub release asset. Codex is prepared from the
official `@agentclientprotocol/codex-acp` npm package: the command compiles its
published JavaScript entry point into a standalone executable with the pinned
Bun version, then installs the matching pinned `@openai/codex` platform package
beside it. Node/npm are build-time requirements only; packaged applications do
not require a user-installed Node.js runtime.

The Codex manifest records `codexBin` as a relative companion path. The server
resolves it inside the agent directory and supplies it to the adapter through
`CODEX_PATH`.

If `dist/<agent-id>/agent.json` already matches the pinned versions, binary
names, args, and required executable files, prepare reuses the cached artifact
and skips the download.

Vendored tools such as `ffmpeg`, `ffprobe`, and generation CLIs are defined in
`tools.json` and prepared under:

```text
dist/tools/<tool-id>/
  tool.json
  <tool binary>
```

Tool entries store pinned release URLs instead of committing native binaries.
When `sizeBytes` or `sha256` are present for a platform, they are checked before
installation. Tools can be distributed as raw executables or archives; archived
tools declare `archivePath` for the binary to extract.

The private `mediago-rights` Runtime has a dedicated preparation task because
its pinned tool manifest is stored in a protected GitHub Release instead of the
public `tools.json`:

```bash
MEDIAGO_INCLUDE_PROTECTED_PACK_RUNTIME=1 \
MEDIAGO_PRIVATE_ARTIFACT_TOKEN=... \
MEDIAGO_RIGHTS_RELEASE_TAG=... \
task prepare:rights PLATFORM=darwin-arm64
```

The task downloads the release manifest and matching platform archive from
`mediago-dev/mediago-drama-private`, verifies the pinned policy, version, URL,
size, SHA-256, and archive member, then stages the standard tool layout at
`dist/<platform>/tools/mediago-rights`. If
`MEDIAGO_INCLUDE_PROTECTED_PACK_RUNTIME` is unset or not `1`, the task succeeds
without reading private credentials or preparing the Runtime. This is the
default local-development behavior.

`prepare:media-tools` always prepares the baseline media tools (`ffmpeg` and
`ffprobe`). `prepare:generation-clis` prepares the optional generation CLIs
selected for a build:

```bash
task prepare:generation-clis GENERATION_CLIS=dreamina
task prepare:generation-clis GENERATION_CLIS=dreamina,libtv,pippit
task prepare:generation-clis GENERATION_CLIS=dreamina,libtv,xiaoyunque
task prepare:generation-clis GENERATION_CLIS=none
```

`xiaoyunque` and `pippit-tool-cli` are accepted as aliases for the packaged
`pippit` tool.

## Checks

The module remains in `go.work` for workspace consistency, so the Go-oriented
check tasks stay available:

```bash
task check
task test
```

## Replacing generation CLI packages

Login and generation both read the prepared `tool.json` (`id`, `bin`, `version`,
`platform`). Keep the whole `dist/tools/<tool-id>/` directory together; Electron
stages it unchanged into `resources/tools/<tool-id>/`. `bin` is a relative path,
so a replacement can use a different filename or a version subdirectory. It must
be an executable entry compatible with the provider's CLI command contract, not
a GUI-only application. Windows uses a native executable; Unix also supports
executable scripts. Dependencies and Skills may travel beside the entry.

For example, a Windows Dreamina package can contain:

```json
{"id":"dreamina","bin":"1.4.20/dreamina.exe","version":"1.4.20","platform":"win32-x64"}
```

Use `libtv` and `pippit` as the other package IDs. Set `MEDIAGO_JIMENG_BIN_DIR`,
`MEDIAGO_LIBTV_BIN_DIR`, and `MEDIAGO_PIPPIT_BIN_DIR` to the tools directory for
web/server deployments; Electron sets these automatically. Explicit `*_PATH`
overrides take precedence. Without a manifest, legacy filenames and PATH still
work. A malformed manifest, missing entry, escaped path or wrong platform fails
closed. The model access page shows the selected path and declared package
version separately from credentials and membership access.

Stop active CLI jobs before replacing a whole package, retain the previous
folder for rollback, and restart the server to discard cached generation
providers. Update `tools.json` release metadata when preparing a new bundled
version. CLI command/output changes still require adapter compatibility tests;
replacing the executable alone does not guarantee protocol compatibility.
