import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTabs } from "../src/index";
import { A11yTabsValidation } from "../src/addons/a11y-tabs-validation";

function renderValidationTabs(): HTMLElement {
  document.body.innerHTML = `
    <div class="a11y-tabs" data-a11y-tabs>
      <div class="a11y-tabs__list" data-a11y-tabs-list aria-label="Checkout sections">
        <button class="a11y-tabs__tab" type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="contact">Contact</button>
        <button class="a11y-tabs__tab" type="button" data-a11y-tabs-tab data-a11y-tabs-panel-id="shipping">Shipping</button>
      </div>
      <section class="a11y-tabs__panel" id="contact" data-a11y-tabs-panel>
        <label>Email <input name="email" required /></label>
      </section>
      <section class="a11y-tabs__panel" id="shipping" data-a11y-tabs-panel hidden>
        <label>ZIP <input name="zip" pattern="[0-9]{5}" required /></label>
      </section>
    </div>
  `;

  const root = document.querySelector("[data-a11y-tabs]");
  if (!(root instanceof HTMLElement)) {
    throw new Error("Test markup did not render a tabs root.");
  }

  return root;
}

describe("A11yTabsValidation", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("marks invalid tabs without firing native invalid events during default checks", () => {
    const root = renderValidationTabs();
    const tabs = createTabs(root);
    const input = root.querySelector<HTMLInputElement>('input[name="email"]');

    expect(input).not.toBeNull();
    const checkValidity = vi.spyOn(input as HTMLInputElement, "checkValidity");

    new A11yTabsValidation(tabs);

    expect(checkValidity).not.toHaveBeenCalled();
    expect(
      root
        .querySelector('[aria-controls="contact"]')
        ?.classList.contains("a11y-tabs__tab--error")
    ).toBe(true);
  });

  it("keeps generated descriptions outside the tablist owned subtree", () => {
    const root = renderValidationTabs();
    const tabs = createTabs(root);

    new A11yTabsValidation(tabs);

    const list = root.querySelector<HTMLElement>('[role="tablist"]');
    const tabChildren = Array.from(list?.children ?? []);
    const descriptions = Array.from(
      root.querySelectorAll<HTMLElement>(".a11y-tabs__validation-description")
    );

    expect(
      tabChildren.every((child) => child.getAttribute("role") === "tab")
    ).toBe(true);
    expect(descriptions).toHaveLength(2);
    expect(
      descriptions.every(
        (description) => description.closest('[role="tablist"]') === null
      )
    ).toBe(true);
    expect(
      root
        .querySelector('[aria-controls="contact"]')
        ?.getAttribute("aria-describedby")
    ).toContain(descriptions[0].id);
    expect(
      root
        .querySelector('[aria-controls="contact"]')
        ?.hasAttribute("aria-invalid")
    ).toBe(false);
  });

  it("does not recurse when custom validation dispatches native invalid events", () => {
    const root = renderValidationTabs();
    const tabs = createTabs(root);
    const input = root.querySelector<HTMLInputElement>('input[name="email"]');

    if (!input) throw new Error("Expected email input.");

    const checkValidity = vi.spyOn(input, "checkValidity").mockImplementation(() => {
      input.dispatchEvent(new Event("invalid", { cancelable: true }));
      return false;
    });

    const validation = new A11yTabsValidation(tabs, {
      fieldSelector: 'input[name="email"]',
      validate: (field) => field.checkValidity()
    });

    expect(checkValidity.mock.calls.length).toBeLessThanOrEqual(2);
    expect(validation.hasInvalid()).toBe(true);
    expect(
      root.querySelector('[aria-controls="contact"] .a11y-tabs__badge')?.textContent
    ).toBe("1");
  });
});
