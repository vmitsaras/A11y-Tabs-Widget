import { A11yTabs, type TabsInstance } from "../index.js";

export type TabsTarget = TabsInstance | HTMLElement;

export interface TabsChangeDetail {
  instance?: TabsInstance;
  tab?: HTMLElement | null;
  panel?: HTMLElement | null;
  index?: number;
  previousIndex?: number;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isTabsInstance(value: unknown): value is TabsInstance {
  return (
    isRecord(value) &&
    typeof value.getActiveTab === "function" &&
    typeof value.getActivePanel === "function" &&
    typeof value.activate === "function"
  );
}

export function resolveTabs(target: TabsTarget, label: string): TabsInstance {
  if (isTabsInstance(target)) {
    return target;
  }

  if (target instanceof HTMLElement) {
    return new A11yTabs(target);
  }

  throw new TypeError(`${label}: target must be an A11yTabs instance or HTMLElement.`);
}

export function resolveRoot(
  target: TabsTarget,
  tabs: TabsInstance,
  label: string
): HTMLElement {
  if (target instanceof HTMLElement) {
    return target;
  }

  const activeTab = tabs.getActiveTab();
  const activePanel = tabs.getActivePanel();
  const root =
    activeTab?.closest<HTMLElement>("[data-a11y-tabs], .a11y-tabs") ??
    activePanel?.closest<HTMLElement>("[data-a11y-tabs], .a11y-tabs") ??
    null;

  if (!root) {
    throw new TypeError(`${label}: unable to find the tabs root element.`);
  }

  return root;
}

export function getTabsList(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    "[data-a11y-tabs-list], [data-tabs-list]"
  );
}

export function getTabs(root: HTMLElement): HTMLElement[] {
  const list = getTabsList(root);
  if (!list) return [];

  return Array.from(
    list.querySelectorAll<HTMLElement>(
      '[role="tab"], [data-a11y-tabs-tab], [data-tab-target]'
    )
  ).filter((tab) => tab.closest("[data-a11y-tabs-list], [data-tabs-list]") === list);
}

export function getPanels(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>("[data-a11y-tabs-panel], [data-tab-panel]")
  ).filter(
    (panel) =>
      panel.closest("[data-a11y-tabs], .a11y-tabs") === root ||
      panel.closest("[data-a11y-tabs], .a11y-tabs") === null
  );
}

export function getTabsEventDetail(event: Event): TabsChangeDetail {
  if (!(event instanceof CustomEvent) || !isRecord(event.detail)) {
    return {};
  }

  const { instance, tab, panel, index, previousIndex } = event.detail;

  return {
    instance: isTabsInstance(instance) ? instance : undefined,
    tab: tab instanceof HTMLElement ? tab : null,
    panel: panel instanceof HTMLElement ? panel : null,
    index: typeof index === "number" ? index : undefined,
    previousIndex:
      typeof previousIndex === "number" ? previousIndex : undefined
  };
}

export function isDisableable(
  element: HTMLElement
): element is HTMLElement & { disabled: boolean } {
  return "disabled" in element;
}

export function isDisabledElement(
  element: HTMLElement | null | undefined
): boolean {
  return Boolean(
    element &&
      ((isDisableable(element) && element.disabled) ||
        element.getAttribute("aria-disabled") === "true")
  );
}

export function resolveElement<T extends HTMLElement = HTMLElement>(
  elementOrSelector: HTMLElement | string | false | null | undefined,
  scope: ParentNode
): T | null {
  if (!elementOrSelector) return null;
  if (elementOrSelector instanceof HTMLElement) return elementOrSelector as T;
  return scope.querySelector<T>(elementOrSelector);
}

export function escapeSelectorValue(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/["\\]/g, "\\$&");
}
