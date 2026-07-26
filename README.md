# A11y Tabs

Accessible tabs behavior for semantic, progressively enhanced tab interfaces.

`a11y-tabs-widget` is framework-independent, TypeScript-first, ESM-only, and
safe to initialize more than once. It adds the ARIA tabs pattern, roving focus,
keyboard navigation, optional hash activation, and complete cleanup to ordinary
HTML.

## Installation

```bash
npm install a11y-tabs-widget
pnpm add a11y-tabs-widget
yarn add a11y-tabs-widget
```

## Usage

```ts
import { createTabs } from "a11y-tabs-widget";
import "a11y-tabs-widget/styles.css";

const root = document.querySelector("[data-a11y-tabs]");

if (root instanceof HTMLElement) {
  createTabs(root, {
    activation: "manual"
  });
}
```

Use `initTabsAll()` when a page or routed fragment contains multiple tab
components.

```ts
import { initTabsAll } from "a11y-tabs-widget";

initTabsAll();
```

## CSS

Default CSS is available as an optional import.

```ts
import "a11y-tabs-widget/styles.css";
```

The stylesheet uses BEM classes with the `a11y-tabs` block and public custom
properties prefixed with `--a11y-tabs-*`.

```css
.a11y-tabs {
  --a11y-tabs-accent-color: #0369a1;
  --a11y-tabs-focus-color: #b45309;
  --a11y-tabs-radius: 0.5rem;
}
```

Public CSS hooks:

- Block classes: `.a11y-tabs`, `.a11y-tabs__list`, `.a11y-tabs__tab`,
  `.a11y-tabs__panel`, and `.a11y-tabs__sr-only`.
- State classes set by the runtime: `.is-initialized`, `.is-active`, and
  `.is-disabled`.
- Public custom properties:
  `--a11y-tabs-border-color`, `--a11y-tabs-panel-border-color`,
  `--a11y-tabs-background`, `--a11y-tabs-muted-background`,
  `--a11y-tabs-hover-background`, `--a11y-tabs-active-background`,
  `--a11y-tabs-text-color`, `--a11y-tabs-muted-color`,
  `--a11y-tabs-disabled-color`, `--a11y-tabs-accent-color`,
  `--a11y-tabs-focus-color`, `--a11y-tabs-radius`, and `--a11y-tabs-gap`.

Variables prefixed with `--_` are internal implementation details and are not
part of the public styling API.

## HTML Structure

Use a root element with `data-a11y-tabs`, one tablist, real `button` elements for
tabs, and one panel per tab. Each tab points to its panel with
`data-a11y-tabs-panel-id`.

```html
<div class="a11y-tabs" data-a11y-tabs>
  <div class="a11y-tabs__list" data-a11y-tabs-list aria-label="Product information">
    <button
      class="a11y-tabs__tab"
      type="button"
      data-a11y-tabs-tab
      data-a11y-tabs-panel-id="details"
    >
      Details
    </button>
    <button
      class="a11y-tabs__tab"
      type="button"
      data-a11y-tabs-tab
      data-a11y-tabs-panel-id="reviews"
    >
      Reviews
    </button>
  </div>

  <section class="a11y-tabs__panel" id="details" data-a11y-tabs-panel>
    <h2>Details</h2>
    <p>Product details content.</p>
  </section>

  <section class="a11y-tabs__panel" id="reviews" data-a11y-tabs-panel hidden>
    <h2>Reviews</h2>
    <p>Customer reviews content.</p>
  </section>
</div>
```

The runtime also accepts the legacy selectors from the original demo:
`[data-tabs-list]`, `[data-tab-target]`, and `[data-tab-panel]`.

## API

### `createTabs(root, options)`

```ts
function createTabs(root: HTMLElement, options?: TabsOptions): TabsInstance;
```

Initializes one tabs component. Repeated calls on the same root return the
existing instance.

### `initTabsAll(options, scope)`

```ts
function initTabsAll(options?: TabsOptions, scope?: ParentNode): TabsInstance[];
```

Initializes every `[data-a11y-tabs]` or `.a11y-tabs` root in the document or a
scoped container.

### `A11yTabs`

```ts
class A11yTabs implements TabsInstance;
```

Plugin-specific class used by `createTabs()`.

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `activation` | `"manual" \| "automatic"` | `"manual"` | In manual mode, arrow keys move focus and Enter or Space activates. In automatic mode, focused tabs activate immediately. |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Chooses horizontal or vertical arrow-key behavior and sets `aria-orientation` for vertical tablists. |
| `dir` | `"auto" \| "ltr" \| "rtl"` | `"auto"` | Direction used for horizontal arrow-key behavior. |
| `useHash` | `boolean \| string` | `false` | Activates a panel from the URL hash and updates the hash on tab changes. |
| `scrollSelectedIntoView` | `boolean \| string` | `true` | Keeps focused and selected tabs visible in scrollable tablists. |
| `initialIndex` | `number \| string` | `null` | Selects an initial enabled tab by index when no hash is used. |

