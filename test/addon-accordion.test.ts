import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTabs } from "../src/index";
import { A11yTabsAccordion } from "../src/addons/a11y-tabs-accordion";

function renderTabs(): HTMLElement {
  document.body.innerHTML = `
    <main class="demo-page demo-page--accordion">
      <div class="a11y-tabs" data-a11y-tabs>
        <div class="a11y-tabs__list" data-a11y-tabs-list aria-label="Support questions">
          <button class="a11y-tabs__tab" type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="setup">Setup</button>
          <button class="a11y-tabs__tab" type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="billing">Billing</button>
          <button class="a11y-tabs__tab" type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="access">Access</button>
        </div>
        <section class="a11y-tabs__panel" id="setup" data-a11y-tabs-panel>
          <h2>Setup</h2>
        </section>
        <section class="a11y-tabs__panel" id="billing" data-a11y-tabs-panel hidden>
          <h2>Billing</h2>
        </section>
        <section class="a11y-tabs__panel" id="access" data-a11y-tabs-panel hidden>
          <h2>Access</h2>
        </section>
      </div>
    </main>
  `;

  const root = document.querySelector("[data-a11y-tabs]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Test markup did not render a tabs root.");
  }

  return root;
}

function installPageStyles(): void {
  const style = document.createElement("style");
  style.textContent = [
    readFileSync("src/styles.css", "utf8"),
    readFileSync("examples/addon-demo.css", "utf8")
  ].join("\n");
  document.head.append(style);
}

interface MatchMediaController {
  mediaQuery: MediaQueryList;
  setMatches(matches: boolean): void;
}

interface ResizeObserverController {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  trigger(target: Element, width: number): void;
}

function mockResizeObserver(): ResizeObserverController {
  let callback: ResizeObserverCallback | null = null;
  const observe = vi.fn();
  const disconnect = vi.fn();

  class ResizeObserverMock {
    constructor(nextCallback: ResizeObserverCallback) {
      callback = nextCallback;
    }

    observe = observe;
    unobserve = vi.fn();
    disconnect = disconnect;
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);

  return {
    observe,
    disconnect,
    trigger(target: Element, width: number): void {
      const entry = {
        target,
        contentRect: { width }
      } as ResizeObserverEntry;
      callback?.([entry], {} as ResizeObserver);
    }
  };
}

interface TabListLayoutController {
  set(options: { tops?: number[]; clientWidth?: number; scrollWidth?: number }): void;
}

function mockTabListLayout(
  root: HTMLElement,
  initial: { tops?: number[]; clientWidth?: number; scrollWidth?: number } = {}
): TabListLayoutController {
  const list = root.querySelector<HTMLElement>("[data-a11y-tabs-list]");
  const tabs = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-a11y-tabs-tab]")
  );

  if (!list) throw new Error("Test markup did not render a tablist.");

  const state = {
    tops: initial.tops ?? tabs.map(() => 0),
    clientWidth: initial.clientWidth ?? 600,
    scrollWidth: initial.scrollWidth ?? 600
  };

  Object.defineProperty(list, "clientWidth", {
    configurable: true,
    get: () => state.clientWidth
  });
  Object.defineProperty(list, "scrollWidth", {
    configurable: true,
    get: () => state.scrollWidth
  });

  tabs.forEach((tab, index) => {
    vi.spyOn(tab, "getBoundingClientRect").mockImplementation(
      () => ({ top: state.tops[index] ?? 0 }) as DOMRect
    );
  });

  return {
    set(options): void {
      if (options.tops) state.tops = options.tops;
      if (typeof options.clientWidth === "number") {
        state.clientWidth = options.clientWidth;
      }
      if (typeof options.scrollWidth === "number") {
        state.scrollWidth = options.scrollWidth;
      }
    }
  };
}

function mockMatchMedia(initialMatches: boolean): MatchMediaController {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const legacyListeners = new Set<(event: MediaQueryListEvent) => void>();
  const state = {
    matches: initialMatches,
    media: "(max-width: 40rem)",
    onchange: null,
    addEventListener: vi.fn(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "change" && typeof listener === "function") {
          listeners.add(listener as (event: MediaQueryListEvent) => void);
        }
      }
    ),
    removeEventListener: vi.fn(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === "change" && typeof listener === "function") {
          listeners.delete(listener as (event: MediaQueryListEvent) => void);
        }
      }
    ),
    addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      legacyListeners.add(listener);
    }),
    removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      legacyListeners.delete(listener);
    }),
    dispatchEvent: vi.fn()
  };
  const mediaQuery = state as unknown as MediaQueryList;

  vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));

  return {
    mediaQuery,
    setMatches(matches: boolean): void {
      state.matches = matches;
      const event = { matches, media: state.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
      legacyListeners.forEach((listener) => listener(event));
    }
  };
}

