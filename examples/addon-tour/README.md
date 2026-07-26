# Portfolio Onboarding Tour

Shows the `A11yTabsTour` add-on guiding users through tab panels.

## What this example shows

- Generated tour controls.
- Escape-to-skip behavior.
- Step callbacks updating a status region.
- Tab activation through the public tabs API.

## How to run

Build the package first:

```bash
npm run build
```

Then open or serve `examples/addon-tour/index.html`.

## What to try

- Start the tour.
- Move forward and backward.
- Press Escape to skip.
- Use the tabs directly after the tour.

## Accessibility notes

- Generated controls are real buttons.
- The popover text is visible and grouped.
- The active target outline is visual only; semantic tab state remains on the tabs.
- Reduced motion users get the same interaction without animation.

## Files

- `index.html`
- `../addon-demo.css`