The same options can be provided as dataset values on the root, for example
`data-a11y-tabs-activation="automatic"` or
`data-a11y-tabs-scroll-selected-into-view="false"`.

### Instance Methods

```ts
interface TabsInstance {
  activate(indexOrId: number | string): boolean;
  activateByPanelId(panelId: string): boolean;
  next(): boolean;
  previous(): boolean;
  getActiveTab(): HTMLElement | null;
  getActivePanel(): HTMLElement | null;
  destroy(): void;
}
```

`activate()`, `activateByPanelId()`, `next()`, and `previous()` return `true`
when activation succeeds and `false` when the target is invalid, disabled, or
cancelled by `a11y-tabs:before-change`.

### Events

All events bubble from the root. Event detail always includes `instance`.

| Event | Cancellable | Detail |
| --- | --- | --- |
| `a11y-tabs:init` | No | `{ instance }` |
| `a11y-tabs:before-change` | Yes | `{ instance, tab, panel, index, previousIndex }` |
| `a11y-tabs:change` | No | `{ instance, tab, panel, index, previousIndex }` |
| `a11y-tabs:destroy` | No | `{ instance }` |

## Optional Add-ons

Add-ons are explicit opt-ins. Most add-ons receive a core tabs instance or tabs
root after initialization. The auto-init helper is installed first because it
owns the initialization trigger rather than an individual tabs instance.

```ts
import { createTabs } from "a11y-tabs-widget";
import { A11yTabsValidation } from "a11y-tabs-widget/addons/a11y-tabs-validation";

const root = document.querySelector("[data-a11y-tabs]");

if (root instanceof HTMLElement) {
  const tabs = createTabs(root);
  const validation = new A11yTabsValidation(tabs);

  validation.focusFirstInvalid();
}
```

| Import | API | Adds |
| --- | --- | --- |
| `a11y-tabs-widget/addons/a11y-tabs-accordion` | `A11yTabsAccordion` | Container-aware accordion-style controls that mirror the single-selection tabs state. |
| `a11y-tabs-widget/addons/a11y-tabs-analytics` | `A11yTabsAnalytics` | Tab change callbacks for forwarding local interaction data to your own analytics layer. |
| `a11y-tabs-widget/addons/a11y-tabs-autoinit` | `installTabsAutoInit()` | Explicit document-ready initialization and scoped request events for routed fragments. |
| `a11y-tabs-widget/addons/a11y-tabs-badges` | `A11yTabsBadges` | Count or status badges on tab controls. |
| `a11y-tabs-widget/addons/a11y-tabs-history` | `A11yTabsHistory` | Browser history entries for tab changes using hash, query, or state mode. |
| `a11y-tabs-widget/addons/a11y-tabs-loader` | `A11yTabsLoader` | Lazy panel loading from a panel `data-tab-src` attribute by default. |
| `a11y-tabs-widget/addons/a11y-tabs-overflow-menu` | `A11yTabsOverflowMenu` | A generated jump menu for overflowing tablists. |
| `a11y-tabs-widget/addons/a11y-tabs-shortcuts` | `A11yTabsShortcuts` | Optional direct keyboard shortcuts for activating tabs. |
| `a11y-tabs-widget/addons/a11y-tabs-stepper` | `A11yTabsStepper` | Previous/Next controls and progress text synced with tabs. |
| `a11y-tabs-widget/addons/a11y-tabs-tour` | `A11yTabsTour` | Guided tour controls that activate panels in sequence. |
| `a11y-tabs-widget/addons/a11y-tabs-unsaved-guard` | `A11yTabsUnsavedGuard` | Dirty form tracking that can cancel tab changes. |
| `a11y-tabs-widget/addons/a11y-tabs-validation` | `A11yTabsValidation` | Invalid-field summaries, tab badges, and focus routing for forms inside panels. |

Instance-bound add-ons listen for `a11y-tabs:destroy` and remove their listeners
or generated DOM when the core tabs instance is destroyed. The page-level
auto-init controller has its own `destroy()` method.

### Event-driven auto-init

Importing the auto-init add-on has no side effects. Call
`installTabsAutoInit()` explicitly to initialize existing tabs when the document
is ready and listen for later scoped initialization requests.

