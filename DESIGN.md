---
name: OVAPI Home Assistant cards
description: Glanceable public transport information inside the user's HA theme.
typography:
  body:
    fontFamily: "var(--ha-font-family-body, sans-serif)"
    fontSize: "14px"
    lineHeight: 1.5
  countdown:
    fontSize: "clamp(2.5rem, 8vw, 3.5rem)"
    fontWeight: 600
  title:
    fontSize: "1.35rem"
  stop:
    fontSize: "1rem"
  metadata:
    fontSize: "0.875rem"
  line:
    fontSize: "1.05rem"
  time:
    fontSize: "1.2rem"
  leaveLabel:
    fontSize: "1.3rem"
rounded:
  route: "6px"
  cardFallback: "12px"
spacing:
  compact: "8px"
  row: "12px"
  inset: "20px"
---

# Design system

## Overview

An HA-native departure display, optimized for a quick decision at home. Inherits
the confirmed HA visual identity rather than introducing a separate app shell.
Familiar timetable alignment and a larger walking-adjusted countdown carry meaning.

## Colors

The user's HA theme is authoritative: primary/secondary text, card background,
divider and primary accent variables. Default light fallbacks are readable; dark
mode is inherited, never inferred independently of HA. Color never conveys status
alone. The accent is reserved for focus and native checkboxes.

## Typography

HA/system font, no downloaded fonts. Card title 1.35rem; stop and destination 1rem;
metadata 0.875rem. Times and countdowns use tabular numerals. Destinations wrap,
including unbroken text; time columns remain aligned.

## Layout

Card padding 20px, reduced to 12px under 360px. Timetable rows use a route column,
flexible destination and right-aligned time. Stops are divided, not nested cards.
Cards fit HA masonry and sections; phone/tablet layout remains HA's responsibility.
Below a 280px card container, times wrap under destinations to support half-width
sections independently of viewport size.

## Elevation & Depth

HA border, radius and shadow variables. No custom shadow, gradients or decoration.

## Shapes

Outlined 6px-radius route identifiers; HA-controlled outer card radius.

## Components

Departure rows keep cancellation text while suppressing countdowns. Commute view
selects only catchable noncancelled departures; stale boards show a warning rather
than a leave instruction. Status is announced, per-second countdowns are not.
Editor inputs have 44px targets and 3px visible focus. No authored animation;
reduced-motion rules remain defensive for inherited styles.

Opt-in grouped rows preserve the same badge/destination/time alignment. One row
represents transport + line + destination within a favourite; the next usable
departure remains dominant. A muted "Also in" line gives at most three subsequent
countdowns. Explicit cancellation clock times follow on a separate line, bounded
to three with a remaining count. Cancelled-only routes sit last with no countdown.
Secondary times use tabular numerals and wrap rather than truncating. The visual
editor shows only the active presentation's limit and explains what a route counts.

## Do's and Don'ts

Do make source freshness obvious. Do preserve unknown metadata and label it.
Do use explicit labels and real HA themes. Don't add polling, a refresh button,
persisted data or decorative transport claims. Synthetic examples are labelled.
