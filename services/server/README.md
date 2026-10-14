# server

HTTP server and stdio MCP entrypoints for the MediaGo Drama workspace.

Multimodal provider integrations live in
`github.com/mediago-dev/mediago-drama/packages/core`; server code should
import `core` when they need those capabilities.

## Quick start

```bash
go mod tidy
task check
task test
go run ./cmd/mediago-server --config configs/server.yaml
```

Development builds expose Swagger UI at `http://<host>:<port>/docs/index.html`
and the generated Swagger JSON document at `/openapi.json`. The root `task dev`
and `task dev:server` commands regenerate the local Swagger cache automatically;
after changing handler annotations, you can also run `task swagger` in this
module. The generated cache lives under `.cache/server-swagger/` and should not
be committed. Production builds use the `workspace_dist` tag and omit those
development documentation routes.

The server exports `ONE_INTERNAL_API_URL` and `ONE_INTERNAL_API_TOKEN` for
child processes. External stdio MCP clients can use:

```bash
go run ./cmd/mediago-mcp --config configs/server.yaml
go run ./cmd/mediago-document-mcp --config configs/server.yaml --project <id>
```

## Windows quality gates

Native `-race` requires an amd64 C compiler and `CGO_ENABLED=1`. Install a
portable MinGW-w64 toolchain in the ignored workspace cache, or pass an existing
compiler using `-CompilerPath`. The verified local toolchain is Winlibs
`winlibs-x86_64-posix-seh-gcc-16.2.0-mingw-w64ucrt-14.0.0-r2.7z` from
[the official release](https://github.com/brechtsanders/winlibs_mingw/releases/tag/16.2.0posix-14.0.0-ucrt-r2).
Its official SHA256 is
`53fb6773fbdf87cdf22b69a6b2a07ee33d3ada413b42d83044bc7cc6481400d2`.
Verify downloaded bytes before extracting; place `mingw64` under
`.cache/parity/gap-003/toolchain/` at the repository root.

Build/sync the embedded workspace first using the existing root build scripts.
With Go and go-task on PATH, run from this module:

```powershell
./scripts/check-windows.ps1 -Gate check
./scripts/check-windows.ps1 -Gate test
./scripts/check-windows.ps1 -Gate race
./scripts/check-windows.ps1 -Gate build
```

The runner invokes the existing gates, temporarily sets CC/CGO/PATH and bounds
Go package build concurrency with `-p=1`. It restores process environment values
after execution; it does not change global Go settings. Optional `-GoProxy` and
`-GoSumDB` parameters apply only to that invocation. The Taskfile POSIX commands
are interpreted by go-task. No race tests or checks are skipped.

Test SQLite pools belong to their isolated fixtures: register
`testutil.CloseDB(t, db)` before worker/store cleanup so the workers stop first.
Do not close a shared production pool. Process fixtures copy the native test
binary and require `testutil.RunExecutableFixture()` in the package TestMain;
they retain argument, challenge and cancellation assertions without real login.

## Layout

```text
cmd/mediago-server/      # HTTP server entrypoint
cmd/mediago-mcp/         # workspace MCP stdio entrypoint
cmd/mediago-document-mcp/ # document MCP stdio entrypoint
internal/app/          # embedded workspace HTTP server assembly
internal/domain/       # domain records and markdown document helpers
internal/repository/   # persistence boundary, being extracted from app
internal/service/      # business workflow boundary, being extracted from app
internal/http/         # HTTP handler/middleware boundary, being extracted from app
internal/workspace/    # workspace embed layer
configs/server.yaml    # example YAML config
go.mod                 # module declaration
Taskfile.yml           # go-task tasks (fmt / vet / test / tidy / check)
LICENSE                # Apache-2.0
```

`internal/workspace/dist` is a generated, ignored directory. Run the root
`pnpm build` script to build the React workspace, sync dist into the server module,
and compile the binary with the `workspace_dist` build tag.

## License

Apache-2.0 — see [LICENSE](LICENSE).
