import {
  getTabs,
  resolveElement,
  resolveRoot,
  resolveTabs,
  type TabsTarget
} from "./shared.js";
import type { TabsInstance } from "../index.js";

type ElementTarget = HTMLElement | string;
type PreferTarget = "panel" | "tab";
type TourEventName = "start" | "change" | "skip" | "finish";

export interface TourSelectors {
  popover: string;
  title: string;
  description: string;
  progress: string;
  previous: string;
  next: string;
  skip: string;
  finish: string;
}

export interface TourClassNames {
  popover: string;
  actions: string;
  title: string;
  description: string;
  progress: string;
  activeTarget: string;
}

export interface TourStepConfig {
  title?: string;
  text?: string;
  description?: string;
  index?: number;
  tabIndex?: number;
  tab?: ElementTarget;
  panel?: ElementTarget;
  panelId?: string;
  tabId?: string;
  target?: ElementTarget;
}

interface TourStep extends TourStepConfig {
  text?: string;
  fallbackIndex: number;
}

type TourStepInput = string | TourStepConfig;

interface TourElements {
  title?: HTMLElement | null;
  description?: HTMLElement | null;
  progress?: HTMLElement | null;
  previous?: HTMLButtonElement | null;
  next?: HTMLButtonElement | null;
  skip?: HTMLButtonElement | null;
  finish?: HTMLButtonElement | null;
}

export interface TourContext {
  tour: A11yTabsTour;
  tabs: TabsInstance;
  root: HTMLElement;
  active: boolean;
  index: number;
  step: TourStep | null;
  total: number;
  tab: HTMLElement | null;
  panel: HTMLElement | null;
}

export interface A11yTabsTourOptions {
  steps?: ReadonlyArray<TourStepInput>;
  popover?: ElementTarget | false;
  selectors?: Partial<TourSelectors>;
  classNames?: Partial<TourClassNames>;
  preferTarget?: PreferTarget;
  autoStart?: boolean;
  focusOnStart?: boolean;
  focusOnStep?: boolean;
  destroyPopover?: boolean;
  onStart?: (context: TourContext) => void;
  onChange?: (context: TourContext) => void;
  onSkip?: (context: TourContext) => void;
  onFinish?: (context: TourContext) => void;
}

interface NormalizedTourOptions {
  steps?: ReadonlyArray<TourStepInput>;
  popover?: ElementTarget | false;
  selectors: TourSelectors;
  classNames: TourClassNames;
  preferTarget: PreferTarget;
  autoStart: boolean;
  focusOnStart: boolean;
  focusOnStep: boolean;
  destroyPopover: boolean;
  onStart?: (context: TourContext) => void;
  onChange?: (context: TourContext) => void;
  onSkip?: (context: TourContext) => void;
  onFinish?: (context: TourContext) => void;
}

const DEFAULT_SELECTORS = Object.freeze({
  popover: "[data-a11y-tabs-tour-popover]",
  title: "[data-a11y-tabs-tour-title]",
  description: "[data-a11y-tabs-tour-description]",
  progress: "[data-a11y-tabs-tour-progress]",
  previous: "[data-a11y-tabs-tour-previous]",
  next: "[data-a11y-tabs-tour-next]",
  skip: "[data-a11y-tabs-tour-skip]",
  finish: "[data-a11y-tabs-tour-finish]"
} satisfies TourSelectors);

const DEFAULT_CLASS_NAMES = Object.freeze({
  popover: "a11y-tabs-tour",
  actions: "a11y-tabs-tour__actions",
  title: "a11y-tabs-tour__title",
  description: "a11y-tabs-tour__description",
  progress: "a11y-tabs-tour__progress",
  activeTarget: "a11y-tabs-tour-target"
} satisfies TourClassNames);

/**
 * Lightweight guided tour add-on for A11yTabs.
 *
 * The controller activates tabs in sequence and renders optional, keyboard
 * accessible controls near the active panel or tab. Consumers may provide their
 * own popover markup or disable rendering and listen to tour events instead.
 */
class A11yTabsTour {
  private readonly tabs: TabsInstance;
  private readonly root: HTMLElement;
  private readonly options: NormalizedTourOptions;
  private readonly steps: TourStep[];
  private currentIndex = -1;
  private active = false;
  private generatedPopover = false;
  private destroyed = false;
  private activeTarget: HTMLElement | null = null;
  private returnFocusTarget: HTMLElement | null = null;
  private popover: HTMLElement | null;
  private elements: TourElements;

