# Campaign Tab Analytics Log

Shows the `A11yTabsAnalytics` add-on forwarding tab changes to a local event log.

## What this example shows

- Normalized tab data for analytics or telemetry callbacks.
- A live local log without any external analytics SDK.
- Keyboard and pointer activations using the same callback path.

## How to run

Build the package first:

```bash
npm run build
```

Then open or serve `examples/addon-analytics/index.html`.

## What to try

- Activate each campaign tab.
- Compare logged tab ids, panel ids, and indexes.
- Navigate with keyboard only and confirm the same events appear.

## Accessibility notes

- The add-on does not alter tab semantics or focus behavior.
- The demo log is an ordered list with polite updates.
- No user-identifying information is collected.

## Files

- `index.html`
- `../addon-demo.css`
