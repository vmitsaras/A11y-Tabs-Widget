import {
  getTabs,
  getTabsList,
  isDisabledElement,
  resolveRoot,
  resolveTabs,
  type TabsTarget
} from "./shared.js";
import type { TabsInstance } from "../index.js";

type OverflowControl = "menu" | "select" | "jump-list" | false | null;
type OverflowItem = HTMLButtonElement | HTMLOptionElement;

export interface A11yTabsOverflowMenuOptions {
  control?: OverflowControl;
  className?: string;
  label?: string;
  menuButtonText?: string;
  observeInterval?: number;
}

interface NormalizedOverflowMenuOptions {
  control: OverflowControl;
  className: string;
  label: string;
  menuButtonText: string;
  observeInterval: number;
}

const DEFAULT_OPTIONS = Object.freeze({
  control: "menu",
  className: "a11y-tabs__overflow",
  label: "More tabs",
  menuButtonText: "More",
  observeInterval: 250
} satisfies NormalizedOverflowMenuOptions);

const VALID_CONTROLS = new Set<OverflowControl>([
  "menu",
  "select",
  "jump-list",
  false,
  null
]);

/**
 * Optional add-on that detects tablist overflow and mirrors the tabs into an
 * auxiliary control for narrow containers.
 *
 * The original tablist is never hidden or replaced. Keyboard users can keep
 * using the normal tablist arrow-key behavior, while the generated menu,
 * select, or jump list provides a compact direct-jump alternative when the
 * tablist overflows. The control is hidden when all tabs fit.
 */
class A11yTabsOverflowMenu {
  private readonly tabs: TabsInstance;
  private readonly root: HTMLElement;
  private readonly options: NormalizedOverflowMenuOptions;
  private readonly list: HTMLElement;
  private items: OverflowItem[] = [];
  private control: HTMLElement | null = null;
  private destroyed = false;
  private isOverflowing = false;
  private resizeObserver: ResizeObserver | null = null;
  private fallbackTimer: number | null = null;
  private readonly originalRootOverflow: string | null;

  private readonly handleChange = this.update.bind(this);
  private readonly handleClick: EventListener = (event) => {
    this.onClick(event);
  };
  private readonly handleSelectChange = this.onSelectChange.bind(this);
  private readonly handleDocumentClick = this.onDocumentClick.bind(this);
  private readonly handleKeydown = this.onKeydown.bind(this);
  private readonly handleResize = this.refresh.bind(this);
  private readonly handleDestroy = this.destroy.bind(this);
  private readonly handleMenuButtonClick = this.onMenuButtonClick.bind(this);
  private readonly handleMenuButtonKeydown =
    this.onMenuButtonKeydown.bind(this);

  constructor(target: TabsTarget, options: A11yTabsOverflowMenuOptions = {}) {
    this.tabs = resolveTabs(target, "A11yTabsOverflowMenu");
    this.root = resolveRoot(target, this.tabs, "A11yTabsOverflowMenu");
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (!VALID_CONTROLS.has(this.options.control)) {
      throw new TypeError(
        "A11yTabsOverflowMenu: options.control must be 'menu', 'select', 'jump-list', false, or null."
      );
    }

    const list = this.getList();
    if (!list) {
      throw new TypeError(
        "A11yTabsOverflowMenu: no tab list element found."
      );
    }
    this.list = list;
    this.originalRootOverflow = this.root.getAttribute(
      "data-a11y-tabs-overflow"
    );

    this.createControl();
    this.startObserving();

    this.root.addEventListener("a11y-tabs:change", this.handleChange);
    this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);

