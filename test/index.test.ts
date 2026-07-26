import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  A11yTabs,
  createTabs,
  initTabsAll,
  type TabsInstance
} from "../src/index";

function renderTabs(extraRootAttributes = ""): HTMLElement {
  document.body.innerHTML = `
    <div class="a11y-tabs" data-a11y-tabs ${extraRootAttributes}>
      <div class="a11y-tabs__list" data-a11y-tabs-list aria-label="Product information">
        <button class="a11y-tabs__tab" type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="details">Details</button>
        <button class="a11y-tabs__tab" type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="shipping">Shipping</button>
        <button class="a11y-tabs__tab" type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="reviews">Reviews</button>
      </div>
      <section class="a11y-tabs__panel" id="details" data-a11y-tabs-panel>
        <h2>Details</h2>
      </section>
      <section class="a11y-tabs__panel" id="shipping" data-a11y-tabs-panel hidden>
        <h2>Shipping</h2>
      </section>
      <section class="a11y-tabs__panel" id="reviews" data-a11y-tabs-panel hidden>
        <h2>Reviews</h2>
      </section>
    </div>
  `;

  const root = document.querySelector("[data-a11y-tabs]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Test markup did not render a tabs root.");
  }

  return root;
}

function getTabs(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[role="tab"]')).filter(
    (tab): tab is HTMLElement => tab instanceof HTMLElement
  );
}

function keydown(target: HTMLElement, key: string): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true
    })
  );
}

function getAttribute(element: Element | null, attribute: string): string | null {
  expect(element).not.toBeNull();
  return element?.getAttribute(attribute) ?? null;
}

function hasAttribute(element: Element | null, attribute: string): boolean {
  expect(element).not.toBeNull();
  return Boolean(element?.hasAttribute(attribute));
}