function getAccordionButtons(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    root.querySelectorAll<HTMLButtonElement>(".a11y-tabs__accordion-button")
  );
}

describe("A11yTabsAccordion", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps generated accordion buttons visually hidden in tabs mode", () => {
    installPageStyles();
    mockMatchMedia(false);

    const root = renderTabs();
    const tabs = createTabs(root);
    new A11yTabsAccordion(tabs);

    const list = root.querySelector<HTMLElement>("[data-a11y-tabs-list]");
    const buttons = getAccordionButtons(root);

    expect(root.dataset.a11yTabsPresentation).toBe("tabs");
    expect(list?.hidden).toBe(false);
    expect(buttons).toHaveLength(3);

    buttons.forEach((button) => {
      expect(button.hidden).toBe(true);
      expect(window.getComputedStyle(button).display).toBe("none");
    });
  });

  it("shows a required-open single-selection disclosure state", () => {
    installPageStyles();
    mockMatchMedia(true);

    const root = renderTabs();
    const tabs = createTabs(root);
    new A11yTabsAccordion(tabs);

    const list = root.querySelector<HTMLElement>("[data-a11y-tabs-list]");
    const buttons = getAccordionButtons(root);
    const panels = Array.from(
      root.querySelectorAll<HTMLElement>("[data-a11y-tabs-panel]")
    );

    expect(root.dataset.a11yTabsPresentation).toBe("accordion");
    expect(list?.hidden).toBe(true);
    expect(window.getComputedStyle(list as HTMLElement).display).toBe("none");
    expect(buttons).toHaveLength(3);
    expect(buttons[0].getAttribute("aria-expanded")).toBe("true");
    expect(buttons[0].getAttribute("aria-disabled")).toBe("true");
    expect(buttons[0].disabled).toBe(false);
    expect(window.getComputedStyle(buttons[0]).minHeight).toBe("44px");

    buttons[1].click();

    expect(buttons[0].getAttribute("aria-expanded")).toBe("false");
    expect(buttons[0].getAttribute("aria-disabled")).toBe("false");
    expect(buttons[1].getAttribute("aria-expanded")).toBe("true");
    expect(buttons[1].getAttribute("aria-disabled")).toBe("true");
    expect(panels.map((panel) => panel.hidden)).toEqual([true, false, true]);

    buttons[1].click();
    expect(panels.map((panel) => panel.hidden)).toEqual([true, false, true]);
  });

  it("moves focus to the equivalent control when the presentation changes", () => {
    const media = mockMatchMedia(false);
    const root = renderTabs();
    const tabs = createTabs(root);
    new A11yTabsAccordion(tabs);

    const tabButtons = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-a11y-tabs-tab]")
    );
    const accordionButtons = getAccordionButtons(root);

    tabButtons[1].focus();
    media.setMatches(true);
    expect(document.activeElement).toBe(accordionButtons[1]);
    expect(tabs.getActivePanel()?.id).toBe("setup");

    media.setMatches(false);
    expect(document.activeElement).toBe(tabButtons[1]);
    expect(tabs.getActivePanel()?.id).toBe("setup");
  });

  it("switches on actual wrapping and preserves focus in both directions", () => {
    const media = mockMatchMedia(false);
    const resize = mockResizeObserver();
    const root = renderTabs();
    const layout = mockTabListLayout(root);
    const tabs = createTabs(root);
    new A11yTabsAccordion(tabs);
    const tabButtons = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-a11y-tabs-tab]")
    );
    const accordionButtons = getAccordionButtons(root);

    tabButtons[1].focus();
    layout.set({ tops: [0, 0, 48] });
    resize.trigger(root, 420);

    expect(media.mediaQuery.matches).toBe(false);
    expect(root.dataset.a11yTabsPresentation).toBe("accordion");
    expect(document.activeElement).toBe(accordionButtons[1]);
    expect(tabs.getActivePanel()?.id).toBe("setup");

    layout.set({ tops: [0, 0, 0] });
    resize.trigger(root, 720);

    expect(root.dataset.a11yTabsPresentation).toBe("tabs");
    expect(document.activeElement).toBe(tabButtons[1]);
    expect(tabs.getActivePanel()?.id).toBe("setup");
  });

  it("switches when a single-row tablist overflows horizontally", () => {
    mockMatchMedia(false);
    mockResizeObserver();
    const root = renderTabs();
    mockTabListLayout(root, {
      tops: [0, 0, 0],
      clientWidth: 320,
      scrollWidth: 460
    });
    const tabs = createTabs(root);

    new A11yTabsAccordion(tabs);

    expect(root.dataset.a11yTabsPresentation).toBe("accordion");
  });

  it("supports container-only detection without matchMedia", () => {
    const resize = mockResizeObserver();
    const root = renderTabs();
    mockTabListLayout(root, { tops: [0, 44, 44] });
    const tabs = createTabs(root);

    const accordion = new A11yTabsAccordion(tabs, { mediaQuery: false });

    expect(root.dataset.a11yTabsPresentation).toBe("accordion");
    expect(resize.observe).toHaveBeenCalledWith(root);
    accordion.destroy();
    expect(resize.disconnect).toHaveBeenCalledOnce();
  });

  it("can retain legacy media-query-only switching", () => {
    const media = mockMatchMedia(false);
    const resize = mockResizeObserver();
    const root = renderTabs();
    mockTabListLayout(root, { tops: [0, 44, 44] });
    const tabs = createTabs(root);

    new A11yTabsAccordion(tabs, { collapseOnWrap: false });

    expect(root.dataset.a11yTabsPresentation).toBe("tabs");
    expect(resize.observe).not.toHaveBeenCalled();

    media.setMatches(true);
    expect(root.dataset.a11yTabsPresentation).toBe("accordion");
  });

  it("falls back to window resize checks when ResizeObserver is unavailable", () => {
    mockMatchMedia(false);
    vi.stubGlobal("ResizeObserver", undefined);
    const root = renderTabs();
    const layout = mockTabListLayout(root);
    const tabs = createTabs(root);
    const accordion = new A11yTabsAccordion(tabs, { mediaQuery: false });

    expect(root.dataset.a11yTabsPresentation).toBe("tabs");

    layout.set({ tops: [0, 44, 44] });
    window.dispatchEvent(new Event("resize"));
    expect(root.dataset.a11yTabsPresentation).toBe("accordion");

    accordion.destroy();
    layout.set({ tops: [0, 0, 0] });
    window.dispatchEvent(new Event("resize"));
    expect(root.hasAttribute("data-a11y-tabs-presentation")).toBe(false);
  });

  it("rechecks content-driven wrapping through the public update method", () => {
    mockResizeObserver();
    const root = renderTabs();
    const layout = mockTabListLayout(root, { tops: [0, 44, 44] });
    const tabs = createTabs(root);
    const accordion = new A11yTabsAccordion(tabs, { mediaQuery: false });
    const list = root.querySelector<HTMLElement>("[data-a11y-tabs-list]");

    expect(root.dataset.a11yTabsPresentation).toBe("accordion");

    list?.setAttribute("aria-hidden", "custom");
    list?.setAttribute("style", "color: red");
    layout.set({ tops: [0, 0, 0] });
    accordion.update();

    expect(root.dataset.a11yTabsPresentation).toBe("tabs");
    expect(list?.getAttribute("aria-hidden")).toBe("custom");
    expect(list?.getAttribute("style")).toBe("color: red");
  });

  it("reuses the existing add-on instance without duplicating controls", () => {
    mockMatchMedia(true);
    const root = renderTabs();
    const tabs = createTabs(root);

    const first = new A11yTabsAccordion(tabs);
    const second = new A11yTabsAccordion(tabs, { buttonClass: "ignored" });

    expect(second).toBe(first);
    expect(getAccordionButtons(root)).toHaveLength(3);
    expect(root.querySelector(".ignored")).toBeNull();
  });

  it("restores focus and original presentation state on standalone destroy", () => {
    const media = mockMatchMedia(true);
    const root = renderTabs();
    root.dataset.a11yTabsPresentation = "custom";
    const tabs = createTabs(root);
    const accordion = new A11yTabsAccordion(tabs);
    const tabButtons = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-a11y-tabs-tab]")
    );
    const accordionButtons = getAccordionButtons(root);

    accordionButtons[1].focus();
    accordion.destroy();

    expect(document.activeElement).toBe(tabButtons[1]);
    expect(getAccordionButtons(root)).toHaveLength(0);
    expect(root.dataset.a11yTabsPresentation).toBe("custom");
    expect(root.querySelector<HTMLElement>("[data-a11y-tabs-list]")?.hidden).toBe(
      false
    );
    expect(media.mediaQuery.removeEventListener).toHaveBeenCalledOnce();

    const replacement = new A11yTabsAccordion(tabs);
    expect(replacement).not.toBe(accordion);
    expect(getAccordionButtons(root)).toHaveLength(3);
  });

  it("cleans up generated state when the core tabs instance is destroyed", () => {
    mockMatchMedia(true);
    const root = renderTabs();
    const tabs = createTabs(root);
    new A11yTabsAccordion(tabs);
    const tabButtons = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-a11y-tabs-tab]")
    );
    const accordionButtons = getAccordionButtons(root);

    accordionButtons[2].focus();
    tabs.destroy();

    expect(document.activeElement).toBe(tabButtons[2]);
    expect(getAccordionButtons(root)).toHaveLength(0);
    expect(root.hasAttribute("data-a11y-tabs-presentation")).toBe(false);
    expect(root.querySelector<HTMLElement>("[data-a11y-tabs-list]")?.hidden).toBe(
      false
    );
  });
});
