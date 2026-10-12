# Validation quickstart

Use repo-local mise and the existing lockfile. Restore missing dependencies with
`mise run install`; do not change global tools or the live HA instance.

```sh
mise run check
mise run test
mise run browser
mise exec -- lefthook run pre-commit
```

Expected: model/config/lifecycle coverage gates pass, production bundle rebuilds,
and browser checks cover phone/tablet and light/dark grouped rows, following times,
limits, accessible editor and local advancement without requests.

For the synthetic grouped preview use `mise exec -- npm run harness` then
`http://127.0.0.1:4173/tests/harness/?grouped&editor`. Add `theme=dark&language=nl`
for Dutch dark mode. This is a production-resource component harness, not actual
HA E2E. Screenshots belong in ignored `test-results/` only.

Inspect phone/tablet screenshots together, correct defects in one batch, then
confirm once. No live source fixtures, full HA reinstall or release publication.
