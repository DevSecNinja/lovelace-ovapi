# Lovelace OVAPI development

Follow `.specify/memory/constitution.md` and the feature artifacts in
`specs/001-dashboard-cards/`. Use repo-local mise and Conventional Commits.
Never call OVAPI from cards/tests, persist source departures, or change live HA.
Contract changes require coordination with `DevSecNinja/home-assistant-ovapi`.

Before committing run `mise exec -- lefthook run pre-commit`, `mise run test`,
and `mise run browser`. Regenerate `dist/lovelace-ovapi.js` rather than editing it.
Browser/HA screenshots stay in ignored local evidence folders.

Prefer central DevSecNinja/.github workflows/configuration; keep only the
product-specific frontend, browser and HA checks here. SHA-pin actions, enforce
lint failures, least permissions and no automatic release/package publication.
