# Checkout Validation Summary

Shows the `A11yTabsValidation` add-on marking tabs that contain invalid fields.

## What this example shows

- Invalid tab badges.
- Accessible descriptions on invalid tabs.
- First invalid field focus.
- Native constraint validation plus a custom card-number rule.

## How to run

Build the package first:

```bash
npm run build
```

Then open or serve `examples/addon-validation/index.html`.

## What to try

- Press Validate checkout with empty fields.
- Fill fields and validate again.
- Reset the form to return to the error state.

## Accessibility notes

- Controls use visible labels.
- Invalid tabs receive badges and accessible descriptions.
- A polite status region announces the number of invalid fields.
- `focusFirstInvalid()` activates the matching tab before focusing the field.

## Files

- `index.html`
- `../addon-demo.css`
