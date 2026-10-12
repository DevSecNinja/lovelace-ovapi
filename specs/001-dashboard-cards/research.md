# Research decisions

- **Spec Kit**: official source install pinned `github/spec-kit@v1.1.3`
  (`0282d03eb6fc3091b3deaa3a855d4030dc40cd6c`), initialized using `specify init
  --here --force --non-interactive --integration copilot --ignore-agent-tools --script sh`.
  Actual generated skill instructions and template resolvers are used in-session;
  these agent instructions are not shell commands. No extension hooks installed.
- **HA integration**: use `hass.connection.subscribeMessage` with standard automatic
  resubscription; connection ready/disconnected listeners clear local state.
  Source: home-assistant-js-websocket `lib/connection.ts`, read 2026-10-12.
  State attributes were rejected because retained departures must not reach Recorder.
- **UI**: inherit the explicitly requested HA visual world, not a new branded shell.
  Dense timetable rows and a readable leave-time focal point. Native theme variables,
  system/HA font, text status not color-only, no ornamental animation.
  Source: HA developer custom-card documentation and Impeccable new-work/craft-floor.
- **Packaging**: HACS scans `dist` then releases/root; without releases it scans the
  default branch. Commit reproducible `dist/lovelace-ovapi.js` for eventual reviewed
  installation; branch push is not release publication. Source: HACS plugin docs.
- **Backend contract**: agreed directly with backend owner 2026-10-12. Fetch expiry
  29min; exact v1 mirrored in `contracts/card-v1.md`; source fixture is synthetic.
- **Testing**: separate unit/component and real-browser production-bundle layers.
  Docker not available locally; bounded actual HA runtime via backend Python
  environment is the next isolated-E2E attempt, not a component-harness substitute.
