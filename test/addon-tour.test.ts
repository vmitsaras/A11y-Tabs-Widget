import { beforeEach, describe, expect, it } from "vitest";
import { createTabs } from "../src/index";
import { A11yTabsTour } from "../src/addons/a11y-tabs-tour";

function renderTour(): {
  root: HTMLElement;
  start: HTMLButtonElement;
} {
  document.body.innerHTML = `
    <button type="button" id="tour-start">Start tour</button>
    <div class="a11y-tabs" data-a11y-tabs>
      <div class="a11y-tabs__list" data-a11y-tabs-list aria-label="Account setup">
        <button type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="profile">Profile</button>
        <button type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="security">Security</button>
        <button type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="billing">Billing</button>
      </div>
      <section id="profile" data-a11y-tabs-panel>Profile panel</section>
      <section id="security" data-a11y-tabs-panel hidden>Security panel</section>
      <section id="billing" data-a11y-tabs-panel hidden>Billing panel</section>
    </div>
  `;

  const root = document.querySelector<HTMLElement>("[data-a11y-tabs]");
  const start = document.querySelector<HTMLButtonElement>("#tour-start");
  if (!root || !start) throw new Error("Tour test markup did not render.");
  return { root, start };
}

function getControl(root: HTMLElement, name: string): HTMLButtonElement {
  const control = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === name
  );
  if (!control) throw new Error(`Missing ${name} tour control.`);
  return control;
}

describe("A11yTabsTour focus management", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps focus on Next when advancing a generated popover", () => {
    const { root, start } = renderTour();
    const tabs = createTabs(root);
    const tour = new A11yTabsTour(tabs);

    start.focus();
    expect(tour.start()).toBe(true);
    const next = getControl(root, "Next");
    expect(document.activeElement).toBe(next);

    next.click();

    expect(document.activeElement).toBe(next);
    expect(tabs.getActivePanel()?.id).toBe("security");
  });

  it("moves focus from Next to Finish on the final step", () => {
    const { root } = renderTour();
    const tabs = createTabs(root);
    const tour = new A11yTabsTour(tabs);

    tour.start();
    const next = getControl(root, "Next");
    next.click();
    next.click();

    const finish = getControl(root, "Finish");
    expect(next.hidden).toBe(true);
    expect(finish.hidden).toBe(false);
    expect(document.activeElement).toBe(finish);
  });

  it("moves focus to Next when Previous becomes disabled", () => {
    const { root } = renderTour();
    const tabs = createTabs(root);
    const tour = new A11yTabsTour(tabs);

    tour.start();
    getControl(root, "Next").click();
    const previous = getControl(root, "Previous");
    previous.focus();
    previous.click();

    expect(previous.disabled).toBe(true);
    expect(document.activeElement).toBe(getControl(root, "Next"));
  });

  it("restores focus to the launcher when Escape skips the tour", () => {
    const { root, start } = renderTour();
    const tabs = createTabs(root);
    const tour = new A11yTabsTour(tabs);

    start.focus();
    tour.start();
    const next = getControl(root, "Next");
    next.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );

    expect(document.activeElement).toBe(start);
    expect(root.querySelector<HTMLElement>("[data-a11y-tabs-tour-popover]")?.hidden).toBe(
      true
    );
  });

  it("does not steal focus when the tour is finished programmatically", () => {
    const { root, start } = renderTour();
    const tabs = createTabs(root);
    const tour = new A11yTabsTour(tabs);

    start.focus();
    tour.start();
    const activeTab = tabs.getActiveTab();
    activeTab?.focus();
    tour.finish();

    expect(document.activeElement).toBe(activeTab);
  });

  it("honors focusOnStep when a consumer opts into tab focus", () => {
    const { root } = renderTour();
    const tabs = createTabs(root);
    const tour = new A11yTabsTour(tabs, { focusOnStep: true });

    tour.start();
    getControl(root, "Next").click();

    expect(document.activeElement).toBe(tabs.getActiveTab());
  });
});