describe("A11yTabs", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("exports the plugin-specific runtime API", () => {
    expect(A11yTabs).toBeTypeOf("function");
    expect(createTabs).toBeTypeOf("function");
    expect(initTabsAll).toBeTypeOf("function");
  });

  it("initializes roles, relationships, state, and the init lifecycle event", () => {
    const root = renderTabs();
    let eventInstance: TabsInstance | null = null;

    root.addEventListener("a11y-tabs:init", (event) => {
      eventInstance = (event as CustomEvent<{ instance: TabsInstance }>).detail
        .instance;
    });

    const instance = createTabs(root);
    const tabs = getTabs();
    const panels = Array.from(
      document.querySelectorAll("[data-a11y-tabs-panel]")
    );

    expect(eventInstance).toBe(instance);
    expect(root.classList.contains("is-initialized")).toBe(true);
    expect(
      getAttribute(root.querySelector("[data-a11y-tabs-list]"), "role")
    ).toBe("tablist");
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].getAttribute("aria-controls")).toBe("details");
    expect(tabs[0].getAttribute("tabindex")).toBe("0");
    expect(panels[0].getAttribute("role")).toBe("tabpanel");
    expect(panels[0].getAttribute("aria-labelledby")).toBe(tabs[0].id);
    expect(panels[1].hasAttribute("hidden")).toBe(true);
  });

  it("reuses an existing instance for duplicate initialization", () => {
    const root = renderTabs();

    const first = createTabs(root);
    const second = createTabs(root);

    expect(second).toBe(first);
  });

  it("activates tabs and dispatches cancellable change lifecycle events", () => {
    const root = renderTabs();
    const beforeChanges: Array<CustomEvent<{ index: number }>> = [];
    const changes: Array<CustomEvent<{ index: number }>> = [];

    root.addEventListener("a11y-tabs:before-change", (event) => {
      beforeChanges.push(event as CustomEvent<{ index: number }>);
    });
    root.addEventListener("a11y-tabs:change", (event) => {
      changes.push(event as CustomEvent<{ index: number }>);
    });

    const instance = createTabs(root);

    expect(instance.activateByPanelId("reviews")).toBe(true);
    expect(instance.getActivePanel()?.id).toBe("reviews");
    expect(beforeChanges).toHaveLength(1);
    expect(beforeChanges[0].detail.index).toBe(2);
    expect(changes).toHaveLength(1);
    expect(changes[0].detail.index).toBe(2);

    root.addEventListener("a11y-tabs:before-change", (event) => {
      const detail = (event as CustomEvent<{ index: number }>).detail;
      if (detail.index === 1) {
        event.preventDefault();
      }
    });

    expect(instance.activateByPanelId("shipping")).toBe(false);
    expect(instance.getActivePanel()?.id).toBe("reviews");
  });

  it("supports manual roving tabindex keyboard behavior", () => {
    const root = renderTabs();
    createTabs(root);

    const tabs = getTabs();

    tabs[0].focus();
    keydown(tabs[0], "ArrowRight");

    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1].getAttribute("tabindex")).toBe("0");
    expect(tabs[1].getAttribute("aria-selected")).toBe("false");

    keydown(tabs[1], "Enter");

    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(hasAttribute(document.getElementById("shipping"), "hidden")).toBe(
      false
    );
  });

  it("supports automatic activation from dataset options", () => {
    const root = renderTabs('data-a11y-tabs-activation="automatic"');
    createTabs(root);

    const tabs = getTabs();

    keydown(tabs[0], "ArrowRight");

    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(hasAttribute(document.getElementById("shipping"), "hidden")).toBe(
      false
    );
  });

  it("skips disabled tabs during keyboard navigation", () => {
    const root = renderTabs();
    const disabledTab = root.querySelectorAll("[data-a11y-tabs-tab]")[1];

    if (disabledTab instanceof HTMLButtonElement) {
      disabledTab.disabled = true;
    }

    createTabs(root);
    const tabs = getTabs();

    keydown(tabs[0], "ArrowRight");

    expect(document.activeElement).toBe(tabs[2]);
    expect(tabs[1].getAttribute("aria-disabled")).toBe("true");
    expect(tabs[1].classList.contains("is-disabled")).toBe(true);
  });

  it("supports Home, End, vertical arrows, RTL arrows, and Space activation", () => {
    const verticalRoot = renderTabs(
      'data-a11y-tabs-orientation="vertical"'
    );
    createTabs(verticalRoot);
    const verticalTabs = getTabs();

    keydown(verticalTabs[0], "End");
    expect(document.activeElement).toBe(verticalTabs[2]);
    keydown(verticalTabs[2], "Home");
    expect(document.activeElement).toBe(verticalTabs[0]);
    keydown(verticalTabs[0], "ArrowDown");
    expect(document.activeElement).toBe(verticalTabs[1]);
    keydown(verticalTabs[1], " ");
    expect(verticalTabs[1].getAttribute("aria-selected")).toBe("true");

    document.body.innerHTML = "";
    const rtlRoot = renderTabs('data-a11y-tabs-dir="rtl"');
    createTabs(rtlRoot);
    const rtlTabs = getTabs();
    keydown(rtlTabs[0], "ArrowLeft");
    expect(document.activeElement).toBe(rtlTabs[1]);
    keydown(rtlTabs[1], "ArrowRight");
    expect(document.activeElement).toBe(rtlTabs[0]);
  });

  it("fails safely when every tab is disabled", () => {
    const root = renderTabs();
    root
      .querySelectorAll<HTMLButtonElement>("[data-a11y-tabs-tab]")
      .forEach((tab) => {
        tab.disabled = true;
      });
    const instance = createTabs(root);
    const tabs = getTabs();

    expect(tabs.every((tab) => tab.getAttribute("tabindex") === "-1")).toBe(
      true
    );
    expect(tabs.every((tab) => tab.getAttribute("aria-selected") === "false")).toBe(
      true
    );
    expect(instance.next()).toBe(false);
    expect(instance.activate(0)).toBe(false);
  });

  it("decodes hash panel ids and permits clean reinitialization after destroy", () => {
    history.replaceState(null, "", "#reviews");
    const root = renderTabs();
    const first = createTabs(root, { useHash: true });
    expect(first.getActivePanel()?.id).toBe("reviews");

    first.destroy();
    const second = createTabs(root, { useHash: true });
    expect(second).not.toBe(first);
    expect(second.getActivePanel()?.id).toBe("reviews");
  });

  it("destroys listeners and restores the original DOM state", () => {
    const root = renderTabs();
    let destroyed = false;

    root.addEventListener("a11y-tabs:destroy", (event) => {
      destroyed = Boolean(
        (event as CustomEvent<{ instance: TabsInstance }>).detail.instance
      );
    });

    const instance = createTabs(root);
    const tabs = getTabs();
    const list = root.querySelector("[data-a11y-tabs-list]");

    instance.destroy();

    expect(destroyed).toBe(true);
    expect(root.classList.contains("is-initialized")).toBe(false);
    expect(hasAttribute(list, "role")).toBe(false);
    expect(tabs[0].hasAttribute("role")).toBe(false);
    expect(tabs[0].hasAttribute("aria-selected")).toBe(false);
    expect(hasAttribute(document.getElementById("shipping"), "hidden")).toBe(
      true
    );

    tabs[1].click();
    expect(hasAttribute(document.getElementById("details"), "hidden")).toBe(
      false
    );
  });

  it("initializes all matching roots in a scope", () => {
    renderTabs();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = document.body.innerHTML;
    document.body.append(wrapper);

    const instances = initTabsAll();

    expect(instances).toHaveLength(2);
    expect(document.querySelectorAll(".is-initialized")).toHaveLength(2);
  });
});
