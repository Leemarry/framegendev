# Readable Diff Presentation

Keep the authoritative server lines and parallelHistoryRows/historyChangeStarts helpers. Add a reading boolean to DocumentHistoryDiff; reading uses normal font and line-level semantic highlights, source retains monospace. Numbers/signs remain monospace. Exact line text stays React-escaped with whitespace wrapping. No custom diff/tokenizer, backend, API or dependencies.

In DocumentHistoryPanel's existing diff tab, add the shared Select for reading/source presentation, default reading as observed officially. Keep parallel/unified/navigation active for both. Rename the existing immutable snapshot tab to Full reading (全文阅读) to distinguish it from the diff presentation; exact source snapshot remains available. Frozen restore base and failure guards are unchanged. Scope: these two components, their tests, state spec and own task records.