  private readonly handlePrevious = this.previous.bind(this);
  private readonly handleNext = this.next.bind(this);
  private readonly handleSkip = this.skip.bind(this);
  private readonly handleFinish = this.finish.bind(this);
  private readonly handleKeydown = this.onKeydown.bind(this);
  private readonly handleDestroy = this.destroy.bind(this);

  constructor(target: TabsTarget, options: A11yTabsTourOptions = {}) {
    this.tabs = resolveTabs(target, "A11yTabsTour");
    this.root = resolveRoot(target, this.tabs, "A11yTabsTour");
    this.options = {
      ...options,
      selectors: { ...DEFAULT_SELECTORS, ...options.selectors },
      classNames: { ...DEFAULT_CLASS_NAMES, ...options.classNames },
      preferTarget: options.preferTarget ?? "panel",
      autoStart: options.autoStart ?? false,
      focusOnStart: options.focusOnStart ?? true,
      focusOnStep: options.focusOnStep ?? false,
      destroyPopover: options.destroyPopover ?? true
    };

    this.steps = this.normalizeSteps(this.options.steps);
    this.popover = this.resolvePopover(this.options.popover);
    this.elements = this.resolveElements();
    this.bindControls();
    this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
    this.setPopoverVisible(false);

    if (this.options.autoStart) {
      this.start();
    }
  }

  start(index = 0): boolean {
    if (this.destroyed) return false;
    if (this.steps.length === 0) return false;

    const normalized = this.normalizeIndex(index);
    if (!this.active) {
      this.returnFocusTarget = this.getFocusReturnTarget();
    }
    this.active = true;
    this.setPopoverVisible(true);
    const changed = this.goTo(normalized);

    if (!changed) {
      this.active = false;
      this.setPopoverVisible(false);
      this.returnFocusTarget = null;
      return false;
    }

    if (this.options.focusOnStart) {
      this.elements.next?.focus();
    }

    this.emit("start");
    return true;
  }

  goTo(index: number): boolean {
    if (this.destroyed) return false;
    if (!Number.isInteger(index) || index < 0 || index >= this.steps.length) {
      return false;
    }

    const step = this.steps[index];
    if (!step) return false;

    const focusedTourControl = this.getFocusedTourControl();
    const tabIndex = this.stepTabIndex(step, index);
    const activated = this.tabs.activate(tabIndex);

    if (!activated) return false;

    this.currentIndex = index;
    this.render();

    if (this.options.focusOnStep) {
      this.tabs.getActiveTab()?.focus();
    } else {
      this.restoreTourControlFocus(focusedTourControl);
    }

    this.emit("change");
    return true;
  }

  next(): boolean {
    if (this.destroyed) return false;
    if (!this.active) return this.start();
    if (this.currentIndex >= this.steps.length - 1) return this.finish();
    return this.goTo(this.currentIndex + 1);
  }

  previous(): boolean {
    if (this.destroyed) return false;
    if (!this.active) return this.start();
    return this.goTo(Math.max(this.currentIndex - 1, 0));
  }

  skip(): boolean {
    if (this.destroyed) return false;
    if (!this.active) return false;
    this.stop("skip");
    return true;
  }

  finish(): boolean {
    if (this.destroyed) return false;
    if (!this.active) return false;
    this.stop("finish");
    return true;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const shouldRestoreFocus = this.popover?.contains(document.activeElement) ?? false;

    this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
    this.unbindControls();
    this.clearTarget();
    this.active = false;
    this.setPopoverVisible(false);
    if (shouldRestoreFocus) {
      this.restoreFocus(this.returnFocusTarget);
    }
    this.returnFocusTarget = null;
    if (this.generatedPopover && this.options.destroyPopover) {
      this.popover?.remove();
    }
  }

  private render(): void {
    if (!this.popover) return;

    const step = this.steps[this.currentIndex];
    if (!step) return;

    const total = this.steps.length;
    const isLast = this.currentIndex === total - 1;

    this.setText(this.elements.title, step.title || `Step ${this.currentIndex + 1}`);
    this.setText(this.elements.description, step.text || step.description || "");
    this.setText(this.elements.progress, `${this.currentIndex + 1} of ${total}`);

    if (this.elements.previous) this.elements.previous.disabled = this.currentIndex === 0;
    if (this.elements.next) this.elements.next.hidden = isLast;
    if (this.elements.finish) this.elements.finish.hidden = !isLast;

    this.placePopover(step);
  }

