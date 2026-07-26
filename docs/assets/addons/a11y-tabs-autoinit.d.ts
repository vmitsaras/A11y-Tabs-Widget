import { a as TabsOptions, i as TabsInstance } from "../index-B5ll15sm.js";
//#region src/addons/a11y-tabs-autoinit.d.ts
declare const A11Y_TABS_INIT_REQUEST = "a11y-tabs:request-init";
type TabsAutoInitScope = Document | DocumentFragment | Element;
interface TabsAutoInitController {
  /** Initialize tabs within the installed scope or a one-off scoped container. */
  init(scope?: TabsAutoInitScope): TabsInstance[];
  /** Remove auto-init listeners without destroying initialized tabs instances. */
  destroy(): void;
}
/**
 * Explicitly install document-ready and event-driven tabs initialization.
 *
 * Importing this module has no side effects. The first installation for a scope
 * initializes existing tabs when that scope is ready. Later calls for the same
 * scope reuse the current controller and ignore replacement options.
 */
declare function installTabsAutoInit(options?: TabsOptions, scope?: TabsAutoInitScope | undefined): TabsAutoInitController;
//#endregion
export { A11Y_TABS_INIT_REQUEST, TabsAutoInitController, TabsAutoInitScope, installTabsAutoInit };
//# sourceMappingURL=a11y-tabs-autoinit.d.ts.map