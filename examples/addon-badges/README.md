# Review Queue Badges

Shows the `A11yTabsBadges` add-on attaching counts and status labels to tabs.

## What this example shows

- Badges keyed by panel ids.
- Zero-count hiding.
- Custom accessible labels for badge state.

## How to run

Build the package first:

```bash
npm run build
```

Then open or serve `examples/addon-badges/index.html`.

## What to try

- Add and clear review counts.
- Toggle the urgent badge.
- Move between tabs and inspect the updated accessible names.

## Accessibility notes

- Visual badges are hidden from the accessible name by default.
- The add-on supplies deliberate `aria-label` text.
- Status text reports demo actions so state is not color-only.

## Files

- `index.html`
- `../addon-demo.css`
