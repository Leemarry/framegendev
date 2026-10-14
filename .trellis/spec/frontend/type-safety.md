# Type Safety

Use domain API interfaces, typed component props and shared `src/types/api.ts`
contracts. The actual envelope is:

```ts
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  success: boolean;
}
```

`shared/lib/http.ts` returns that envelope, not its payload.
`domains/settings/api/settings.ts` contains provider/login/model contracts,
including compatibility values such as `"pending" | "completed" | string`.
Handle unknown server values safely; do not narrow them by assertion.

Use `unknown` with checks at external JSON, persisted data, CLI and IPC
boundaries. Static types are not runtime validation. No blanket `any`,
double assertions or non-null assertions hiding errors; no new validation
framework just to replace a small existing check.
Catalogue tests do not establish working HTTP contracts.
