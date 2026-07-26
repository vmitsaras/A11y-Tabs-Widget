# Direct Jump Shortcuts

Shows the `A11yTabsShortcuts` add-on adding optional direct keyboard shortcuts.

## What this example shows

- Explicit shortcut mappings.
- Root-scoped keyboard handling that stops when focus leaves the widget.
- Editable fields ignored while typing.
- Per-tab `data-a11y-tabs-shortcut` attributes mapped into add-on options.

## How to run

Build the package first:

```bash
npm run build
```

Then open or serve `examples/addon-shortcuts/index.html`.

## What to try

- Tab to the active Inbox tab, then press Ctrl+1 through Ctrl+4.
- This demo uses Ctrl instead of Option so macOS keyboard layouts do not turn
  number keys into symbols.
- Open DevTools and inspect `[a11y-tabs-shortcuts debug]` logs to compare
  `event.key`, `event.code`, modifier flags, and the configured shortcuts.
- Navigate the tablist with Arrow keys.
- Focus the notes textarea and confirm shortcuts do not interrupt typing.
- Move focus outside the widget and confirm the shortcuts stop.

## Developer notes

The add-on does not automatically read per-tab shortcut attributes. If you want
shortcut definitions beside each tab in markup, map them into the `shortcuts`
option:

```js
const shortcuts = Array.from(
  root.querySelectorAll("[data-a11y-tabs-tab]")
)
  .map((tab, index) => {
    const combo = tab.getAttribute("data-a11y-tabs-shortcut");
    return combo ? { combo, target: index } : null;
  })
  .filter(Boolean);

new A11yTabsShortcuts(tabs, { shortcuts });
```

The safe default is `scope: "root"`. Use `scope: "document"` only when an
application intentionally owns the bindings and provides a way to document,
disable, or remap them.

Disabled, hidden, disconnected, missing, and panel-less targets remain
inactive. A recognized unavailable target emits
`a11y-tabs:shortcut-unavailable` with the target tab when known and a `reason`
of `missing`, `disabled`, `hidden`, `disconnected`, or `missing-panel`.

## Accessibility notes

- Shortcuts are optional and shown on screen.
- Core tabs keyboard behavior remains available.
- Root-scoped shortcuts are active only while focus is inside the tabs widget.
- Successful contextual shortcuts move focus to the activated tab so focus is
  never left inside a panel that becomes hidden.
- Test every combination for browser, operating-system, and assistive-technology
  conflicts in your target environments; some browsers reserve Ctrl-number.

## Files

- `index.html`
- `../addon-demo.css`
