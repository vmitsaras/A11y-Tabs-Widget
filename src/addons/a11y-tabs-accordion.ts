import {
  getPanels,
  getTabs,
  getTabsList,
  isDisabledElement,
  resolveRoot,
  resolveTabs,
  type TabsTarget
} from "./shared.js";
import type { TabsInstance } from "../index.js";

export interface AccordionButtonContext {
  tab: HTMLElement;
  panel: HTMLElement;
  index: number;
  tabs: HTMLElement[];
  panels: HTMLElement[];
}

export interface A11yTabsAccordionOptions {
  mediaQuery?: string | false;
  collapseOnWrap?: boolean;
  buttonClass?: string;
  buttonText?: ((context: AccordionButtonContext) => string | Node) | null;
}

interface NormalizedAccordionOptions {
  mediaQuery: string | false;
  collapseOnWrap: boolean;
  buttonClass: string;
  buttonText: ((context: AccordionButtonContext) => string | Node) | null;
}

interface AccordionButtonEntry {
  button: HTMLButtonElement;
  tab: HTMLElement;
  panel: HTMLElement;
}

const DEFAULT_OPTIONS = Object.freeze({
  mediaQuery: "(max-width: 40rem)",
  collapseOnWrap: true,
  buttonClass: "a11y-tabs__accordion-button",
  buttonText: null
} satisfies NormalizedAccordionOptions);

/**
 * Optional responsive add-on that presents A11yTabs panels as accordion toggles
 * when a media query matches or the visible tablist would wrap or overflow.
 *
 * This is intentionally a presentation adapter, not a full ARIA accordion
 * implementation. It keeps the underlying A11yTabs single-selection state and
 * mirrors that state to disclosure-style buttons with aria-expanded.
 */
class A11yTabsAccordion {
  private static readonly instances = new WeakMap<HTMLElement, A11yTabsAccordion>();

  private readonly tabs: TabsInstance;
  private readonly root: HTMLElement;
  private readonly options!: NormalizedAccordionOptions;
  private readonly mediaQuery!: MediaQueryList | null;
  private buttons: AccordionButtonEntry[] = [];
  private isAccordion = false;
  private destroyed = false;
  private resizeObserver: ResizeObserver | null = null;
  private observesWindowResize = false;
  private isMeasuring = false;
  private lastObservedWidth: number | null = null;
  private readonly listWasHidden!: boolean;
  private readonly originalPresentation!: string | null;

  private readonly handleMediaChange = this.onMediaChange.bind(this);
  private readonly handleChange = this.syncState.bind(this);
  private readonly handleClick = this.onClick.bind(this);
  private readonly handleTabsDestroy = this.onTabsDestroy.bind(this);
  private readonly handleResizeObserver: ResizeObserverCallback = (entries) => {
    this.onResize(entries);
  };
  private readonly handleWindowResize = (): void => {
    this.onResize();
  };

  constructor(target: TabsTarget, options: A11yTabsAccordionOptions = {}) {
    this.tabs = resolveTabs(target, "A11yTabsAccordion");
    this.root = resolveRoot(target, this.tabs, "A11yTabsAccordion");

    const existing = A11yTabsAccordion.instances.get(this.root);
    if (existing && !existing.destroyed) {
      return existing;
    }

    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (
      this.options.mediaQuery !== false &&
      typeof window.matchMedia !== "function"
    ) {
      throw new TypeError(
        "A11yTabsAccordion: window.matchMedia is required unless options.mediaQuery is false."
      );
    }

    this.mediaQuery =
      this.options.mediaQuery === false
        ? null
        : window.matchMedia(this.options.mediaQuery);
    this.listWasHidden = this.getList()?.hidden === true;
    this.originalPresentation = this.root.getAttribute(
      "data-a11y-tabs-presentation"
    );

    this.createButtons();

    this.root.addEventListener("a11y-tabs:change", this.handleChange);
    this.root.addEventListener("a11y-tabs:destroy", this.handleTabsDestroy);

    if (this.mediaQuery) {
      if (typeof this.mediaQuery.addEventListener === "function") {
        this.mediaQuery.addEventListener("change", this.handleMediaChange);
      } else {
        this.mediaQuery.addListener(this.handleMediaChange);
      }
    }

    A11yTabsAccordion.instances.set(this.root, this);
    this.startObserving();
    this.update();
  }

