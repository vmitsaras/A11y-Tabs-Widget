# Responsive FAQ Accordion Adapter

Shows `A11yTabsAccordion` adapting a single-selected tabs interface into
required-open disclosure controls when its tablist wraps or overflows.

## What this example teaches

- The working FAQ appears before the supporting documentation.
- Wider layouts use the core tabs pattern and its roving keyboard focus.
- Constrained layouts use generated buttons with `aria-expanded` and
  `aria-controls`, based on the tablist's rendered geometry rather than a fixed
  viewport breakpoint.
- Focus moves to the equivalent control when the responsive presentation changes.
- The open disclosure remains focusable and exposes `aria-disabled="true"`
  because the single-selection model does not allow every panel to close.
- All answers are present in the source and remain readable without JavaScript.

## How to run

Build the package first:

```bash
npm run build
```

Then open or serve `examples/addon-accordion/index.html`.

## What to try

- Use the **Available width** and **Constrained** controls to switch the same
  example between tabs and disclosures without resizing the browser.
- At wider widths, use Left/Right Arrow, Home, and End to move focus through
  the tablist. Press Enter or Space to activate a focused tab.
- At narrow widths, Tab through each disclosure button and the open panel.
- Resize until the tab labels stop fitting on one row while a control has focus.
- Place the example in a narrow container within a wide viewport and confirm it
  still switches to disclosure controls.
- Activate the already-open disclosure and confirm the panel remains open.
- Disable JavaScript and confirm all four answers remain readable.

## Integration behavior

- Construct the core tabs instance before `A11yTabsAccordion`.
- This example passes `mediaQuery: false` to demonstrate container-only
  detection. The default also switches at `(max-width: 40rem)`.
- Call `accordion.update()` after programmatically changing tab labels or layout
  styles when the root width itself stays unchanged.
- Repeated construction for the same tabs root returns the existing accordion
  instance and does not duplicate generated controls.
- `accordion.destroy()` removes only the adapter and restores its original
  presentation state. Destroying the core tabs instance also cleans up the add-on.
- The adapter is single-selection. It is not a multi-open standalone accordion.

## Files

- `index.html`
- `../addon-demo.css`
