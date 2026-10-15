# TASK-080 Generation History Read Status

REQ-019/045: project/global history drawers already share GenerationWorkspace.
Task reads currently discard SWR loading/error flags, making a failed initial
read look empty or leaving cached actions without an error/retry affordance.

- [ ] Expose task-read loading/revalidation/error through the existing hook and
  display truthful status plus explicit retry in the shared history workspace.
- [ ] Hide cached history actions while those reads are unavailable, retain all
  stored messages/tasks and the existing scope keys; recovery shows actual data.
- [ ] Real local-material import appears in its canonical project conversation
  and global history, excludes another project/kind, survives close/reload and
  own backend restart with complete documents/history/tasks unchanged.
- [ ] Actual failed reads/retry, responsive screenshots, regression/frontend gates,
  explicit source/main commits and integrated embedded-build smoke pass.

No provider generation, billing/settings edits, conversation navigation rewrite,
media-workspace history redesign, external service or new automation is included.
Overall080/150 stays incomplete and local imports are labeled as such.
