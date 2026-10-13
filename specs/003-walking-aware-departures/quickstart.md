# Validation guide: Walking-aware departures

Use repo-local mise and installed lockfile dependencies. All fixtures are synthetic.

1. Run `mise run test`, `mise run browser` and
   `mise exec -- lefthook run pre-commit`.
2. Open the labelled synthetic harness at
   `/tests/harness/?grouped&leave&editor`; add `theme=dark&language=nl` for Dutch
   dark mode. This is a component host, not Home Assistant.
3. With a seven-minute feed walk, departures in 2/8/14/20/26 minutes must show
   Leave in 1 min and Also leave in 7/13/19 min. Other transport/destination
   routes stay separate. Change the override, clear it, then set zero.
4. Switch Departure time / Leave time independently of row grouping. Default
   departure countdowns and the existing commute hero remain unchanged.
5. Verify stale/unavailable/expired data gives no leave advice, then verify
   hidden/disconnected/removed cleanup and clock rollback after observed expiry.

The joint actual-HA check uses the backend peer's isolated current integration,
at least three combined source favourites, authenticated WebSocket data, native
editor save/reopen and the production bundle identified by SHA256/source head.
No live HA or upstream calls. Phone/desktop screenshots wait for the HA launch
screen to disappear, `document.fonts.ready` and stable card geometry after each
navigation or resize. Store screenshots only in ignored local evidence folders.
