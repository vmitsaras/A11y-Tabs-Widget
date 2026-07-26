# Guided Release Channel Overflow Menu

Shows the `A11yTabsOverflowMenu` add-on adding a compact, direct-jump menu
when a nine-channel tablist no longer fits its container.

## What this example shows

- The original tablist remains visible, horizontally scrollable, and keyboard-operable.
- A generated Browse all channels menu mirrors every tab when overflow is detected.
- Selected state and the disabled Retired channel remain consistent in both controls.
- Narrow and Wide preview controls demonstrate when the generated menu appears or hides.
- Distinct release details make each selection change easy to confirm.

## How to run

Build the package first:

```bash
npm run build
```

Then open or serve `examples/addon-overflow-menu/index.html`.

## What to try

1. Leave the preview on Narrow and open Browse all channels.
2. Choose Security and confirm its original tab scrolls into view and its panel appears.
3. Use Arrow keys or Home/End in the original tablist, then press Enter or Space to select.
4. Open the generated menu and press Escape to close it and return focus to the trigger.
5. At a sufficiently wide desktop viewport, choose Wide and confirm the menu hides when all tabs fit.

The state message reports the actual measured result. At small browser widths,
the Wide preview may still overflow and correctly keep the menu available.

## Accessibility notes

- The generated menu trigger is a real button.
- The generated menu exposes `aria-haspopup` and `aria-expanded`.
- The generated menu mirrors selected and disabled state from the original tabs.
- Choosing a menu item selects and focuses its corresponding original tab.
- Escape closes the menu and returns focus to the trigger.
- The original tablist remains the primary tabs interaction.
- The width state uses a polite status message; tab selection relies on the
  existing focus and ARIA tabs state instead of adding a duplicate announcement.

The original tablist supports Arrow keys, Home, End, Enter, and Space. This
example does not claim arrow-key navigation inside the generated menu.

## Files

- `index.html`
- `../addon-demo.css`
