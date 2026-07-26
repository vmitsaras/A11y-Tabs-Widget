import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTabs } from "../src/index";
import {
  A11yTabsShortcuts,
  type ShortcutUnavailableDetail
} from "../src/addons/a11y-tabs-shortcuts";

function renderShortcutTabs(): HTMLElement {
  document.body.innerHTML = `
    <button type="button" id="outside">Outside action</button>
    <div class="a11y-tabs" data-a11y-tabs>
      <div class="a11y-tabs__list" data-a11y-tabs-list aria-label="Workspace">
        <button type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="inbox">Inbox</button>
        <button type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="queue">Queue</button>
        <button type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="audit">Audit</button>
      </div>
      <section id="inbox" data-a11y-tabs-panel>
        <h2>Inbox</h2>
        <button type="button" id="review-message">Review message</button>
        <label>Notes <textarea></textarea></label>
      </section>
      <section id="queue" data-a11y-tabs-panel hidden><h2>Queue</h2></section>
      <section id="audit" data-a11y-tabs-panel hidden><h2>Audit</h2></section>
    </div>
  `;

  const root = document.querySelector<HTMLElement>("[data-a11y-tabs]");
  if (!root) throw new Error("Test markup did not render a tabs root.");
  return root;
}

function pressShortcut(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    ctrlKey: true,
    bubbles: true,
    cancelable: true
  });
  target.dispatchEvent(event);
  return event;
}

function getTab(root: HTMLElement, name: string): HTMLButtonElement {
  const tab = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[role="tab"]')
  ).find((candidate) => candidate.textContent?.trim() === name);
  if (!tab) throw new Error(`Expected ${name} tab.`);
  return tab;
}

