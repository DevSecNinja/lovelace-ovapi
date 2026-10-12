# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Home Assistant users deciding when to leave for a favourite public transport stop,
glancing at a phone or a wall tablet.

## Product Purpose

Readable upcoming departures and walking-time guidance, without adding upstream
requests or presenting old information as current.

## Operating Context

HACS-first dashboard cards paired with the separate OVAPI integration. Users
configure multiple favourite boards, optionally narrowing lines/destinations.
Amsterdam Centraal and Amstel illustrate configuration, not guaranteed coverage.

## Capabilities and Constraints

Departure board and commute view, available delay/cancellation information,
configurable walking time. No journey planning or NS rail data. The native NS
integration is complementary and independent. No live HA changes or publishing.
Authenticated backend data only; never browser polling or source persistence.

## Brand Commitments

Modern but HA-native: user themes, typography and familiar dashboard behavior take
precedence over novelty. Dutch and English, phone and tablet, light and dark.

## Evidence on Hand

Backend-owned v1 WebSocket contract and explicitly synthetic Amsterdam-themed
fixtures. No real API fixtures or claims of official HA Gold/Platinum status.

## Product Principles

Readability before decoration. Freshness is part of the answer. No request is the
cheapest request. Unknown is not on time, and stale is not cancelled.

## Accessibility & Inclusion

Keyboard-accessible controls, visible focus, readable contrast, screen-reader
status, wrapping destinations and reduced-motion support.

## Assumptions

The confirmed brief substitutes for a new interview: the question mechanism
reported the user unavailable. No additional branding or feature scope inferred.
