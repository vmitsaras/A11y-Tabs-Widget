# Checkout Progress Stepper

Shows the `A11yTabsStepper` add-on syncing tabs with external progress controls.

## What this example shows

- Current step and total step text.
- Previous and Next controls.
- Disabled navigation at the start and end of the flow.

## How to run

Build the package first:

```bash
npm run build
```

Then open or serve `examples/addon-stepper/index.html`.

## What to try

- Use Next and Previous.
- Use Arrow keys in the tablist.
- Confirm progress text updates in both paths.

## Accessibility notes

- Progress text is placed in a polite live region.
- External controls are real buttons.
- The tablist remains the source of selected state.

## Files

- `index.html`
- `../addon-demo.css`
