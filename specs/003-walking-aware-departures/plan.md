# Implementation Plan: Walking-aware departures

**Branch**: `devsecninja-commute-route-alternatives` | **Date**: 2026-10-13
**Spec**: [spec.md](spec.md)

## Summary

Add opt-in `time_mode: leave` to the departures card. Keep `departure` as default,
orthogonal to existing individual/grouped display. Reuse existing exact-event
grouping and limits, applying catchability before grouping. Preserve commute
defaults and legacy hero. Make the walking override visible only when applied.

## Technical Context

**Language/Version**: TypeScript 6.0.3, repo-local Node 22.23.3.
**Primary Dependencies**: Existing Lit 3.3.3 / Vite 8.3.4 only.
**Storage**: Existing transient subscription owner; HA owns dashboard config.
**Testing**: Vitest 5.0.3, Playwright 1.64.0, axe and actual isolated HA.
**Target Platform**: HA dashboards, phone/tablet, EN/NL, light/dark.
**Project Type**: HACS resource.
**Performance Goals**: One subscription per feed, at most three following times,
existing bundle size guard.
**Constraints**: No upstream calls, live HA mutation or source persistence.
**Scale/Scope**: Existing 1-12 feeds, 1-20 routes per feed (default five).

## Constitution Check

Pre-research and post-design: PASS. Preserve backend-owned v1 and source erasure.
Capture one render instant and pass it through subscription reads, reachability
and all countdowns without introducing a second expiry owner. Unknown facts stay
explicit. Native checkbox/draft/echo handling is untouched.

The backend peer owns one final joint actual-HA proof using its current combined
feed and synthetic upstream fixtures; offline checks remain frontend-owned.
Screenshots require no launch screen, loaded fonts and stable card geometry.
No constitutional exceptions.

## Project Structure

Documentation uses this feature directory; original `001-dashboard-cards`
lifecycle and `002-grouped-departure-rows` grouping contracts remain binding.

```text
src/model.ts         # time_mode validation, shared reachability/time helpers
src/cards.ts         # explicit leave labels; one instant per render
src/subscription.ts  # optional captured read instant, same irreversible owner
src/editor.ts        # orthogonal time selector and applicable walking override
src/localize.ts      # EN/NL mode, override and following-time copy
src/styles.ts        # restrained HA-native time labels
tests/fixtures/      # synthetic combined multi-route board
tests/unit/          # walking/identity/filter/limit/time regressions
tests/components/    # semantics, expiry/lifecycle and editor regressions
tests/browser/       # production bundle, responsive/a11y and editor assertions
tests/harness/       # synthetic host, explicitly not actual HA
```

## Complexity Tracking

No new dependency or parallel grouper. A shared reachable-departure selector
serves existing commute and opt-in leave mode. Existing grouping consumes the
selected candidates and retains exact-event identity and deterministic ordering.
Walking precedence is card override, otherwise selected feed's own value;
combined feeds never inherit or sum leaf walking durations.
