import {
  getPanels,
  getTabsEventDetail,
  resolveRoot,
  resolveTabs,
  type TabsTarget
} from "./shared.js";
import type { TabsInstance } from "../index.js";

type GuardField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type GuardDecision = boolean | Promise<boolean>;

export interface UnsavedGuardContext {
  guard: A11yTabsUnsavedGuard;
  tabs: TabsInstance;
  root: HTMLElement;
  activePanel: HTMLElement;
  nextTab: HTMLElement | null;
  nextPanel: HTMLElement | null;
  nextIndex: number;
  previousIndex: number;
  dirtyFields: GuardField[];
  event: Event;
}

export interface A11yTabsUnsavedGuardOptions {
  fieldSelector?: string;
  message?: string | ((context: UnsavedGuardContext) => string);
  confirm?: ((context: UnsavedGuardContext) => GuardDecision) | null;
  modal?: ((context: UnsavedGuardContext) => GuardDecision) | null;
  resetOnSubmit?: boolean;
}

interface NormalizedUnsavedGuardOptions {
  fieldSelector: string;
  message: string | ((context: UnsavedGuardContext) => string);
  confirm: ((context: UnsavedGuardContext) => GuardDecision) | null;
  modal: ((context: UnsavedGuardContext) => GuardDecision) | null;
  resetOnSubmit: boolean;
}

const DEFAULT_FIELD_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="hidden"])',
  "textarea",
  "select"
].join(",");

const DEFAULT_OPTIONS = Object.freeze({
  fieldSelector: DEFAULT_FIELD_SELECTOR,
  message: "You have unsaved changes. Leave this tab anyway?",
  confirm: null,
  modal: null,
  resetOnSubmit: true
} satisfies NormalizedUnsavedGuardOptions);

/**
 * Optional add-on that prevents leaving a dirty tab panel without confirmation.
 *
 * The add-on listens to the core cancellable `a11y-tabs:before-change` event,
 * so it does not need to modify A11yTabs itself. Confirmation can be handled by
 * native `confirm()`, a custom callback, or an async custom modal hook.
 */
class A11yTabsUnsavedGuard {
  private readonly tabs: TabsInstance;
  private readonly root: HTMLElement;
  private readonly options: NormalizedUnsavedGuardOptions;
  private readonly initialValues = new WeakMap<GuardField, string>();
  private readonly dirtyPanels = new Set<HTMLElement>();
  private pendingIndex: number | null = null;
  private confirmationPending = false;
  private allowNextChange = false;
  private destroyed = false;

  private readonly handleTrackField = this.trackField.bind(this);
  private readonly handleBeforeChange = this.onBeforeChange.bind(this);
  private readonly handleReset = this.onReset.bind(this);
  private readonly handleSubmit = this.onSubmit.bind(this);
  private readonly handleDestroy = this.destroy.bind(this);

  constructor(target: TabsTarget, options: A11yTabsUnsavedGuardOptions = {}) {
    this.tabs = resolveTabs(target, "A11yTabsUnsavedGuard");
    this.root = resolveRoot(target, this.tabs, "A11yTabsUnsavedGuard");
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.snapshotFields();
    this.root.addEventListener("input", this.handleTrackField);
    this.root.addEventListener("change", this.handleTrackField);
    this.root.addEventListener("reset", this.handleReset);
    this.root.addEventListener("submit", this.handleSubmit);
    this.root.addEventListener("a11y-tabs:before-change", this.handleBeforeChange);
    this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
  }

  /** Whether a panel, or any panel, has dirty fields. */
  isDirty(panel: HTMLElement | null = null): boolean {
    if (panel) return this.dirtyPanels.has(panel);
    return this.dirtyPanels.size > 0;
  }

  /** Mark fields in one panel, or all panels, as clean from their current values. */
  markClean(panel: HTMLElement | null = null): void {
    const panels = panel ? [panel] : this.getPanels();

    panels.forEach((currentPanel) => {
      this.getFields(currentPanel).forEach((field) => {
        this.initialValues.set(field, this.getFieldValue(field));
      });
      this.setPanelDirty(currentPanel, false);
    });
  }