  private placePopover(step: TourStep): void {
    const target = this.getStepTarget(step);
    this.clearTarget();
    this.activeTarget = target;
    target?.classList.add(this.options.classNames.activeTarget);

    if (!target || !this.generatedPopover || !this.popover) return;

    target.insertAdjacentElement("afterend", this.popover);
  }

  private stop(reason: "skip" | "finish"): void {
    const returnFocusTarget = this.returnFocusTarget;
    const shouldRestoreFocus = this.popover?.contains(document.activeElement) ?? false;
    this.returnFocusTarget = null;
    this.active = false;
    this.setPopoverVisible(false);
    this.clearTarget();
    if (shouldRestoreFocus) {
      this.restoreFocus(returnFocusTarget);
    }
    this.emit(reason);
  }

  private normalizeSteps(steps: ReadonlyArray<TourStepInput> | undefined): TourStep[] {
    const tabs = this.getTabs();
    const source =
      Array.isArray(steps) && steps.length > 0
        ? steps
        : tabs.map((tab) => ({
            tab,
            text: tab.textContent?.trim() ?? ""
          }));

    return source.map((step, index) => {
      if (typeof step === "string") {
        return { text: step, fallbackIndex: index };
      }
      return { fallbackIndex: index, ...step };
    });
  }

  private stepTabIndex(step: TourStep, fallbackIndex: number): number {
    if (typeof step.index === "number" && Number.isInteger(step.index)) {
      return step.index;
    }
    if (typeof step.tabIndex === "number" && Number.isInteger(step.tabIndex)) {
      return step.tabIndex;
    }

    const tabs = this.getTabs();
    const byTab = resolveElement(step.tab, document);
    if (byTab) return tabs.indexOf(byTab);

    const byPanel = resolveElement(step.panel, document);
    if (byPanel) {
      return tabs.findIndex(
        (tab) =>
          tab.getAttribute("aria-controls") === byPanel.id ||
          tab.dataset.tabTarget === byPanel.id
      );
    }

    if (step.panelId) {
      return tabs.findIndex(
        (tab) =>
          tab.dataset.tabTarget === step.panelId ||
          tab.getAttribute("aria-controls") === step.panelId
      );
    }

    if (step.tabId) return tabs.findIndex((tab) => tab.id === step.tabId);

    return Number.isInteger(step.fallbackIndex) ? step.fallbackIndex : fallbackIndex;
  }

  private getStepTarget(step: TourStep): HTMLElement | null {
    const activeTab = this.tabs.getActiveTab();
    const activePanel = this.tabs.getActivePanel();
    const explicitTarget = resolveElement(step.target, document);

    if (explicitTarget) return explicitTarget;
    if (this.options.preferTarget === "tab") return activeTab || activePanel;
    return activePanel || activeTab;
  }

  private resolvePopover(
    popoverOption: ElementTarget | false | undefined
  ): HTMLElement | null {
    if (popoverOption === false) return null;

    const existing =
      resolveElement(popoverOption, document) ??
      this.root.querySelector<HTMLElement>(this.options.selectors.popover);
    if (existing) return existing;

    this.generatedPopover = true;
    const popover = document.createElement("section");
    popover.className = this.options.classNames.popover;
    popover.setAttribute("data-a11y-tabs-tour-popover", "");
    popover.setAttribute("role", "group");
    popover.setAttribute("aria-label", "Tab walkthrough");
    popover.innerHTML = `
      <p class="${this.options.classNames.progress}" data-a11y-tabs-tour-progress></p>
      <h3 class="${this.options.classNames.title}" data-a11y-tabs-tour-title></h3>
      <p class="${this.options.classNames.description}" data-a11y-tabs-tour-description></p>
      <div class="${this.options.classNames.actions}">
        <button type="button" data-a11y-tabs-tour-previous>Previous</button>
        <button type="button" data-a11y-tabs-tour-next>Next</button>
        <button type="button" data-a11y-tabs-tour-finish>Finish</button>
        <button type="button" data-a11y-tabs-tour-skip>Skip</button>
      </div>`;
    this.root.append(popover);
    return popover;
  }

