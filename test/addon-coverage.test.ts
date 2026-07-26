import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTabs } from "../src/index";
import { A11yTabsAnalytics } from "../src/addons/a11y-tabs-analytics";
import { A11yTabsBadges } from "../src/addons/a11y-tabs-badges";
import { A11yTabsHistory } from "../src/addons/a11y-tabs-history";
import { A11yTabsLoader } from "../src/addons/a11y-tabs-loader";
import { A11yTabsOverflowMenu } from "../src/addons/a11y-tabs-overflow-menu";
import { A11yTabsStepper } from "../src/addons/a11y-tabs-stepper";
import { A11yTabsUnsavedGuard } from "../src/addons/a11y-tabs-unsaved-guard";

function renderTabs(options: { loader?: boolean; form?: boolean } = {}): HTMLElement {
  document.body.innerHTML = `
    <div data-a11y-tabs id="account-tabs" aria-label="Account sections">
      <div data-a11y-tabs-list aria-label="Account sections">
        <button type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="profile">Profile</button>
        <button type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="security">Security</button>
        <button type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="billing">Billing</button>
      </div>
      <section id="profile" data-a11y-tabs-panel>
        ${options.form ? '<label>Name <input name="name" value="Ada"></label>' : "Profile content"}
      </section>
      <section id="security" data-a11y-tabs-panel ${
        options.loader ? 'data-tab-src="/security"' : ""
      } hidden>Security content</section>
      <section id="billing" data-a11y-tabs-panel hidden>Billing content</section>
    </div>
    <div data-a11y-tabs-stepper>
      <span data-a11y-tabs-stepper-current></span>
      <span data-a11y-tabs-stepper-total></span>
      <span data-a11y-tabs-stepper-completed></span>
      <button type="button" data-a11y-tabs-stepper-previous>Previous</button>
      <button type="button" data-a11y-tabs-stepper-next>Next</button>
    </div>
  `;

  const root = document.querySelector<HTMLElement>("[data-a11y-tabs]");
  if (!root) throw new Error("Test markup did not render a tabs root.");
  return root;
}