```ts
import {
  A11Y_TABS_INIT_REQUEST,
  installTabsAutoInit
} from "a11y-tabs-widget/addons/a11y-tabs-autoinit";

const autoInit = installTabsAutoInit({ activation: "manual" });

// After inserting a routed or server-rendered fragment:
container.dispatchEvent(
  new Event(A11Y_TABS_INIT_REQUEST, { bubbles: true })
);

// Removes auto-init listeners without destroying initialized tabs.
autoInit.destroy();
```

The event name is `a11y-tabs:request-init`. Its event target becomes the scan
scope, including when that target is itself a tabs root. Install the controller
on the closest shared `Document`, `Element`, or `ShadowRoot` that will receive
the bubbling request. Repeated installation for the same scope returns the
existing controller; options passed by later calls are ignored.

`controller.init(scope?)` performs the same scoped initialization directly and
returns the resulting `TabsInstance[]`. `controller.destroy()` removes only the
document-ready and request listeners; destroy application-owned tabs instances
separately when their markup is removed.

The helper uses no DOM observer, timer, storage, or network request. Dispatch a
request once per meaningful fragment insertion rather than from scroll, resize,
or animation paths. Initialize a fragment before moving focus into it because
core initialization can hide inactive panels.

### Direct shortcuts

`A11yTabsShortcuts` listens on the tabs root by default, so configured bindings
work only while focus is inside that widget. Editable controls are ignored by
default. Successful shortcuts invoked from inside the widget move focus to the
activated tab so focus is not left in a panel that becomes hidden. Set
`scope: "document"` only when the application intentionally owns, documents,
and conflict-tests those global bindings.

Shortcut mappings bind to the matching tab present when the add-on is created
or `setShortcuts()` runs. Disabled, hidden, disconnected, missing, and
panel-less targets do not activate. Recognized unavailable targets emit a
bubbling `a11y-tabs:shortcut-unavailable` event whose detail includes `tabs`,
`root`, `shortcut`, `tab`, and a `reason` of `missing`, `disabled`, `hidden`,
`disconnected`, or `missing-panel`.

If tab markup is added, removed, or replaced dynamically, destroy and
reinitialize the core tabs instance and add-on before rebuilding shortcut
mappings. Do not silently redirect an unavailable shortcut to a different tab.

### Responsive accordion adapter

`A11yTabsAccordion` keeps the core tabs state and presents generated,
required-open disclosure buttons when the tablist wraps or overflows, or when
its media query matches.

```ts
import { createTabs } from "a11y-tabs-widget";
import { A11yTabsAccordion } from "a11y-tabs-widget/addons/a11y-tabs-accordion";

const root = document.querySelector("[data-a11y-tabs]");

if (root instanceof HTMLElement) {
  const tabs = createTabs(root);
  const accordion = new A11yTabsAccordion(tabs);

  // Removes only the responsive adapter.
  accordion.destroy();
}
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mediaQuery` | `string \| false` | `"(max-width: 40rem)"` | Also chooses when the disclosure presentation replaces the visible tablist. Use `false` for container-only detection. |
| `collapseOnWrap` | `boolean` | `true` | Switches when the tablist forms multiple rows or overflows horizontally. Set `false` for media-query-only behavior. |
| `buttonClass` | `string` | `"a11y-tabs__accordion-button"` | Class applied to each generated disclosure button. |
| `buttonText` | `(context) => string \| Node` | `null` | Creates custom button content from the matching tab, panel, index, tabs, and panels. |

- Wrapping is based on the tablist's actual rendered geometry, so a narrow
  component can adapt inside a wide viewport. A feature-detected
  `ResizeObserver` rechecks container changes; older browsers fall back to
  window resize checks.
- Call `accordion.update()` after changing tab labels or layout styles
  programmatically when the root's width itself does not change.
- Repeated construction for the same tabs root returns the existing accordion
  instance; options from later calls are ignored.
- When the responsive presentation changes, focus moves between equivalent tab
  and disclosure controls only if the disappearing control owns focus.
- The active disclosure has `aria-expanded="true"` and remains focusable with
  `aria-disabled="true"` because one panel must stay open.
- `destroy()` removes generated buttons and listeners, restores the tablist and
  the root's original `data-a11y-tabs-presentation` value, and allows clean
  reinitialization.
- For no-JavaScript access, author panel content without `hidden`; core tabs
  initialization applies the single-selection hidden state.
- This is a responsive presentation adapter, not a multi-open standalone
  accordion pattern.

### Overflow menu keyboard behavior

The overflow add-on keeps the original tablist available and adds an optional
menu, select, or jump-list control when the tablist does not fit.