    this.refresh();
    this.update();
  }

  /** Re-read the tablist dimensions and show/hide the auxiliary control. */
  refresh(): void {
    if (this.destroyed) return;

    const isOverflowing = this.detectOverflow();
    this.isOverflowing = isOverflowing;
    this.root.dataset.a11yTabsOverflow = isOverflowing ? "true" : "false";

    if (this.control) {
      this.control.hidden = !isOverflowing;
    }
  }

  /** Synchronise generated control options with selected and disabled tabs. */
  update(): void {
    if (this.destroyed) return;

    const tabs = this.getTabs();
    const activeTab = this.tabs.getActiveTab();
    const activeIndex = activeTab ? tabs.indexOf(activeTab) : -1;

    if (this.options.control === "select") {
      this.syncSelect(tabs, activeIndex);
    } else if (
      this.options.control === "menu" ||
      this.options.control === "jump-list"
    ) {
      this.syncButtons(tabs, activeIndex);
    }

    this.refresh();
  }

  /** Remove generated controls and resize/change listeners. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.root.removeEventListener("a11y-tabs:change", this.handleChange);
    this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
    document.removeEventListener("click", this.handleDocumentClick);
    document.removeEventListener("keydown", this.handleKeydown);
    window.removeEventListener("resize", this.handleResize);

    this.items.forEach((item) => {
      item.removeEventListener("click", this.handleClick);
    });

    this.control
      ?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')
      ?.removeEventListener("click", this.handleMenuButtonClick);
    this.control
      ?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')
      ?.removeEventListener("keydown", this.handleMenuButtonKeydown);
    this.control
      ?.querySelector<HTMLSelectElement>("select")
      ?.removeEventListener("change", this.handleSelectChange);

    this.resizeObserver?.disconnect();

    if (this.fallbackTimer !== null) {
      window.clearInterval(this.fallbackTimer);
    }

    this.control?.remove();
    this.control = null;
    this.items = [];
    this.restoreOverflowState();
  }

  private createControl(): void {
    if (!this.options.control) return;

    if (this.options.control === "select") {
      this.createSelect();
    } else if (this.options.control === "jump-list") {
      this.createJumpList();
    } else {
      this.createMenu();
    }

    if (this.control) {
      this.list.insertAdjacentElement("afterend", this.control);
    }
  }

  private createMenu(): void {
    const wrapper = document.createElement("div");
    wrapper.className = `${this.options.className} ${this.options.className}--menu`;
    wrapper.hidden = true;

    const button = document.createElement("button");
    button.type = "button";
    button.className = `${this.options.className}-button`;
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.textContent = this.options.menuButtonText;
    button.addEventListener("click", this.handleMenuButtonClick);
    button.addEventListener("keydown", this.handleMenuButtonKeydown);

    const menu = document.createElement("div");
    menu.className = `${this.options.className}-panel`;
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", this.options.label);
    menu.hidden = true;

    this.getTabs().forEach((tab, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `${this.options.className}-item`;
      item.setAttribute("role", "menuitemradio");
      item.dataset.a11yTabsOverflowIndex = String(index);
      item.textContent = tab.textContent?.trim() || `Tab ${index + 1}`;
      item.addEventListener("click", this.handleClick);
      menu.append(item);
      this.items.push(item);
    });

    wrapper.append(button, menu);
    this.control = wrapper;
  }

  private createSelect(): void {
    const label = document.createElement("label");
    label.className = `${this.options.className} ${this.options.className}--select`;
    label.hidden = true;

    const labelText = document.createElement("span");
    labelText.className = `${this.options.className}-label`;
    labelText.textContent = this.options.label;

    const select = document.createElement("select");
    select.className = `${this.options.className}-select`;
    select.addEventListener("change", this.handleSelectChange);

    this.getTabs().forEach((tab, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = tab.textContent?.trim() || `Tab ${index + 1}`;
      select.append(option);
      this.items.push(option);
    });

    label.append(labelText, select);
    this.control = label;
  }

  private createJumpList(): void {
    const nav = document.createElement("nav");
    nav.className = `${this.options.className} ${this.options.className}--jump-list`;
    nav.setAttribute("aria-label", this.options.label);
    nav.hidden = true;

    this.getTabs().forEach((tab, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `${this.options.className}-item`;
      button.dataset.a11yTabsOverflowIndex = String(index);
      button.textContent = tab.textContent?.trim() || `Tab ${index + 1}`;
      button.addEventListener("click", this.handleClick);
      nav.append(button);
      this.items.push(button);
    });

    this.control = nav;
  }

  private startObserving(): void {
    if (typeof ResizeObserver === "function") {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.list);
      this.resizeObserver.observe(this.root);
      return;
    }

    window.addEventListener("resize", this.handleResize);
    this.fallbackTimer = window.setInterval(
      this.handleResize,
      Math.max(100, Number(this.options.observeInterval) || DEFAULT_OPTIONS.observeInterval)
    );
  }

  private detectOverflow(): boolean {
    return (
      this.list.scrollWidth > this.list.clientWidth + 1 ||
      this.list.scrollHeight > this.list.clientHeight + 1
    );
  }

  private onClick(event: Event): void {
    if (!(event.currentTarget instanceof HTMLElement)) return;

    const index = Number(event.currentTarget.dataset.a11yTabsOverflowIndex);
    if (this.tabs.activate(index)) {
      this.setMenuOpen(false);
      this.getTabs()[index]?.focus();
    }
  }

  private onSelectChange(event: Event): void {
    if (!(event.currentTarget instanceof HTMLSelectElement)) return;
    this.tabs.activate(Number(event.currentTarget.value));
  }

  private syncSelect(tabs: HTMLElement[], activeIndex: number): void {
    const select = this.control?.querySelector<HTMLSelectElement>("select");
    if (!select) return;

    Array.from(select.options).forEach((option, index) => {
      option.disabled = isDisabledElement(tabs[index]);
    });

    if (activeIndex >= 0) {
      select.value = String(activeIndex);
    }
  }

  private syncButtons(tabs: HTMLElement[], activeIndex: number): void {
    this.items.forEach((item, index) => {
      const isActive = index === activeIndex;
      const isDisabled = isDisabledElement(tabs[index]);

      item.disabled = isDisabled;
      item.setAttribute("aria-disabled", isDisabled ? "true" : "false");
      item.setAttribute("aria-current", isActive ? "page" : "false");

      if (this.options.control === "menu") {
        item.setAttribute("aria-checked", isActive ? "true" : "false");
      }
    });
  }

  private onMenuButtonClick(): void {
    const menu = this.control?.querySelector<HTMLElement>('[role="menu"]');
    if (!menu) return;
    this.setMenuOpen(menu.hidden === true);
  }

  private onMenuButtonKeydown(event: KeyboardEvent): void {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    event.stopPropagation();
    this.setMenuOpen(true, false);

    const enabledItems = this.getEnabledMenuItems();
    const target =
      event.key === "ArrowUp"
        ? enabledItems[enabledItems.length - 1]
        : enabledItems[0];
    target?.focus();
  }

  private setMenuOpen(isOpen: boolean, restoreFocus = true): void {
    if (this.options.control !== "menu" || !this.control) return;

    const button = this.control.querySelector<HTMLButtonElement>(
      'button[aria-haspopup="menu"]'
    );
    const menu = this.control.querySelector<HTMLElement>('[role="menu"]');
    if (!button || !menu) return;

    button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    menu.hidden = !isOpen;

    document.removeEventListener("click", this.handleDocumentClick);
    document.removeEventListener("keydown", this.handleKeydown);

    if (isOpen) {
      document.addEventListener("click", this.handleDocumentClick);
      document.addEventListener("keydown", this.handleKeydown);
      this.items.find((item) => !item.disabled)?.focus();
    } else if (restoreFocus) {
      button.focus();
    }
  }

  private onDocumentClick(event: MouseEvent): void {
    if (
      this.control &&
      event.target instanceof Node &&
      !this.control.contains(event.target)
    ) {
      this.setMenuOpen(false, false);
    }
  }

  private onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      if (!this.isMenuOpen()) return;
      this.setMenuOpen(false);
      event.preventDefault();
      return;
    }

    if (!this.isMenuOpen()) return;

    const enabledItems = this.getEnabledMenuItems();
    const currentIndex = enabledItems.findIndex(
      (item) => item === document.activeElement
    );
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % enabledItems.length;
    } else if (event.key === "ArrowUp") {
      nextIndex =
        (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = enabledItems.length - 1;
    } else if (event.key === "Tab") {
      this.setMenuOpen(false);
      return;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      enabledItems[nextIndex]?.focus();
    }
  }

  private isMenuOpen(): boolean {
    const menu = this.control?.querySelector<HTMLElement>('[role="menu"]');
    return menu?.hidden === false;
  }

  private getEnabledMenuItems(): HTMLButtonElement[] {
    return this.items.filter(
      (item): item is HTMLButtonElement =>
        item instanceof HTMLButtonElement && !item.disabled
    );
  }

  private getList(): HTMLElement | null {
    return getTabsList(this.root);
  }

  private getTabs(): HTMLElement[] {
    return getTabs(this.root);
  }

  private restoreOverflowState(): void {
    if (this.originalRootOverflow === null) {
      delete this.root.dataset.a11yTabsOverflow;
    } else {
      this.root.dataset.a11yTabsOverflow = this.originalRootOverflow;
    }
  }
}

export default A11yTabsOverflowMenu;
export { A11yTabsOverflowMenu };