  /** Re-evaluate the responsive presentation and synchronise its active state. */
  update(): void {
    if (this.destroyed) return;

    const mediaQueryMatches = this.mediaQuery?.matches === true;
    const tabListIsConstrained =
      this.options.collapseOnWrap && this.isTabListConstrained();

    this.setMode(mediaQueryMatches || tabListIsConstrained);
  }

  private syncState(): void {
    const activeTab = this.tabs.getActiveTab();
    const activePanel = this.tabs.getActivePanel();

    this.buttons.forEach(({ button, tab, panel }) => {
      const isActive = tab === activeTab && panel === activePanel;
      const isDisabled = isDisabledElement(tab);
      const isRequiredOpen = this.isAccordion && isActive;

      button.disabled = isDisabled;
      button.setAttribute(
        "aria-disabled",
        isDisabled || isRequiredOpen ? "true" : "false"
      );
      button.setAttribute("aria-expanded", isActive ? "true" : "false");

      if (this.isAccordion) {
        button.hidden = false;
        panel.hidden = !isActive;
      }
    });
  }

  /** Remove generated buttons, listeners, and responsive presentation state. */
  destroy(): void {
    this.teardown();
  }

  private teardown(): void {
    if (this.destroyed) return;

    this.root.removeEventListener("a11y-tabs:change", this.handleChange);
    this.root.removeEventListener("a11y-tabs:destroy", this.handleTabsDestroy);

    if (this.mediaQuery) {
      if (typeof this.mediaQuery.removeEventListener === "function") {
        this.mediaQuery.removeEventListener("change", this.handleMediaChange);
      } else {
        this.mediaQuery.removeListener(this.handleMediaChange);
      }
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.observesWindowResize) {
      window.removeEventListener("resize", this.handleWindowResize);
      this.observesWindowResize = false;
    }

    this.setMode(false);
    this.restorePresentation();

    this.buttons.forEach(({ button }) => {
      button.removeEventListener("click", this.handleClick);
      button.remove();
    });
    this.buttons = [];
    A11yTabsAccordion.instances.delete(this.root);
    this.destroyed = true;
  }

  private onMediaChange(): void {
    this.update();
  }

  private onResize(entries?: ResizeObserverEntry[]): void {
    if (this.destroyed || this.isMeasuring) return;

    const rootEntry = entries?.find((entry) => entry.target === this.root);
    const width = rootEntry?.contentRect.width;

    if (typeof width === "number") {
      if (
        this.lastObservedWidth !== null &&
        Math.abs(width - this.lastObservedWidth) <= 0.5
      ) {
        return;
      }
      this.lastObservedWidth = width;
    }

    this.update();
  }

  private onTabsDestroy(): void {
    this.teardown();
  }

  private setMode(isAccordion: boolean): void {
    const nextIsAccordion = Boolean(isAccordion);
    const focusedIndex = this.getFocusedControlIndex(nextIsAccordion);

    this.isAccordion = nextIsAccordion;
    const list = this.getList();

    if (list) {
      list.hidden = this.isAccordion || this.listWasHidden;
    }

    this.root.dataset.a11yTabsPresentation = this.isAccordion
      ? "accordion"
      : "tabs";

    this.buttons.forEach(({ button }) => {
      button.hidden = !this.isAccordion;
    });

    this.syncState();
    this.restoreEquivalentFocus(focusedIndex);
  }

  private startObserving(): void {
    if (!this.options.collapseOnWrap) return;

    if (typeof ResizeObserver === "function") {
      this.resizeObserver = new ResizeObserver(this.handleResizeObserver);
      this.resizeObserver.observe(this.root);
      return;
    }

    window.addEventListener("resize", this.handleWindowResize);
    this.observesWindowResize = true;
  }

