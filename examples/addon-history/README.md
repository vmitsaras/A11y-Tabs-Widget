# Deep-Linkable Release Notes

Shows the `A11yTabsHistory` add-on pushing tab changes into browser history.

## What this example shows

- Hash-based panel URLs.
- Browser Back and Forward restoration.
- Stable panel ids used as history targets.

## How to run

Build the package first:

```bash
npm run build
```

Then open or serve `examples/addon-history/index.html`.

## What to try

- Activate several version tabs.
- Watch the URL hash change.
- Use the browser Back and Forward buttons.

## Accessibility notes

- History state changes do not change the tabs keyboard model.
- Restored panels still expose normal tab and tabpanel state.
- A polite status line reports the active panel and hash.

## Files

- `index.html`
- `../addon-demo.css`