  /** Remove all listeners and tracked state. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.root.removeEventListener("input", this.handleTrackField);
    this.root.removeEventListener("change", this.handleTrackField);
    this.root.removeEventListener("reset", this.handleReset);
    this.root.removeEventListener("submit", this.handleSubmit);
    this.root.removeEventListener(
      "a11y-tabs:before-change",
      this.handleBeforeChange
    );
    this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
    this.dirtyPanels.forEach((panel) => {
      delete panel.dataset.a11yTabsDirty;
    });
    this.dirtyPanels.clear();
    this.pendingIndex = null;
    this.confirmationPending = false;
    this.allowNextChange = false;
  }

  private onBeforeChange(event: Event): void {
    if (this.destroyed) return;

    if (this.allowNextChange) {
      this.allowNextChange = false;
      return;
    }

    if (this.confirmationPending) {
      event.preventDefault();
      return;
    }

    const activePanel = this.tabs.getActivePanel();
    if (!activePanel || !this.isDirty(activePanel)) return;

    const detail = getTabsEventDetail(event);
    const context: UnsavedGuardContext = {
      guard: this,
      tabs: this.tabs,
      root: this.root,
      activePanel,
      nextTab: detail.tab ?? null,
      nextPanel: detail.panel ?? null,
      nextIndex: detail.index ?? -1,
      previousIndex: detail.previousIndex ?? -1,
      dirtyFields: this.getDirtyFields(activePanel),
      event
    };

    const decision = this.requestConfirmation(context);

    if (decision instanceof Promise) {
      event.preventDefault();
      this.pendingIndex = context.nextIndex;
      this.confirmationPending = true;
      decision
        .then((allowed) => this.continueIfAllowed(Boolean(allowed)))
        .catch(() => this.continueIfAllowed(false));
      return;
    }

    if (!decision) {
      event.preventDefault();
    }
  }

  private requestConfirmation(context: UnsavedGuardContext): GuardDecision {
    if (typeof this.options.modal === "function") {
      return this.options.modal(context);
    }

    if (typeof this.options.confirm === "function") {
      return this.options.confirm(context);
    }

    const message =
      typeof this.options.message === "function"
        ? this.options.message(context)
        : this.options.message;

    return window.confirm(message);
  }

  private continueIfAllowed(allowed: boolean): void {
    if (this.destroyed) return;

    const index = this.pendingIndex;
    this.pendingIndex = null;
    this.confirmationPending = false;

    if (!allowed || typeof index !== "number" || !Number.isInteger(index)) return;

    this.allowNextChange = true;
    this.tabs.activate(index);
  }

  private trackField(event: Event): void {
    if (this.destroyed) return;

    const field = event.target;
    if (!this.isTrackableField(field)) return;

    if (!this.initialValues.has(field)) {
      this.initialValues.set(field, this.getFieldValue(field));
    }

    const panel = field.closest<HTMLElement>(
      "[data-a11y-tabs-panel], [data-tab-panel]"
    );
    if (panel) {
      this.setPanelDirty(panel, this.getDirtyFields(panel).length > 0);
    }
  }

  private onReset(event: Event): void {
    if (this.destroyed) return;
    if (!(event.target instanceof Element)) return;

    const panel = event.target.closest<HTMLElement>(
      "[data-a11y-tabs-panel], [data-tab-panel]"
    );
    if (!panel) return;

    window.setTimeout(() => {
      if (this.destroyed) return;
      this.getFields(panel).forEach((field) => {
        this.initialValues.set(field, this.getFieldValue(field));
      });
      this.setPanelDirty(panel, false);
    });
  }

  private onSubmit(event: Event): void {
    if (this.destroyed) return;
    if (!this.options.resetOnSubmit) return;
    if (!(event.target instanceof Element)) return;

    const panel = event.target.closest<HTMLElement>(
      "[data-a11y-tabs-panel], [data-tab-panel]"
    );
    if (panel) this.markClean(panel);
  }

  private snapshotFields(): void {
    this.getPanels().forEach((panel) => {
      this.getFields(panel).forEach((field) => {
        this.initialValues.set(field, this.getFieldValue(field));
      });
      this.setPanelDirty(panel, false);
    });
  }

  private getDirtyFields(panel: HTMLElement): GuardField[] {
    return this.getFields(panel).filter(
      (field) => this.initialValues.get(field) !== this.getFieldValue(field)
    );
  }

  private getFields(panel: HTMLElement): GuardField[] {
    return Array.from(panel.querySelectorAll(this.options.fieldSelector)).filter(
      (field): field is GuardField => this.isTrackableField(field)
    );
  }

  private getPanels(): HTMLElement[] {
    return getPanels(this.root);
  }

  private setPanelDirty(panel: HTMLElement, isDirty: boolean): void {
    if (isDirty) {
      this.dirtyPanels.add(panel);
      panel.dataset.a11yTabsDirty = "true";
    } else {
      this.dirtyPanels.delete(panel);
      delete panel.dataset.a11yTabsDirty;
    }
  }

  private getFieldValue(field: GuardField): string {
    if (field instanceof HTMLInputElement) {
      if (field.type === "checkbox" || field.type === "radio") {
        return field.checked ? "checked" : "unchecked";
      }
      if (field.type === "file") {
        return Array.from(field.files || [])
          .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
          .join("|");
      }
    }

    if (field instanceof HTMLSelectElement && field.multiple) {
      return Array.from(field.selectedOptions)
        .map((option) => option.value)
        .join("|");
    }

    return field.value;
  }

  private isTrackableField(field: EventTarget | null): field is GuardField {
    if (
      !(
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement ||
        field instanceof HTMLSelectElement
      )
    ) {
      return false;
    }

    const isReadOnly =
      field instanceof HTMLSelectElement ? false : field.readOnly;

    return (
      !field.disabled &&
      !isReadOnly &&
      field.matches(this.options.fieldSelector)
    );
  }
}

export default A11yTabsUnsavedGuard;
export { A11yTabsUnsavedGuard };
