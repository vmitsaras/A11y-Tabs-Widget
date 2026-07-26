# Event-driven Auto-init

Shows the optional auto-init controller initializing tabs at document readiness
and within a dynamically inserted fragment after a scoped request event.

## What this example shows

- Explicit installation with no import-time initialization.
- Initial document-ready enhancement.
- Scoped dynamic initialization with `a11y-tabs:request-init`.
- Duplicate requests reusing the existing core tabs instance.
- Separate cleanup for the controller and initialized tabs.

## How to run

Build the package first:

```bash
npm run build
```

Then open or serve `examples/addon-autoinit/index.html`.

## What to try

- Use the initially rendered tabs with keyboard only.
- Insert the routed tabs and confirm they gain the same keyboard behavior.
- Request initialization again and confirm the init-event count remains one.
- Destroy and remove the routed tabs, then insert them again.

## Accessibility notes

- Both initial and inserted components use semantic buttons and readable panel content.
- Initial markup remains readable without JavaScript because inactive panels are not hidden in source HTML.
- The example inserts and initializes the routed fragment before moving focus into it.
- A polite status message reports insertion, repeated requests, and removal.
- The add-on does not change core keyboard, focus, ARIA, or reduced-motion behavior.

## Performance and lifecycle notes

- The controller performs one scoped query on document readiness or per request.
- It does not use `MutationObserver`, timers, storage, or network access.
- `controller.destroy()` removes auto-init listeners without destroying tabs instances.

## Files

- `index.html`
- `../addon-demo.css`
