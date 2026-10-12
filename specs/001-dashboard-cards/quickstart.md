# Validation quickstart

```sh
mise trust
mise install
mise run install
mise run check
mise run test
mise exec -- npx playwright install chromium
mise run browser
```

The browser command builds the production resource and serves an offline synthetic
harness on loopback. It checks phone/tablet and light/dark, axe, keyboard, resource
registration, no upstream requests, expiry and rendering. Screenshots go to ignored
`test-results/`. This harness is not the actual HA E2E.

Actual isolated HA setup, invocation and results are recorded in
`verification.md` once the backend runtime is available.