describe("A11yTabsShortcuts", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("activates direct shortcuts while focus is inside the tabs root", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    new A11yTabsShortcuts(tabs, {
      shortcuts: ["Ctrl+1", "Ctrl+2", "Ctrl+3"]
    });

    const inbox = getTab(root, "Inbox");
    inbox.focus();
    const event = pressShortcut(inbox, "2");

    expect(event.defaultPrevented).toBe(true);
    expect(tabs.getActiveTab()?.textContent?.trim()).toBe("Queue");
    expect(document.activeElement).toBe(getTab(root, "Queue"));
    expect(document.getElementById("queue")?.hasAttribute("hidden")).toBe(false);
  });

  it("does not keep root-scoped shortcuts active after focus leaves the widget", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    new A11yTabsShortcuts(tabs, {
      shortcuts: ["Ctrl+1", "Ctrl+2", "Ctrl+3"]
    });

    const outside = document.getElementById("outside");
    if (!outside) throw new Error("Expected outside button.");
    outside.focus();
    const event = pressShortcut(outside, "2");

    expect(event.defaultPrevented).toBe(false);
    expect(tabs.getActiveTab()?.textContent?.trim()).toBe("Inbox");
  });

  it("keeps root-scoped shortcuts active in non-editable panel content", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    new A11yTabsShortcuts(tabs, {
      shortcuts: ["Ctrl+1", "Ctrl+2", "Ctrl+3"]
    });

    const panelButton = root.querySelector<HTMLButtonElement>("#review-message");
    if (!panelButton) throw new Error("Expected panel action button.");
    panelButton.focus();
    pressShortcut(panelButton, "2");

    expect(tabs.getActiveTab()?.textContent?.trim()).toBe("Queue");
    expect(document.activeElement).toBe(getTab(root, "Queue"));
  });

  it("supports explicit document scope without changing the safe root default", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    new A11yTabsShortcuts(tabs, {
      scope: "document",
      shortcuts: ["Ctrl+1", "Ctrl+2", "Ctrl+3"]
    });

    const outside = document.getElementById("outside");
    if (!outside) throw new Error("Expected outside button.");
    outside.focus();
    const event = pressShortcut(outside, "2");

    expect(event.defaultPrevented).toBe(true);
    expect(tabs.getActiveTab()?.textContent?.trim()).toBe("Queue");
    expect(document.activeElement).toBe(outside);
    tabs.destroy();
  });

  it("ignores shortcuts from editable controls", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    new A11yTabsShortcuts(tabs, {
      shortcuts: ["Ctrl+1", "Ctrl+2", "Ctrl+3"]
    });

    const textarea = root.querySelector("textarea");
    if (!textarea) throw new Error("Expected notes textarea.");
    const event = pressShortcut(textarea, "2");

    expect(event.defaultPrevented).toBe(false);
    expect(tabs.getActiveTab()?.textContent?.trim()).toBe("Inbox");
  });

  it("keeps selection stable and reports a disabled shortcut target", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    const queue = getTab(root, "Queue");
    const unavailable = vi.fn<(event: Event) => void>();
    root.addEventListener("a11y-tabs:shortcut-unavailable", unavailable);
    new A11yTabsShortcuts(tabs, {
      shortcuts: ["Ctrl+1", "Ctrl+2", "Ctrl+3"]
    });
    queue.disabled = true;

    const event = pressShortcut(getTab(root, "Inbox"), "2");

    expect(event.defaultPrevented).toBe(true);
    expect(tabs.getActiveTab()?.textContent?.trim()).toBe("Inbox");
    expect(unavailable).toHaveBeenCalledOnce();
    expect(
      (unavailable.mock.calls[0][0] as CustomEvent<ShortcutUnavailableDetail>)
        .detail.reason
    ).toBe("disabled");
  });

  it("does not activate a hidden shortcut target", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    const queue = getTab(root, "Queue");
    let reason: ShortcutUnavailableDetail["reason"] | null = null;
    root.addEventListener("a11y-tabs:shortcut-unavailable", (event) => {
      reason = (event as CustomEvent<ShortcutUnavailableDetail>).detail.reason;
    });
    new A11yTabsShortcuts(tabs, {
      shortcuts: ["Ctrl+1", "Ctrl+2", "Ctrl+3"]
    });
    queue.hidden = true;

    pressShortcut(getTab(root, "Inbox"), "2");

    expect(tabs.getActiveTab()?.textContent?.trim()).toBe("Inbox");
    expect(reason).toBe("hidden");
  });

  it("keeps the original mapping unavailable after its tab is removed", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    const queue = getTab(root, "Queue");
    const details: ShortcutUnavailableDetail[] = [];
    root.addEventListener("a11y-tabs:shortcut-unavailable", (event) => {
      details.push((event as CustomEvent<ShortcutUnavailableDetail>).detail);
    });
    new A11yTabsShortcuts(tabs, {
      shortcuts: ["Ctrl+1", "Ctrl+2", "Ctrl+3"]
    });
    queue.remove();

    pressShortcut(getTab(root, "Inbox"), "2");

    expect(tabs.getActiveTab()?.textContent?.trim()).toBe("Inbox");
    expect(details[0]?.reason).toBe("disconnected");
    expect(details[0]?.tab).toBe(queue);
  });

  it("keeps shortcut mappings attached to their original tabs after reordering", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    const queue = getTab(root, "Queue");
    const list = root.querySelector('[role="tablist"]');
    new A11yTabsShortcuts(tabs, {
      shortcuts: ["Ctrl+1", "Ctrl+2", "Ctrl+3"]
    });
    list?.append(queue);

    pressShortcut(getTab(root, "Inbox"), "2");

    expect(tabs.getActiveTab()).toBe(queue);
    expect(document.getElementById("queue")?.hasAttribute("hidden")).toBe(false);
  });

  it("reports an invalid shortcut target without changing selection", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    const details: ShortcutUnavailableDetail[] = [];
    root.addEventListener("a11y-tabs:shortcut-unavailable", (event) => {
      details.push((event as CustomEvent<ShortcutUnavailableDetail>).detail);
    });
    new A11yTabsShortcuts(tabs, {
      shortcuts: [{ combo: "Ctrl+9", target: "missing-tab" }]
    });

    const event = pressShortcut(getTab(root, "Inbox"), "9");

    expect(event.defaultPrevented).toBe(true);
    expect(tabs.getActiveTab()?.textContent?.trim()).toBe("Inbox");
    expect(details[0]?.reason).toBe("missing");
    expect(details[0]?.tab).toBeNull();
  });

  it("does not redirect shortcuts when every target is disabled", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    const details: ShortcutUnavailableDetail[] = [];
    root.addEventListener("a11y-tabs:shortcut-unavailable", (event) => {
      details.push((event as CustomEvent<ShortcutUnavailableDetail>).detail);
    });
    new A11yTabsShortcuts(tabs, {
      shortcuts: ["Ctrl+1", "Ctrl+2", "Ctrl+3"]
    });
    root.querySelectorAll<HTMLButtonElement>('[role="tab"]').forEach((tab) => {
      tab.disabled = true;
    });

    pressShortcut(getTab(root, "Inbox"), "2");

    expect(tabs.getActiveTab()?.textContent?.trim()).toBe("Inbox");
    expect(details[0]?.reason).toBe("disabled");
    expect(details[0]?.tab?.textContent?.trim()).toBe("Queue");
  });

  it("does not activate a target whose panel was removed", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    let reason: ShortcutUnavailableDetail["reason"] | null = null;
    root.addEventListener("a11y-tabs:shortcut-unavailable", (event) => {
      reason = (event as CustomEvent<ShortcutUnavailableDetail>).detail.reason;
    });
    new A11yTabsShortcuts(tabs, {
      shortcuts: ["Ctrl+1", "Ctrl+2", "Ctrl+3"]
    });
    document.getElementById("queue")?.remove();

    pressShortcut(getTab(root, "Inbox"), "2");

    expect(tabs.getActiveTab()?.textContent?.trim()).toBe("Inbox");
    expect(reason).toBe("missing-panel");
  });

  it("removes shortcut listeners when the tabs instance is destroyed", () => {
    const root = renderShortcutTabs();
    const tabs = createTabs(root);
    new A11yTabsShortcuts(tabs, {
      shortcuts: ["Ctrl+1", "Ctrl+2", "Ctrl+3"]
    });
    const inbox = getTab(root, "Inbox");

    tabs.destroy();
    const event = pressShortcut(inbox, "2");

    expect(event.defaultPrevented).toBe(false);
    expect(document.getElementById("queue")?.hasAttribute("hidden")).toBe(true);
  });
});
