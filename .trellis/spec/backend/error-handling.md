# Error Handling

Reuse `services/server/internal/http/response/response.go` and its
`{code, message, data, success}` envelope consumed by the existing frontend.

```go
response.OK(c, result)
response.Error(c, http.StatusBadRequest, "invalid request")
response.Fail(c, http.StatusInternalServerError, "operation failed", err)
```

`Fail` logs internal failures and sends a safe public message;
`ErrorFromStatus` and `PublicErrorMessage` hide server errors.
Do not expose secrets, paths or raw subprocess output. Wrap errors with context,
propagate cancellation and test changed not-found/status behavior.

Never report success for failed external work. Update existing Swagger handler
annotations with API changes; do not assume a template `api/openapi.yaml`
is the current contract source.

## Local History Import (TASK-080)

`ImportGenerationMediaAssets` handles
`POST /generation/sessions/:sessionId/media-assets/import` with assetIds/kind,
optional projectId/scopeId/conversationTitle. Resolve existing conversation
scope/kind and validate every trimmed, unique asset ID before writing any
conversation or task. Missing/cross-project assets return404; wrong asset or
conversation kind/scope returns400. These validation failures leave all tasks
and the existing conversation unchanged, and create no empty conversation.
Valid imports preserve selection order and use provider `media-library` with
zero external usage. Explicit named creation without scope retains its ID and
defaults to studio; do not fall back to a different default-session ID.

Regression coverage in generation_runtime_test.go includes mixed valid/missing,
wrong-kind, foreign-project, existing/new conversation, scope/kind mismatch,
duplicate IDs and explicit creation without scope. Actual HTTP failure/success,
scope/project/type queries and restart records must also be checked. Database
write failures remain500; this contract does not promise a batch transaction or
cross-request idempotence. Wrong: validate and Upsert each item in the same loop.
Correct: validate the full selection, then use existing conversation/task writes.
