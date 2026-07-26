import {
  initTabsAll,
  type TabsInstance,
  type TabsOptions
} from "../index.js";

export const A11Y_TABS_INIT_REQUEST = "a11y-tabs:request-init";

export type TabsAutoInitScope = Document | DocumentFragment | Element;

export interface TabsAutoInitController {
  /** Initialize tabs within the installed scope or a one-off scoped container. */
  init(scope?: TabsAutoInitScope): TabsInstance[];
  /** Remove auto-init listeners without destroying initialized tabs instances. */
  destroy(): void;
}

const installations = new WeakMap<EventTarget, TabsAutoInitControllerImpl>();

function isAutoInitScope(value: unknown): value is TabsAutoInitScope {
  if (typeof value !== "object" || value === null) return false;

  const scope = value as Partial<TabsAutoInitScope>;
  return (
    typeof scope.querySelectorAll === "function" &&
    typeof scope.addEventListener === "function" &&
    typeof scope.removeEventListener === "function"
  );
}

function getDefaultScope(): Document | null {
  return typeof document === "undefined" ? null : document;
}

function isDocumentScope(scope: TabsAutoInitScope): scope is Document {
  return scope.nodeType === 9 && "readyState" in scope;
}

class TabsAutoInitControllerImpl implements TabsAutoInitController {
  private readonly options: TabsOptions;
  private readonly scope: TabsAutoInitScope | null;
  private destroyed = false;
  private waitingForDomReady = false;

  private readonly handleDomReady = (): void => {
    this.waitingForDomReady = false;
    this.init();
  };

  private readonly handleInitRequest = (event: Event): void => {
    const requestScope = isAutoInitScope(event.target)
      ? event.target
      : this.scope;

    if (requestScope) this.init(requestScope);
  };

  constructor(options: TabsOptions, scope: TabsAutoInitScope | null) {
    this.options = { ...options };
    this.scope = scope;

    if (!scope) return;

    scope.addEventListener(A11Y_TABS_INIT_REQUEST, this.handleInitRequest);

    if (isDocumentScope(scope) && scope.readyState === "loading") {
      this.waitingForDomReady = true;
      scope.addEventListener("DOMContentLoaded", this.handleDomReady, {
        once: true
      });
      return;
    }

    this.init();
  }

  init(
    scope: TabsAutoInitScope | undefined = this.scope ?? undefined
  ): TabsInstance[] {
    if (this.destroyed || !scope) return [];
    return initTabsAll(this.options, scope);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (!this.scope) return;

    this.scope.removeEventListener(
      A11Y_TABS_INIT_REQUEST,
      this.handleInitRequest
    );

    if (this.waitingForDomReady) {
      this.scope.removeEventListener("DOMContentLoaded", this.handleDomReady);
      this.waitingForDomReady = false;
    }

    installations.delete(this.scope);
  }
}

/**
 * Explicitly install document-ready and event-driven tabs initialization.
 *
 * Importing this module has no side effects. The first installation for a scope
 * initializes existing tabs when that scope is ready. Later calls for the same
 * scope reuse the current controller and ignore replacement options.
 */
export function installTabsAutoInit(
  options: TabsOptions = {},
  scope: TabsAutoInitScope | undefined = getDefaultScope() ?? undefined
): TabsAutoInitController {
  if (scope) {
    const existing = installations.get(scope);
    if (existing) return existing;
  }

  const controller = new TabsAutoInitControllerImpl(options, scope ?? null);
  if (scope) installations.set(scope, controller);
  return controller;
}