  private resolveElements(): TourElements {
    if (!this.popover) return {};
    const selectors = this.options.selectors;
    return {
      title: this.popover.querySelector<HTMLElement>(selectors.title),
      description: this.popover.querySelector<HTMLElement>(selectors.description),
      progress: this.popover.querySelector<HTMLElement>(selectors.progress),
      previous: this.popover.querySelector<HTMLButtonElement>(selectors.previous),
      next: this.popover.querySelector<HTMLButtonElement>(selectors.next),
      skip: this.popover.querySelector<HTMLButtonElement>(selectors.skip),
      finish: this.popover.querySelector<HTMLButtonElement>(selectors.finish)
    };
  }

  private bindControls(): void {
    this.popover?.addEventListener("keydown", this.handleKeydown);
    this.elements.previous?.addEventListener("click", this.handlePrevious);
    this.elements.next?.addEventListener("click", this.handleNext);
    this.elements.skip?.addEventListener("click", this.handleSkip);
    this.elements.finish?.addEventListener("click", this.handleFinish);
  }

  private unbindControls(): void {
    this.popover?.removeEventListener("keydown", this.handleKeydown);
    this.elements.previous?.removeEventListener("click", this.handlePrevious);
    this.elements.next?.removeEventListener("click", this.handleNext);
    this.elements.skip?.removeEventListener("click", this.handleSkip);
    this.elements.finish?.removeEventListener("click", this.handleFinish);
  }

  private onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.skip();
    }
  }

  private emit(name: TourEventName): void {
    const context = this.context();
    const callback = this.getCallback(name);
    callback?.(context);
    this.root.dispatchEvent(
      new CustomEvent(`a11y-tabs-tour:${name}`, {
        bubbles: true,
        detail: context
      })
    );
  }

  private getCallback(
    name: TourEventName
  ): ((context: TourContext) => void) | undefined {
    if (name === "start") return this.options.onStart;
    if (name === "change") return this.options.onChange;
    if (name === "skip") return this.options.onSkip;
    return this.options.onFinish;
  }

  private context(): TourContext {
    return {
      tour: this,
      tabs: this.tabs,
      root: this.root,
      active: this.active,
      index: this.currentIndex,
      step: this.steps[this.currentIndex] ?? null,
      total: this.steps.length,
      tab: this.tabs.getActiveTab(),
      panel: this.tabs.getActivePanel()
    };
  }

  private normalizeIndex(index: number): number {
    return Math.min(Math.max(index, 0), this.steps.length - 1);
  }

  private setPopoverVisible(visible: boolean): void {
    if (this.popover) this.popover.hidden = !visible;
  }

  private getFocusReturnTarget(): HTMLElement | null {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) return null;
    if (activeElement === document.body || this.popover?.contains(activeElement)) {
      return null;
    }
    return activeElement;
  }

  private getFocusedTourControl(): HTMLElement | null {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) return null;
    return this.popover?.contains(activeElement) ? activeElement : null;
  }

  private restoreTourControlFocus(control: HTMLElement | null): void {
    if (!control || document.activeElement === control) return;

    const fallbackControls =
      control === this.elements.next
        ? [this.elements.finish, this.elements.previous, this.elements.skip]
        : [
            this.elements.next,
            this.elements.finish,
            this.elements.previous,
            this.elements.skip
          ];

    const target = this.isAvailableFocusTarget(control)
      ? control
      : fallbackControls.find((candidate) => this.isAvailableFocusTarget(candidate));

    target?.focus();
  }

  private restoreFocus(target: HTMLElement | null): void {
    if (this.isAvailableFocusTarget(target)) {
      target.focus();
    }
  }

  private isAvailableFocusTarget(
    target: HTMLElement | null | undefined
  ): target is HTMLElement {
    if (!target?.isConnected || target.closest("[hidden]")) return false;
    if (target.getAttribute("aria-disabled") === "true") return false;
    return !(target instanceof HTMLButtonElement && target.disabled);
  }

  private clearTarget(): void {
    this.activeTarget?.classList.remove(this.options.classNames.activeTarget);
    this.activeTarget = null;
  }

  private getTabs(): HTMLElement[] {
    return getTabs(this.root);
  }

  private setText(
    element: HTMLElement | null | undefined,
    value: string | number
  ): void {
    if (element) element.textContent = String(value);
  }
}

export default A11yTabsTour;
export { A11yTabsTour };