function mockResizeObserver(): void {
  class ResizeObserverMock {
    observe(): void {}
    disconnect(): void {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
}

function forceOverflow(root: HTMLElement): void {
  const list = root.querySelector<HTMLElement>("[data-a11y-tabs-list]");
  if (!list) throw new Error("Test markup did not render a tablist.");
  Object.defineProperty(list, "clientWidth", {
    configurable: true,
    value: 200
  });
  Object.defineProperty(list, "scrollWidth", {
    configurable: true,
    value: 500
  });
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

function response(content: string, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    text: vi.fn().mockResolvedValue(content)
  } as unknown as Response;
}

describe("previously uncovered add-ons", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    history.replaceState(null, "", "/");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("forwards normalized local analytics data and stops after destroy", () => {
    const root = renderTabs();
    const tabs = createTabs(root);
    const onChange = vi.fn();
    const analytics = new A11yTabsAnalytics(tabs, onChange);

    tabs.activateByPanelId("security");

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({
      tabId: expect.any(String),
      panelId: "security",
      index: 1,
      previousIndex: 0,
      tabText: "Security",
      rootId: "account-tabs"
    });

    analytics.destroy();
    tabs.activateByPanelId("billing");
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("renders deliberate badge names and restores the original label", () => {
    const root = renderTabs();
    const tabs = createTabs(root);
    const tab = root.querySelectorAll<HTMLElement>('[role="tab"]')[1];
    tab.setAttribute("aria-label", "Account security");

    const badges = new A11yTabsBadges(
      tabs,
      { security: { count: 3, label: "alerts", variant: "warning" } },
      { labelMode: "aria-label" }
    );

    expect(tab.getAttribute("aria-label")).toBe(
      "Security, warning: 3 alerts"
    );
    expect(tab.querySelector("[data-a11y-tabs-badge-variant]")?.textContent).toBe(
      "3"
    );

    badges.destroy();
    expect(tab.getAttribute("aria-label")).toBe("Account security");
    expect(tab.querySelector(".a11y-tabs__badge")).toBeNull();
  });

  it("adds a clean hidden-text suffix without leading punctuation", () => {
    const root = renderTabs();
    const tabs = createTabs(root);
    new A11yTabsBadges(
      tabs,
      { security: { count: 2, label: "alerts" } },
      { labelMode: "hidden-text" }
    );

    const hiddenText = root.querySelector<HTMLElement>(
      '[aria-controls="security"] .a11y-tabs__sr-only'
    );
    expect(hiddenText?.textContent).toBe("2 alerts");
  });

  it("writes only the selected panel id to hash history", () => {
    const root = renderTabs();
    const tabs = createTabs(root);
    const pushState = vi.spyOn(history, "pushState");
    const historyAddon = new A11yTabsHistory(tabs);

    tabs.activateByPanelId("security");

    expect(pushState).toHaveBeenCalledOnce();
    expect(pushState.mock.calls[0]?.[0]).toEqual({
      a11yTabs: {
        index: 1,
        panelId: "security",
        tabId: expect.any(String)
      }
    });
    expect(String(pushState.mock.calls[0]?.[2])).toMatch(/#security$/);

    historyAddon.destroy();
    tabs.activateByPanelId("billing");
    expect(pushState).toHaveBeenCalledOnce();
  });

  it("restores a selected panel from browser history state", () => {
    const root = renderTabs();
    const tabs = createTabs(root);
    const historyAddon = new A11yTabsHistory(tabs, { mode: "state" });

    window.dispatchEvent(
      new PopStateEvent("popstate", {
        state: {
          a11yTabs: {
            panelId: "billing"
          }
        }
      })
    );

    expect(tabs.getActivePanel()?.id).toBe("billing");
    historyAddon.destroy();
  });

  it("loads text safely, announces completion, and reuses cached content", async () => {
    const root = renderTabs({ loader: true });
    const tabs = createTabs(root);
    const fetchMock = vi.fn().mockResolvedValue(response("Security report"));
    vi.stubGlobal("fetch", fetchMock);
    const loader = new A11yTabsLoader(tabs, { contentType: "text" });

    tabs.activateByPanelId("security");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await vi.waitFor(() =>
      expect(document.getElementById("security")?.textContent).toContain(
        "Security report"
      )
    );

    expect(
      document.querySelector<HTMLElement>(".a11y-tabs__loader-status")
        ?.textContent
    ).toBe("Tab content loaded.");
    expect(document.getElementById("security")?.hasAttribute("aria-busy")).toBe(
      false
    );

    tabs.activateByPanelId("profile");
    tabs.activateByPanelId("security");
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledOnce();
    loader.destroy();
  });

  it("fails closed for HTML and avoids duplicate error announcements", async () => {
    const root = renderTabs({ loader: true });
    const tabs = createTabs(root);
    const onError = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response("<strong>Remote HTML</strong>"))
    );
    new A11yTabsLoader(tabs, { onError });

    tabs.activateByPanelId("security");

    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    const panel = document.getElementById("security");
    expect(panel?.querySelector('[role="alert"]')?.textContent).toContain(
      "Unable to load tab content."
    );
    expect(
      panel?.querySelector<HTMLElement>('[role="status"]')?.textContent
    ).toBe("");
    expect(panel?.innerHTML).not.toContain("<strong>Remote HTML</strong>");
  });

  it("retries a failed request and replaces the error with loaded content", async () => {
    const root = renderTabs({ loader: true });
    const tabs = createTabs(root);
    const onRetry = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response("", false))
      .mockResolvedValueOnce(response("Recovered content"));
    vi.stubGlobal("fetch", fetchMock);
    new A11yTabsLoader(tabs, { contentType: "text", onRetry });

    tabs.activateByPanelId("security");
    const panel = document.getElementById("security");
    await vi.waitFor(() =>
      expect(panel?.querySelector<HTMLButtonElement>("button")?.textContent).toBe(
        "Retry"
      )
    );

    panel?.querySelector<HTMLButtonElement>("button")?.click();

    await vi.waitFor(() =>
      expect(panel?.textContent).toContain("Recovered content")
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(panel?.querySelector('[role="alert"]')).toBeNull();
  });

  it("aborts an in-flight request when reloading or destroying a detached panel", async () => {
    const root = renderTabs({ loader: true });
    const tabs = createTabs(root);
    const signals: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_src: string, init?: RequestInit) => {
        const signal = init?.signal;
        if (signal) signals.push(signal);
        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      })
    );
    const loader = new A11yTabsLoader(tabs, { contentType: "text" });
    const panel = document.getElementById("security");

    tabs.activateByPanelId("security");
    await vi.waitFor(() => expect(signals).toHaveLength(1));
    void loader.reload(panel);
    await vi.waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0]?.aborted).toBe(true);

    panel?.remove();
    loader.destroy();
    expect(signals[1]?.aborted).toBe(true);
  });

  it("supports the complete generated menu keyboard path", () => {
    mockResizeObserver();
    const root = renderTabs();
    forceOverflow(root);
    const tabs = createTabs(root);
    const originalTabs = root.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    originalTabs[1].disabled = true;
    originalTabs[1].setAttribute("aria-disabled", "true");
    const overflow = new A11yTabsOverflowMenu(tabs);
    overflow.update();

    const button = root.querySelector<HTMLButtonElement>(
      'button[aria-haspopup="menu"]'
    );
    const items = root.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
    if (!button) throw new Error("Overflow menu button was not generated.");

    keydown(button, "ArrowDown");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(items[0]);

    keydown(items[0], "ArrowDown");
    expect(document.activeElement).toBe(items[2]);
    keydown(items[2], "Home");
    expect(document.activeElement).toBe(items[0]);
    keydown(items[0], "End");
    expect(document.activeElement).toBe(items[2]);
    keydown(items[2], "Escape");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);

    keydown(button, "ArrowUp");
    expect(document.activeElement).toBe(items[2]);
    keydown(items[2], "Tab");
    expect(button.getAttribute("aria-expanded")).toBe("false");

    overflow.destroy();
    expect(root.querySelector('[aria-haspopup="menu"]')).toBeNull();
  });

  it("does not steal focus when an outside click closes the generated menu", () => {
    mockResizeObserver();
    const root = renderTabs();
    forceOverflow(root);
    const tabs = createTabs(root);
    new A11yTabsOverflowMenu(tabs);
    const button = root.querySelector<HTMLButtonElement>(
      'button[aria-haspopup="menu"]'
    );
    const outside = document.createElement("button");
    document.body.append(outside);

    button?.click();
    outside.focus();
    outside.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(outside);
  });

  it("keeps stepper state and end controls synchronized", () => {
    const root = renderTabs();
    const tabs = createTabs(root);
    const stepper = new A11yTabsStepper(tabs);
    const previous = document.querySelector<HTMLButtonElement>(
      "[data-a11y-tabs-stepper-previous]"
    );
    const next = document.querySelector<HTMLButtonElement>(
      "[data-a11y-tabs-stepper-next]"
    );

    expect(previous?.disabled).toBe(true);
    expect(next?.disabled).toBe(false);
    expect(
      document.querySelector("[data-a11y-tabs-stepper-current]")?.textContent
    ).toBe("1");

    next?.click();
    expect(tabs.getActivePanel()?.id).toBe("security");
    expect(previous?.disabled).toBe(false);

    next?.click();
    expect(tabs.getActivePanel()?.id).toBe("billing");
    expect(next?.disabled).toBe(true);
    stepper.destroy();
  });

  it("keeps the first destination during an asynchronous unsaved-change decision", async () => {
    const root = renderTabs({ form: true });
    const tabs = createTabs(root);
    let resolveDecision: ((allowed: boolean) => void) | undefined;
    const guard = new A11yTabsUnsavedGuard(tabs, {
      modal: () =>
        new Promise<boolean>((resolve) => {
          resolveDecision = resolve;
        })
    });
    const input = root.querySelector<HTMLInputElement>("input");
    if (!input) throw new Error("Test form input was not rendered.");
    input.value = "Grace";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(tabs.activateByPanelId("security")).toBe(false);
    expect(tabs.activateByPanelId("billing")).toBe(false);
    resolveDecision?.(true);
    await vi.waitFor(() =>
      expect(tabs.getActivePanel()?.id).toBe("security")
    );

    guard.destroy();
  });
});
