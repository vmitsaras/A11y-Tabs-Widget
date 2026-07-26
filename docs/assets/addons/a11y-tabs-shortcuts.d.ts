import { i as TabsInstance } from "../index-B5ll15sm.js";
import { TabsTarget } from "./shared.js";
//#region src/addons/a11y-tabs-shortcuts.d.ts
type ShortcutScope = "root" | "document";
type ShortcutTarget = number | string | ((context: ShortcutContext) => number | boolean);
type ShortcutInput = string | ShortcutDefinition;
type ShortcutMap = Record<string, ShortcutTarget>;
type ShortcutsOption = ReadonlyArray<ShortcutInput> | ShortcutMap | false | null;
interface ShortcutDefinition {
  combo?: string;
  shortcut?: string;
  keys?: string;
  key?: string;
  target?: ShortcutTarget;
  index?: ShortcutTarget;
  panelId?: string;
  tabId?: string;
}
interface ParsedShortcut {
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  key: string;
}
interface NormalizedShortcut extends ParsedShortcut {
  target: ShortcutTarget;
  targetTab: HTMLElement | null;
}
type ShortcutUnavailableReason = "missing" | "disabled" | "hidden" | "disconnected" | "missing-panel";
interface A11yTabsShortcutsOptions {
  shortcuts?: ShortcutsOption;
  scope?: ShortcutScope;
  preventDefault?: boolean;
  ignoreEditable?: boolean;
}
interface ShortcutContext {
  event: KeyboardEvent;
  tabs: TabsInstance;
  root: HTMLElement;
  shortcut: NormalizedShortcut;
}
interface ShortcutUnavailableDetail {
  tabs: TabsInstance;
  root: HTMLElement;
  shortcut: NormalizedShortcut;
  tab: HTMLElement | null;
  reason: ShortcutUnavailableReason;
}
/**
 * Optional add-on that activates tabs through configurable direct shortcuts.
 *
 * Listeners are scoped to the tab root by default. Set scope: "document" only
 * when your application intentionally owns those global key bindings. The
 * default Alt+1 through Alt+9 bindings can be replaced or disabled with
 * shortcuts: false to avoid conflicts with browser, operating-system, or
 * assistive-technology shortcuts.
 */
declare class A11yTabsShortcuts {
  private readonly tabs;
  private readonly root;
  private readonly options;
  private readonly listenerTarget;
  private destroyed;
  private shortcuts;
  private readonly handleKeydown;
  private readonly handleDestroy;
  constructor(target: TabsTarget, options?: A11yTabsShortcutsOptions);
  /** Replace shortcut definitions. Pass false, null, or [] to disable them. */
  setShortcuts(shortcuts: ShortcutsOption): void;
  /** Remove shortcut and destroy listeners. */
  destroy(): void;
  private onKeydown;
  private normalizeShortcuts;
  private normalizeShortcut;
  private parseCombo;
  private matches;
  private runShortcut;
  private activateTab;
  private shouldMoveFocus;
  private resolveTab;
  private getUnavailableReason;
  private dispatchUnavailable;
  private isEditableTarget;
  private normalizeKeyName;
  private getTabs;
}
//#endregion
export { A11yTabsShortcuts, A11yTabsShortcuts as default, A11yTabsShortcutsOptions, ShortcutContext, ShortcutUnavailableDetail, ShortcutUnavailableReason };
//# sourceMappingURL=a11y-tabs-shortcuts.d.ts.map