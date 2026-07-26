import { i as TabsInstance } from "../index-B5ll15sm.js";
import { TabsTarget } from "./shared.js";
//#region src/addons/a11y-tabs-tour.d.ts
type ElementTarget = HTMLElement | string;
type PreferTarget = "panel" | "tab";
interface TourSelectors {
  popover: string;
  title: string;
  description: string;
  progress: string;
  previous: string;
  next: string;
  skip: string;
  finish: string;
}
interface TourClassNames {
  popover: string;
  actions: string;
  title: string;
  description: string;
  progress: string;
  activeTarget: string;
}
interface TourStepConfig {
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
interface TourContext {
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
interface A11yTabsTourOptions {
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
/**
 * Lightweight guided tour add-on for A11yTabs.
 *
 * The controller activates tabs in sequence and renders optional, keyboard
 * accessible controls near the active panel or tab. Consumers may provide their
 * own popover markup or disable rendering and listen to tour events instead.
 */
declare class A11yTabsTour {
  private readonly tabs;
  private readonly root;
  private readonly options;
  private readonly steps;
  private currentIndex;
  private active;
  private generatedPopover;
  private destroyed;
  private activeTarget;
  private returnFocusTarget;
  private popover;
  private elements;
  private readonly handlePrevious;
  private readonly handleNext;
  private readonly handleSkip;
  private readonly handleFinish;
  private readonly handleKeydown;
  private readonly handleDestroy;
  constructor(target: TabsTarget, options?: A11yTabsTourOptions);
  start(index?: number): boolean;
  goTo(index: number): boolean;
  next(): boolean;
  previous(): boolean;
  skip(): boolean;
  finish(): boolean;
  destroy(): void;
  private render;
  private placePopover;
  private stop;
  private normalizeSteps;
  private stepTabIndex;
  private getStepTarget;
  private resolvePopover;
  private resolveElements;
  private bindControls;
  private unbindControls;
  private onKeydown;
  private emit;
  private getCallback;
  private context;
  private normalizeIndex;
  private setPopoverVisible;
  private getFocusReturnTarget;
  private getFocusedTourControl;
  private restoreTourControlFocus;
  private restoreFocus;
  private isAvailableFocusTarget;
  private clearTarget;
  private getTabs;
  private setText;
}
//#endregion
export { A11yTabsTour, A11yTabsTour as default, A11yTabsTourOptions, TourClassNames, TourContext, TourSelectors, TourStepConfig };
//# sourceMappingURL=a11y-tabs-tour.d.ts.map