# Account Settings Unsaved Guard

Shows the `A11yTabsUnsavedGuard` add-on preventing accidental tab changes when fields are dirty.

## What this example shows

- Dirty field tracking inside tab panels.
- Cancellable `a11y-tabs:before-change` behavior.
- Save and reset flows that mark panels clean.

## How to run

Build the package first:

```bash
npm run build
```

Then open or serve `examples/addon-unsaved-guard/index.html`.

## What to try

- Edit a profile field.
- Try to leave the tab and cancel the confirmation.
- Save or reset, then switch tabs again.

## Accessibility notes

- Fields use native labels and controls.
- Dirty panels receive a data attribute for non-color styling.
- The demo uses native confirmation; production apps can provide an accessible custom modal.

## Files

- `index.html`
- `../addon-demo.css`
