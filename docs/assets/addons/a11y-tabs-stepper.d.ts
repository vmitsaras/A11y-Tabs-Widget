import { TabsTarget } from "./shared.js";
//#region src/addons/a11y-tabs-stepper.d.ts
type ElementTarget = HTMLElement | string;
interface StepperSelectors {
  root: string;
  current: string;
  total: string;
  completed: string;
  previous: string;
  next: string;
}
interface StepperElementsOptions {
  current?: ElementTarget;
  total?: ElementTarget;
  completed?: ElementTarget;
  previous?: ElementTarget;
  next?: ElementTarget;
}
interface StepperContext {
  activeTab: HTMLElement | null;
  activePanel: HTMLElement | null;
  index: number;
  current: number;
  total: number;
  completed: number;
}
interface A11yTabsStepperOptions {
  stepper?: ElementTarget;
  elements?: StepperElementsOptions;
  selectors?: Partial<StepperSelectors>;
  disableAtEnds?: boolean;
  formatCompleted?: (context: StepperContext) => string;
}
/**
 * Optional add-on that mirrors an A11yTabs instance into external stepper UI.
 *
 * The add-on only controls tabs through A11yTabs' public methods:
 * getActiveTab(), getActivePanel(), next(), previous(), and activate(index).
 */
declare class A11yTabsStepper {
  private readonly tabs;
  private readonly root;
  private readonly options;
  private readonly stepper;
  private readonly elements;
  private destroyed;
  private readonly handleUpdate;
  private readonly handlePrevious;
  private readonly handleNext;
  private readonly handleDestroy;
  constructor(target: TabsTarget, options?: A11yTabsStepperOptions);
  update(): StepperContext;
  previous(): boolean;
  next(): boolean;
  activate(index: number | string): boolean;
  destroy(): void;
  private resolveElements;
  private getTabs;
  private setText;
}
//#endregion
export { A11yTabsStepper, A11yTabsStepper as default, A11yTabsStepperOptions, StepperContext, StepperElementsOptions, StepperSelectors };
//# sourceMappingURL=a11y-tabs-stepper.d.ts.map