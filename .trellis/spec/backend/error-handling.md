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
