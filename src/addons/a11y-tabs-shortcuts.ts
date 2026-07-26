import {
  escapeSelectorValue,
  getTabs,
  isDisabledElement,
  resolveRoot,
  resolveTabs,
  type TabsTarget
} from "./shared.js";
import type { TabsInstance } from "../index.js";

type ShortcutScope = "root" | "document";
type ShortcutTarget =
  | number
  | string
  | ((context: ShortcutContext) => number | boolean);
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

export type ShortcutUnavailableReason =
  | "missing"
  | "disabled"
  | "hidden"
  | "disconnected"
  | "missing-panel";

export interface A11yTabsShortcutsOptions {
  shortcuts?: ShortcutsOption;
  scope?: ShortcutScope;
  preventDefault?: boolean;
  ignoreEditable?: boolean;
}

interface NormalizedShortcutsOptions {
  shortcuts: ShortcutsOption;
  scope: ShortcutScope;
  preventDefault: boolean;
  ignoreEditable: boolean;
}

export interface ShortcutContext {
  event: KeyboardEvent;
  tabs: TabsInstance;
  root: HTMLElement;
  shortcut: NormalizedShortcut;
}

export interface ShortcutUnavailableDetail {
  tabs: TabsInstance;
  root: HTMLElement;
  shortcut: NormalizedShortcut;
  tab: HTMLElement | null;
  reason: ShortcutUnavailableReason;
}

interface ShortcutRunResult {
  activated: boolean;
  tab: HTMLElement | null;
  unavailableReason?: ShortcutUnavailableReason;
}

const DEFAULT_SHORTCUTS = Object.freeze([
  "Alt+1",
  "Alt+2",
  "Alt+3",
  "Alt+4",
  "Alt+5",
  "Alt+6",
  "Alt+7",
  "Alt+8",
  "Alt+9"
] satisfies ReadonlyArray<string>);

const DEFAULT_OPTIONS = Object.freeze({
  shortcuts: DEFAULT_SHORTCUTS,
  scope: "root",
  preventDefault: true,
  ignoreEditable: true
} satisfies NormalizedShortcutsOptions);

const VALID_SCOPES = new Set<ShortcutScope>(["root", "document"]);
const UNAVAILABLE_EVENT = "a11y-tabs:shortcut-unavailable";
const MODIFIER_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  cmd: "meta",
  command: "meta",
  control: "ctrl",
  option: "alt",
  return: "enter",
  spacebar: " ",
  space: " ",
  esc: "escape"
});

/**
 * Optional add-on that activates tabs through configurable direct shortcuts.
 *
 * Listeners are scoped to the tab root by default. Set scope: "document" only
 * when your application intentionally owns those global key bindings. The
 * default Alt+1 through Alt+9 bindings can be replaced or disabled with
 * shortcuts: false to avoid conflicts with browser, operating-system, or
 * assistive-technology shortcuts.
 */
class A11yTabsShortcuts {
  private readonly tabs: TabsInstance;
  private readonly root: HTMLElement;
  private readonly options: NormalizedShortcutsOptions;
  private readonly listenerTarget: HTMLElement | Document;
  private destroyed = false;
  private shortcuts: NormalizedShortcut[] = [];
  private readonly handleKeydown: EventListener = (event) => {
    if (event instanceof KeyboardEvent) this.onKeydown(event);
  };
  private readonly handleDestroy = this.destroy.bind(this);

  constructor(target: TabsTarget, options: A11yTabsShortcutsOptions = {}) {
    this.tabs = resolveTabs(target, "A11yTabsShortcuts");
    this.root = resolveRoot(target, this.tabs, "A11yTabsShortcuts");
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (!VALID_SCOPES.has(this.options.scope)) {
      throw new TypeError(
        "A11yTabsShortcuts: options.scope must be 'root' or 'document'."
      );
    }

    this.shortcuts = this.normalizeShortcuts(this.options.shortcuts);
    this.listenerTarget =
      this.options.scope === "document" ? document : this.root;

    if (this.shortcuts.length > 0) {
      this.listenerTarget.addEventListener("keydown", this.handleKeydown);
    }

    this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
  }

  /** Replace shortcut definitions. Pass false, null, or [] to disable them. */
  setShortcuts(shortcuts: ShortcutsOption): void {
    const hadListener = this.shortcuts.length > 0;
    this.shortcuts = this.normalizeShortcuts(shortcuts);

    if (hadListener && this.shortcuts.length === 0) {
      this.listenerTarget.removeEventListener("keydown", this.handleKeydown);
    } else if (!hadListener && this.shortcuts.length > 0 && !this.destroyed) {
      this.listenerTarget.addEventListener("keydown", this.handleKeydown);
    }
  }

