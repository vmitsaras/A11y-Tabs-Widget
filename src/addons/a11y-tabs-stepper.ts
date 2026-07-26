import {
  getTabs,
  resolveElement,
  resolveRoot,
  resolveTabs,
  type TabsTarget
} from "./shared.js";
import type { TabsInstance } from "../index.js";

type ElementTarget = HTMLElement | string;

export interface StepperSelectors {
  root: string;
  current: string;
  total: string;
  completed: string;
  previous: string;
  next: string;
}

export interface StepperElementsOptions {
  current?: ElementTarget;
  total?: ElementTarget;
  completed?: ElementTarget;
  previous?: ElementTarget;
  next?: ElementTarget;
}

interface StepperElements {
  current: HTMLElement | null;
  total: HTMLElement | null;
  completed: HTMLElement | null;
  previous: HTMLButtonElement | null;
  next: HTMLButtonElement | null;
}

export interface StepperContext {
  activeTab: HTMLElement | null;
  activePanel: HTMLElement | null;
  index: number;
  current: number;
  total: number;
  completed: number;
}

export interface A11yTabsStepperOptions {
  stepper?: ElementTarget;
  elements?: StepperElementsOptions;
  selectors?: Partial<StepperSelectors>;
  disableAtEnds?: boolean;
  formatCompleted?: (context: StepperContext) => string;
}

interface NormalizedStepperOptions {
  stepper?: ElementTarget;
  elements?: StepperElementsOptions;
  selectors: StepperSelectors;
  disableAtEnds: boolean;
  formatCompleted: (context: StepperContext) => string;
}

const DEFAULT_SELECTORS = Object.freeze({
  root: "[data-a11y-tabs-stepper]",
  current: "[data-a11y-tabs-stepper-current]",
  total: "[data-a11y-tabs-stepper-total]",
  completed: "[data-a11y-tabs-stepper-completed]",
  previous: "[data-a11y-tabs-stepper-previous]",
  next: "[data-a11y-tabs-stepper-next]"
} satisfies StepperSelectors);

/**
 * Optional add-on that mirrors an A11yTabs instance into external stepper UI.
 *
 * The add-on only controls tabs through A11yTabs' public methods:
 * getActiveTab(), getActivePanel(), next(), previous(), and activate(index).
 */
class A11yTabsStepper {
  private readonly tabs: TabsInstance;
  private readonly root: HTMLElement;
  private readonly options: NormalizedStepperOptions;
  private readonly stepper: HTMLElement | null;
  private readonly elements: StepperElements;
  private destroyed = false;

  private readonly handleUpdate = this.update.bind(this);
  private readonly handlePrevious = this.previous.bind(this);
  private readonly handleNext = this.next.bind(this);
  private readonly handleDestroy = this.destroy.bind(this);

  constructor(target: TabsTarget, options: A11yTabsStepperOptions = {}) {
    this.tabs = resolveTabs(target, "A11yTabsStepper");
    this.root = resolveRoot(target, this.tabs, "A11yTabsStepper");
    this.options = {
      ...options,
      selectors: { ...DEFAULT_SELECTORS, ...options.selectors },
      disableAtEnds: options.disableAtEnds !== false,
      formatCompleted:
        options.formatCompleted ??
        (({ completed, total }) => `${completed} of ${total} completed`)
    };

    this.stepper =
      resolveElement(this.options.stepper, document) ??
      document.querySelector<HTMLElement>(this.options.selectors.root);
    this.elements = this.resolveElements(this.options.elements ?? {});

    this.root.addEventListener("a11y-tabs:change", this.handleUpdate);
    this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
    this.elements.previous?.addEventListener("click", this.handlePrevious);
    this.elements.next?.addEventListener("click", this.handleNext);

    this.update();
  }

  update(): StepperContext {
    const activeTab = this.tabs.getActiveTab();
    const activePanel = this.tabs.getActivePanel();
    const tabs = this.getTabs();
    const index = activeTab ? tabs.indexOf(activeTab) : -1;
    const current = index + 1;
    const total = tabs.length;
    const completed = Math.max(index, 0);
    const context: StepperContext = {
      activeTab,
      activePanel,
      index,
      current,
      total,
      completed
    };

    this.setText(this.elements.current, current || "");
    this.setText(this.elements.total, total);
    this.setText(
      this.elements.completed,
      this.options.formatCompleted(context)
    );

    if (this.options.disableAtEnds) {
      if (this.elements.previous) this.elements.previous.disabled = index <= 0;
      if (this.elements.next) {
        this.elements.next.disabled = index === -1 || index >= total - 1;
      }
    }

    return context;
  }

  previous(): boolean {
    return this.tabs.previous();
  }

  next(): boolean {
    return this.tabs.next();
  }

  activate(index: number | string): boolean {
    return this.tabs.activate(index);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.root.removeEventListener("a11y-tabs:change", this.handleUpdate);
    this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
    this.elements.previous?.removeEventListener("click", this.handlePrevious);
    this.elements.next?.removeEventListener("click", this.handleNext);
  }

  private resolveElements(elements: StepperElementsOptions): StepperElements {
    const scope: ParentNode = this.stepper ?? document;
    const selectors = this.options.selectors;

    return {
      current:
        resolveElement(elements.current, scope) ??
        scope.querySelector<HTMLElement>(selectors.current),
      total:
        resolveElement(elements.total, scope) ??
        scope.querySelector<HTMLElement>(selectors.total),
      completed:
        resolveElement(elements.completed, scope) ??
        scope.querySelector<HTMLElement>(selectors.completed),
      previous:
        resolveElement<HTMLButtonElement>(elements.previous, scope) ??
        scope.querySelector<HTMLButtonElement>(selectors.previous),
      next:
        resolveElement<HTMLButtonElement>(elements.next, scope) ??
        scope.querySelector<HTMLButtonElement>(selectors.next)
    };
  }

  private getTabs(): HTMLElement[] {
    return getTabs(this.root);
  }

  private setText(element: HTMLElement | null, value: string | number): void {
    if (element) {
      element.textContent = String(value);
    }
  }
}

export default A11yTabsStepper;
export { A11yTabsStepper };