  private isTabListConstrained(): boolean {
    const list = this.getList();
    if (!list || this.listWasHidden) return false;

    const wasHidden = list.hidden;
    const originalStyle = list.getAttribute("style");
    const originalAriaHidden = list.getAttribute("aria-hidden");
    const hadInert = list.hasAttribute("inert");
    const originalInert = list.getAttribute("inert");

    this.isMeasuring = true;

    try {
      if (wasHidden) {
        list.hidden = false;
        list.setAttribute("aria-hidden", "true");
        list.setAttribute("inert", "");
        list.style.visibility = "hidden";
        list.style.pointerEvents = "none";
      }

      const tabs = this.getTabs();
      const firstTop = tabs[0]?.getBoundingClientRect().top;
      const hasWrappedRows =
        typeof firstTop === "number" &&
        tabs.slice(1).some(
          (tab) => Math.abs(tab.getBoundingClientRect().top - firstTop) > 1
        );
      const hasHorizontalOverflow = list.scrollWidth > list.clientWidth + 1;

      return hasWrappedRows || hasHorizontalOverflow;
    } finally {
      if (wasHidden) {
        list.hidden = true;
        this.restoreAttribute(list, "aria-hidden", originalAriaHidden);

        if (hadInert) {
          list.setAttribute("inert", originalInert ?? "");
        } else {
          list.removeAttribute("inert");
        }

        if (originalStyle === null) {
          list.removeAttribute("style");
        } else {
          list.setAttribute("style", originalStyle);
        }
      }

      this.isMeasuring = false;
    }
  }

  private restoreAttribute(
    element: HTMLElement,
    name: string,
    value: string | null
  ): void {
    if (value === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  }

  private onClick(event: MouseEvent): void {
    if (!(event.currentTarget instanceof HTMLButtonElement)) return;
    const button = event.currentTarget;
    const index = this.buttons.findIndex((entry) => entry.button === button);

    if (
      index === -1 ||
      button.disabled ||
      button.getAttribute("aria-disabled") === "true"
    ) {
      return;
    }

    // A11yTabs is a single-selection tabs controller, so activating an already
    // open accordion item intentionally leaves it open rather than collapsing
    // to a no-panel-open state.
    this.tabs.activate(index);
  }

  private createButtons(): void {
    const tabs = this.getTabs();
    const panels = this.getPanels(tabs);

    this.buttons = panels.map((panel, index) => {
      const tab = tabs[index];
      const button = document.createElement("button");
      button.type = "button";
      button.className = this.options.buttonClass;
      button.hidden = true;
      button.setAttribute("aria-controls", panel.id);
      button.setAttribute("aria-expanded", "false");

      const label = this.getButtonText({ tab, panel, index, tabs, panels });
      if (label instanceof Node) {
        button.append(label);
      } else {
        button.textContent = String(label);
      }

      button.addEventListener("click", this.handleClick);
      panel.insertAdjacentElement("beforebegin", button);

      return { button, tab, panel };
    });
  }

  private getFocusedControlIndex(nextIsAccordion: boolean): number {
    if (nextIsAccordion === this.isAccordion) return -1;

    const activeElement = document.activeElement;
    return this.buttons.findIndex(({ button, tab }) =>
      nextIsAccordion ? activeElement === tab : activeElement === button
    );
  }

  private restoreEquivalentFocus(index: number): void {
    if (index < 0) return;

    const entry = this.buttons[index];
    const replacement = this.isAccordion ? entry?.button : entry?.tab;

    if (
      !replacement ||
      replacement.hidden ||
      replacement.closest("[hidden]") ||
      isDisabledElement(replacement)
    ) {
      return;
    }

    replacement.focus();
  }

  private restorePresentation(): void {
    if (this.originalPresentation === null) {
      this.root.removeAttribute("data-a11y-tabs-presentation");
      return;
    }

    this.root.setAttribute(
      "data-a11y-tabs-presentation",
      this.originalPresentation
    );
  }

  private getButtonText(context: AccordionButtonContext): string | Node {
    if (typeof this.options.buttonText === "function") {
      return this.options.buttonText(context);
    }

    return context.tab.textContent?.trim() ?? "";
  }

  private getList(): HTMLElement | null {
    return getTabsList(this.root);
  }

  private getTabs(): HTMLElement[] {
    return getTabs(this.root);
  }

  private getPanels(tabs: HTMLElement[]): HTMLElement[] {
    const allPanels = getPanels(this.root);

    return tabs
      .map((tab) => {
        const panelId = tab.getAttribute("aria-controls");
        return allPanels.find((panel) => panel.id === panelId) ?? null;
      })
      .filter((panel): panel is HTMLElement => panel !== null);
  }
}

export default A11yTabsAccordion;
export { A11yTabsAccordion };
