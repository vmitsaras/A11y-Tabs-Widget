# Lazy Loaded Incident Briefs

Shows the `A11yTabsLoader` add-on loading tab panel content on demand with local mock responses.

## What this example shows

- Loading state with `aria-busy`.
- Polite status messages.
- Error UI with a retry button.
- Cached content after a successful load.

## How to run

Build the package first:

```bash
npm run build
```

Then open or serve `examples/addon-loader/index.html`.

## What to try

- Open each report tab.
- Open the Risk tab to see the error state.
- Choose Fix endpoint and retry the Risk report.

## Accessibility notes

- Fallback panel content is readable before JavaScript.
- Loading messages use a polite status region.
- Error content uses `role="alert"` and a real retry button.
- The demo uses local mock fetch responses, not remote services.

## Files

- `index.html`
- `../addon-demo.css`
