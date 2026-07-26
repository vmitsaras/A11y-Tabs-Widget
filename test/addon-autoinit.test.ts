import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  A11Y_TABS_INIT_REQUEST,
  installTabsAutoInit,
  type TabsAutoInitController
} from "../src/addons/a11y-tabs-autoinit";

const controllers: TabsAutoInitController[] = [];

function track(controller: TabsAutoInitController): TabsAutoInitController {
  controllers.push(controller);
  return controller;
}

function setDocumentReadyState(state: DocumentReadyState): void {
  Object.defineProperty(document, "readyState", {
    configurable: true,
    value: state
  });
}

function renderTabs(
  container: ParentNode = document.body,
  suffix = "default"
): HTMLElement {
  const root = document.createElement("div");
  root.className = "a11y-tabs";
  root.dataset.a11yTabs = "";
  root.innerHTML = `
    <div data-a11y-tabs-list aria-label="Product information">
      <button type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="details-${suffix}">Details</button>
      <button type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="reviews-${suffix}">Reviews</button>
    </div>
    <section id="details-${suffix}" data-a11y-tabs-panel>Details panel</section>
    <section id="reviews-${suffix}" data-a11y-tabs-panel>Reviews panel</section>
  `;
  container.append(root);
  return root;
}

describe("A11y Tabs auto-init add-on", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    setDocumentReadyState("complete");
  });

  afterEach(() => {
    while (controllers.length > 0) controllers.pop()?.destroy();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, "readyState");
  });

  it("does not initialize tabs when the module is imported", async () => {
    const root = renderTabs();

    vi.resetModules();
    await import("../src/addons/a11y-tabs-autoinit");

    expect(root.classList.contains("is-initialized")).toBe(false);
    expect(root.querySelector("[data-a11y-tabs-list]")?.getAttribute("role")).toBeNull();
  });

  it("initializes existing tabs immediately when the document is ready", () => {
    const root = renderTabs();

    track(installTabsAutoInit());

    expect(root.classList.contains("is-initialized")).toBe(true);
    expect(root.querySelector("[data-a11y-tabs-list]")?.getAttribute("role")).toBe(
      "tablist"
    );
  });

  it("waits for DOMContentLoaded when the document is still loading", () => {
    setDocumentReadyState("loading");
    const root = renderTabs();

    track(installTabsAutoInit());
    expect(root.classList.contains("is-initialized")).toBe(false);

    document.dispatchEvent(new Event("DOMContentLoaded"));
    expect(root.classList.contains("is-initialized")).toBe(true);
  });

  it("initializes only the container that dispatches a bubbling request", () => {
    track(installTabsAutoInit());
    const firstContainer = document.createElement("section");
    const secondContainer = document.createElement("section");
    document.body.append(firstContainer, secondContainer);
    const firstRoot = renderTabs(firstContainer, "first");
    const secondRoot = renderTabs(secondContainer, "second");

    firstContainer.dispatchEvent(
      new Event(A11Y_TABS_INIT_REQUEST, { bubbles: true })
    );

    expect(firstRoot.classList.contains("is-initialized")).toBe(true);
    expect(secondRoot.classList.contains("is-initialized")).toBe(false);
  });

  it("includes a tabs root that dispatches the request itself", () => {
    track(installTabsAutoInit());
    const root = renderTabs(document.body, "root-request");

    root.dispatchEvent(new Event(A11Y_TABS_INIT_REQUEST, { bubbles: true }));

    expect(root.classList.contains("is-initialized")).toBe(true);
  });

  it("reuses one controller per scope and keeps the first options", () => {
    const first = track(installTabsAutoInit({ initialIndex: 1 }));
    const second = installTabsAutoInit({ initialIndex: 0 });
    const root = renderTabs(document.body, "duplicate-install");

    root.dispatchEvent(new Event(A11Y_TABS_INIT_REQUEST, { bubbles: true }));

    expect(second).toBe(first);
    expect(
      root.querySelectorAll("[data-a11y-tabs-tab]")[1]?.getAttribute(
        "aria-selected"
      )
    ).toBe("true");
  });

  it("returns initialized instances from direct scoped initialization", () => {
    const controller = track(installTabsAutoInit());
    const detachedContainer = document.createElement("section");
    const root = renderTabs(detachedContainer, "direct");

    const instances = controller.init(detachedContainer);

    expect(instances).toHaveLength(1);
    expect(instances[0]?.getActivePanel()?.id).toBe("details-direct");
    expect(root.classList.contains("is-initialized")).toBe(true);
  });

  it("removes pending readiness and request listeners on destroy", () => {
    setDocumentReadyState("loading");
    const root = renderTabs();
    const controller = installTabsAutoInit();

    controller.destroy();
    document.dispatchEvent(new Event("DOMContentLoaded"));
    root.dispatchEvent(new Event(A11Y_TABS_INIT_REQUEST, { bubbles: true }));

    expect(root.classList.contains("is-initialized")).toBe(false);
    expect(controller.init()).toEqual([]);
  });

  it("does not destroy initialized tabs when the controller is destroyed", () => {
    const root = renderTabs();
    const controller = installTabsAutoInit();

    controller.destroy();

    expect(root.classList.contains("is-initialized")).toBe(true);
    expect(root.querySelector("[data-a11y-tabs-list]")?.getAttribute("role")).toBe(
      "tablist"
    );
  });

  it("allows a clean installation after the prior controller is destroyed", () => {
    const first = installTabsAutoInit();
    first.destroy();
    const second = track(installTabsAutoInit());

    expect(second).not.toBe(first);
  });

  it("returns an inert controller when no document or scope is available", () => {
    vi.stubGlobal("document", undefined);

    const controller = installTabsAutoInit();

    expect(controller.init()).toEqual([]);
    expect(() => controller.destroy()).not.toThrow();
  });
});
