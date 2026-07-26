import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTabs } from "../src/index";
import { A11yTabsStepper } from "../src/addons/a11y-tabs-stepper";
import { A11yTabsTour } from "../src/addons/a11y-tabs-tour";
import { A11yTabsUnsavedGuard } from "../src/addons/a11y-tabs-unsaved-guard";

function renderTabs(): HTMLElement {
  document.body.innerHTML = `
    <div class="a11y-tabs" data-a11y-tabs>
      <div class="a11y-tabs__list" data-a11y-tabs-list aria-label="Account setup">
        <button class="a11y-tabs__tab" type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="profile">Profile</button>
        <button class="a11y-tabs__tab" type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="security">Security</button>
        <button class="a11y-tabs__tab" type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="billing">Billing</button>
      </div>
      <section class="a11y-tabs__panel" id="profile" data-a11y-tabs-panel>
        <label>Name <input name="name" value="Ada" /></label>
      </section>
      <section class="a11y-tabs__panel" id="security" data-a11y-tabs-panel hidden>
        <h2>Security</h2>
      </section>
      <section class="a11y-tabs__panel" id="billing" data-a11y-tabs-panel hidden>
        <h2>Billing</h2>
      </section>
    </div>
  `;

  const root = document.querySelector("[data-a11y-tabs]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Test markup did not render a tabs root.");
  }

  return root;
}

function renderStepper(): HTMLElement {
  const stepper = document.createElement("div");
  stepper.innerHTML = `
    <span data-a11y-tabs-stepper-current></span>
    <span data-a11y-tabs-stepper-total></span>
    <span data-a11y-tabs-stepper-completed></span>
    <button type="button" data-a11y-tabs-stepper-previous>Previous</button>
    <button type="button" data-a11y-tabs-stepper-next>Next</button>
  `;
  document.body.prepend(stepper);
  return stepper;
}

describe("add-on lifecycle cleanup", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("removes Stepper button listeners when the core tabs instance is destroyed", () => {
    const root = renderTabs();
    const stepper = renderStepper();
    const tabs = createTabs(root);
    new A11yTabsStepper(tabs, { stepper });

    const next = stepper.querySelector<HTMLButtonElement>(
      "[data-a11y-tabs-stepper-next]"
    );
    const securityPanel = document.getElementById("security");

    expect(next).not.toBeNull();
    tabs.destroy();
    next?.click();

    expect(securityPanel?.hasAttribute("hidden")).toBe(true);
    expect(securityPanel?.getAttribute("role")).toBeNull();
  });

  it("removes Tour targets and generated popovers when the core tabs instance is destroyed", () => {
    const root = renderTabs();
    const tabs = createTabs(root);
    const tour = new A11yTabsTour(tabs);

    expect(tour.start()).toBe(true);
    expect(root.querySelector("[data-a11y-tabs-tour-popover]")).not.toBeNull();
    expect(root.querySelector(".a11y-tabs-tour-target")).not.toBeNull();

    tabs.destroy();

    expect(root.querySelector("[data-a11y-tabs-tour-popover]")).toBeNull();
    expect(root.querySelector(".a11y-tabs-tour-target")).toBeNull();
    expect(tour.start()).toBe(false);
  });

  it("clears UnsavedGuard dirty state and listeners when the core tabs instance is destroyed", () => {
    const root = renderTabs();
    const tabs = createTabs(root);
    new A11yTabsUnsavedGuard(tabs);

    const input = root.querySelector<HTMLInputElement>('input[name="name"]');
    const profilePanel = document.getElementById("profile");

    expect(input).not.toBeNull();
    if (!input) return;

    input.value = "Grace";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(profilePanel?.dataset.a11yTabsDirty).toBe("true");

    tabs.destroy();
    input.value = "Katherine";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(profilePanel?.dataset.a11yTabsDirty).toBeUndefined();
  });
});
