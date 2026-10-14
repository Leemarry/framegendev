# Directory Structure

Actual entry: `services/server/cmd/mediago-server`; companion commands include
`cmd/mediago-mcp` and `cmd/mediago-document-mcp`.

`internal/app` wires startup, `internal/http/handlers` binds requests and writes
responses, and `internal/http/routes/routes.go` registers routes.
Services own business behavior, repositories DB access, domain models contracts.

Keep handlers thin and reuse constructors/boundaries; do not create the
template-only `cmd/server` or `http/router.go` paths.
`internal/config/config.go` uses `yaml.v3` with `ServerConfig` and environment
parsing in `env.go`. Extend it and `configs/server.yaml`; no unrelated Viper migration.
Root `go.work` includes seven modules; retain shared package ownership.