- `Enter` or `Space` uses the generated menu button's native button behavior.
- `ArrowDown` opens the menu and focuses its first enabled item.
- `ArrowUp` opens the menu and focuses its last enabled item.
- Within the menu, `ArrowUp`, `ArrowDown`, `Home`, and `End` move focus among
  enabled items.
- `Escape` closes the menu and restores focus to its button.
- Clicking outside closes the menu without moving focus away from the clicked
  control.

### Data handling and remote content

- The core, badges, shortcuts, validation, stepper, tour, accordion, and
  unsaved-guard add-ons do not persist form values or UI state.
- The analytics add-on performs no network request. It only forwards normalized
  tab identifiers and labels to a consumer-provided callback.
- The history add-on stores the selected tab or panel identifier in browser
  history, the URL hash, or a configured query parameter. URL values are
  shareable and may appear in browser history or server logs, so do not use
  sensitive values as tab or panel identifiers.
- The loader add-on is the only built-in network client. It requests only the
  URL explicitly supplied in a panel attribute or configuration. Remote HTML
  is rejected by default unless the consumer supplies `sanitize`,
  `renderContent`, or explicitly enables `allowUnsafeHtml`; use
  `contentType: "text"` for plain text.
- Destroying the loader aborts pending requests. Reloading a panel aborts its
  older request so an out-of-order response cannot replace newer content.

## Accessibility Notes

- Adds `role="tablist"`, `role="tab"`, and `role="tabpanel"` only after
  JavaScript initializes.
- Maintains `aria-selected`, `aria-controls`, `aria-labelledby`, and roving
  `tabindex`.
- Uses real `button` elements for the expected tab controls.
- Supports ArrowLeft, ArrowRight, Home, End, Enter, and Space for horizontal
  tablists.
- Supports ArrowUp, ArrowDown, Home, End, Enter, and Space for vertical
  tablists.
- Skips disabled buttons during keyboard navigation.
- Restores original roles, ARIA attributes, generated ids, hidden state, classes,
  and event listeners on `destroy()`.
- The bundled CSS preserves visible focus and respects `prefers-reduced-motion`.
- The plugin does not add live announcements because the tab, tabpanel, focus,
  and selected states expose the change through the tabs pattern.

## Limitations

- The runtime expects one tablist per root and one panel per tab. It does not
  implement multi-select disclosure behavior.
- The core snapshots tabs and panels during initialization. After adding,
  removing, or reordering tab markup, destroy and reinitialize the core and its
  instance-bound add-ons.
- The accordion add-on retains the underlying tabs model. It does not generate
  a configurable accordion heading structure or allow all panels to collapse.
- `useHash` activates from the current hash and updates it with
  `history.replaceState()`. Use `A11yTabsHistory` when each tab activation
  should create a Back/Forward history entry.
- The package currently exports the core stylesheet as
  `a11y-tabs-widget/styles.css`. Source theme files under `src/themes/` are
  not package export entry points.
- Still test the final integration with your target browsers, keyboard flows,
  zoom settings, and assistive technologies.

## Examples

Build-based HTML examples import from `../../dist/index.js`,
`../../dist/styles.css`, and optional add-on modules in `../../dist/addons`.

- [`examples/basic`](examples/basic): Basic tabs markup initialized from the built package.
- [`examples/addon-accordion`](examples/addon-accordion): Container-aware FAQ tabs mirrored into accordion controls when labels wrap or overflow.
- [`examples/addon-analytics`](examples/addon-analytics): Tab change data forwarded to a local event log.
- [`examples/addon-autoinit`](examples/addon-autoinit): Explicit document-ready initialization and scoped requests for routed fragments.
- [`examples/addon-badges`](examples/addon-badges): Status and count badges with deliberate accessible labels.
- [`examples/addon-history`](examples/addon-history): Hash-based tab history with Back and Forward restoration.
- [`examples/addon-loader`](examples/addon-loader): Lazy-loaded panels with loading, error, retry, and cached states.
- [`examples/addon-overflow-menu`](examples/addon-overflow-menu): Compact generated jump menu for overflowing tablists.
- [`examples/addon-shortcuts`](examples/addon-shortcuts): Optional direct keyboard shortcuts for activating tabs.
- [`examples/addon-stepper`](examples/addon-stepper): External progress text and Previous/Next controls synced to tabs.
- [`examples/addon-tour`](examples/addon-tour): Guided tour controls that activate tab panels in sequence.
- [`examples/addon-unsaved-guard`](examples/addon-unsaved-guard): Dirty form tracking that cancels tab changes until confirmation.
- [`examples/addon-validation`](examples/addon-validation): Invalid form fields summarized with tab badges and focus routing.