  /** Remove shortcut and destroy listeners. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.listenerTarget.removeEventListener("keydown", this.handleKeydown);
    this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
    this.shortcuts = [];
  }

  private onKeydown(event: KeyboardEvent): void {
    if (this.destroyed || event.defaultPrevented) return;
    if (this.options.ignoreEditable && this.isEditableTarget(event.target)) return;

    const shortcut = this.shortcuts.find((entry) => this.matches(event, entry));
    if (!shortcut) return;

    const result = this.runShortcut(shortcut, event);
    if (this.options.preventDefault) {
      event.preventDefault();
    }

    if (result.unavailableReason) {
      this.dispatchUnavailable(shortcut, result.tab, result.unavailableReason);
    }
  }

  private normalizeShortcuts(shortcuts: ShortcutsOption): NormalizedShortcut[] {
    if (!shortcuts) return [];

    if (Array.isArray(shortcuts)) {
      return shortcuts
        .map((shortcut, index) => this.normalizeShortcut(shortcut, index))
        .filter((shortcut): shortcut is NormalizedShortcut => shortcut !== null);
    }

    return Object.entries(shortcuts)
      .map(([combo, target]) => this.normalizeShortcut({ combo, target }))
      .filter((shortcut): shortcut is NormalizedShortcut => shortcut !== null);
  }

  private normalizeShortcut(
    shortcut: ShortcutInput,
    fallbackIndex = 0
  ): NormalizedShortcut | null {
    if (typeof shortcut === "string") {
      return {
        ...this.parseCombo(shortcut),
        target: fallbackIndex,
        targetTab: this.resolveTab(fallbackIndex)
      };
    }

    const combo =
      shortcut.combo ?? shortcut.shortcut ?? shortcut.keys ?? shortcut.key;
    if (typeof combo !== "string") return null;

    const target =
      shortcut.target ??
      shortcut.index ??
      shortcut.panelId ??
      shortcut.tabId ??
      fallbackIndex;

    return {
      ...this.parseCombo(combo),
      target,
      targetTab: typeof target === "function" ? null : this.resolveTab(target)
    };
  }

  private parseCombo(combo: string): ParsedShortcut {
    const parts = combo
      .split("+")
      .map((part) => this.normalizeKeyName(part))
      .filter(Boolean);
    const parsed: ParsedShortcut = {
      alt: false,
      ctrl: false,
      meta: false,
      shift: false,
      key: ""
    };

    parts.forEach((part) => {
      if (part === "alt" || part === "ctrl" || part === "meta" || part === "shift") {
        parsed[part] = true;
      } else {
        parsed.key = part;
      }
    });

    if (!parsed.key) {
      throw new TypeError(
        `A11yTabsShortcuts: shortcut "${combo}" must include a non-modifier key.`
      );
    }

    return parsed;
  }

  private matches(event: KeyboardEvent, shortcut: NormalizedShortcut): boolean {
    return (
      event.altKey === shortcut.alt &&
      event.ctrlKey === shortcut.ctrl &&
      event.metaKey === shortcut.meta &&
      event.shiftKey === shortcut.shift &&
      this.normalizeKeyName(event.key) === shortcut.key
    );
  }

  private runShortcut(
    shortcut: NormalizedShortcut,
    event: KeyboardEvent
  ): ShortcutRunResult {
    const context: ShortcutContext = {
      event,
      tabs: this.tabs,
      root: this.root,
      shortcut
    };

    const target = shortcut.target;

    if (typeof target === "function") {
      const result = target(context);
      if (Number.isInteger(result)) {
        return this.activateTab(
          this.resolveTab(result as number),
          this.shouldMoveFocus(event)
        );
      }

      return { activated: Boolean(result), tab: null };
    }

    return this.activateTab(shortcut.targetTab, this.shouldMoveFocus(event));
  }

  private activateTab(
    tab: HTMLElement | null,
    moveFocus: boolean
  ): ShortcutRunResult {
    const unavailableReason = this.getUnavailableReason(tab);
    if (unavailableReason) {
      return { activated: false, tab, unavailableReason };
    }

    const activated = this.tabs.activate((tab as HTMLElement).id);
    if (activated && moveFocus) tab?.focus();

    return { activated, tab };
  }

  private shouldMoveFocus(event: KeyboardEvent): boolean {
    return event.target instanceof Element && this.root.contains(event.target);
  }

  private resolveTab(target: number | string): HTMLElement | null {
    if (typeof target === "number" && Number.isInteger(target)) {
      return this.getTabs()[target] ?? null;
    }
    if (typeof target !== "string") return null;

    const escaped = escapeSelectorValue(target);
    const tab = this.root.querySelector<HTMLElement>(
      `#${escaped}[role="tab"]`
    );
    if (tab) return tab;

    return this.getTabs().find(
      (currentTab) => currentTab.getAttribute("aria-controls") === target
    ) ?? null;
  }

  private getUnavailableReason(
    tab: HTMLElement | null
  ): ShortcutUnavailableReason | null {
    if (!tab) return "missing";
    if (!tab.isConnected || !this.root.contains(tab)) return "disconnected";
    if (isDisabledElement(tab)) return "disabled";

    const hiddenContainer = tab.closest<HTMLElement>('[hidden], [aria-hidden="true"]');
    if (hiddenContainer && this.root.contains(hiddenContainer)) return "hidden";

    const panelId = tab.getAttribute("aria-controls");
    if (!panelId) return "missing-panel";

    const panel = this.root.querySelector<HTMLElement>(
      `#${escapeSelectorValue(panelId)}`
    );
    if (!panel?.isConnected || !this.root.contains(panel)) return "missing-panel";

    return null;
  }

  private dispatchUnavailable(
    shortcut: NormalizedShortcut,
    tab: HTMLElement | null,
    reason: ShortcutUnavailableReason
  ): void {
    this.root.dispatchEvent(
      new CustomEvent<ShortcutUnavailableDetail>(UNAVAILABLE_EVENT, {
        bubbles: true,
        detail: {
          tabs: this.tabs,
          root: this.root,
          shortcut,
          tab,
          reason
        }
      })
    );
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;

    return Boolean(
      target.closest(
        'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
      )
    );
  }

  private normalizeKeyName(key: string): string {
    const normalized = key.trim().toLowerCase();
    return MODIFIER_ALIASES[normalized] ?? normalized;
  }

  private getTabs(): HTMLElement[] {
    return getTabs(this.root);
  }
}

export default A11yTabsShortcuts;
export { A11yTabsShortcuts };
