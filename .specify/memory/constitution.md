# Lovelace OVAPI Constitution

## Core Principles

### I. Respect source and privacy

Cards MUST use only authenticated Home Assistant data. They MUST NOT request OVAPI,
refresh the backend, persist departures, or log payloads. Expiry, disconnect and
unsubscribe MUST erase source data. Source expiry MUST NOT exceed 29 minutes.

### II. Honest, accessible Home Assistant UX

Cards MUST distinguish loading, empty, stale, unavailable and contract errors.
Cancelled services MUST NOT produce actionable commute guidance. HA themes,
English/Dutch, phone/tablet, keyboard, contrast and reduced motion are required.
No official HA quality-scale certification may be claimed.

### III. Deterministic behavior verified offline

Critical time, contract, retention, lifecycle, configuration and rendering behavior
MUST have explicit assertions using synthetic fixtures. Routine tests and CI MUST
NOT call upstream services. Browser tests MUST load the production bundle.

### IV. Contract-first interoperability

The backend owns the versioned board contract. Breaking changes MUST be coordinated
and versioned. A bounded isolated HA setup-to-display check MUST use the actual
integration; a component harness MUST NOT be described as a full HA check.

### V. Small, maintainable delivery

Use typed boundaries, pinned local tooling, one self-contained HACS resource and
minimal dependencies. No global tool changes, live HA changes, release publication
or merging is allowed without explicit authorization.

## Scope

Departure boards and walking-time commute views, favourites and line/destination
filters. Bus/tram/metro only where covered; rail and journey planning are excluded.
The native Nederlandse Spoorwegen integration is independent and complementary.

## Development Workflow

Official pinned GitHub Spec Kit drives constitution, specification, plan, tasks,
implementation and convergence. Gates: lint, typecheck, unit/component coverage,
build, production browser checks, packaging and bounded isolated HA evidence.
Keep visual inspection bounded to one batched round, fixes and one confirmation.

## Governance

Changes require review against every principle, documented rationale and a
migration plan for contract changes. Version governance semantically: major for
incompatible principles, minor for new obligations, patch for clarifications.
No exception is implicit; record a justified exception in the feature plan.

**Version**: 1.0.0 | **Ratified**: 2026-10-12 | **Last Amended**: 2026-10-12
