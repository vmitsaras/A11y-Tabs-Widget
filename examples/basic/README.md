# Basic Example

This example imports the built package files from `../../dist`. Run `npm run build`
from the package root before opening `examples/basic/index.html`.

The markup uses real `button` elements for tabs and semantic `section` elements
for panels. The plugin adds the required ARIA tab roles, relationships, roving
`tabindex`, keyboard behavior, and hidden panel state.

Try the example with keyboard only:

1. Press `Tab` to reach the selected tab.
2. Use arrow keys to move focus between tabs.
3. Press `Enter` or `Space` to activate the focused tab.
4. Confirm only the active panel is visible.

For the GitHub Pages version, run `npm run docs:build` from the package root and
open `docs/examples/basic/index.html`. That page loads the same built package
assets from `docs/assets` so it can be served from the `docs/` folder.
