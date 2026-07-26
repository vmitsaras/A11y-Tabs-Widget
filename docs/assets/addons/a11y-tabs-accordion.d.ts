import { TabsTarget } from "./shared.js";
//#region src/addons/a11y-tabs-accordion.d.ts
interface AccordionButtonContext {
  tab: HTMLElement;
  panel: HTMLElement;
  index: number;
  tabs: HTMLElement[];
  panels: HTMLElement[];
}
interface A11yTabsAccordionOptions {
  mediaQuery?: string | false;
  collapseOnWrap?: boolean;
  buttonClass?: string;
  buttonText?: ((context: AccordionButtonContext) => string | Node) | null;
}
/**
 * Optional responsive add-on that presents A11yTabs panels as accordion toggles
 * when a media query matches or the visible tablist would wrap or overflow.
 *
 * This is intentionally a presentation adapter, not a full ARIA accordion
 * implementation. It keeps the underlying A11yTabs single-selection state and
 * mirrors that state to disclosure-style buttons with aria-expanded.
 */
declare class A11yTabsAccordion {
  private static readonly instances;
  private readonly tabs;
  private readonly root;
  private readonly options;
  private readonly mediaQuery;
  private buttons;
  private isAccordion;
  private destroyed;
  private resizeObserver;
  private observesWindowResize;
  private isMeasuring;
  private lastObservedWidth;
  private readonly listWasHidden;
  private readonly originalPresentation;
  private readonly handleMediaChange;
  private readonly handleChange;
  private readonly handleClick;
  private readonly handleTabsDestroy;
  private readonly handleResizeObserver;
  private readonly handleWindowResize;
  constructor(target: TabsTarget, options?: A11yTabsAccordionOptions);
  /** Re-evaluate the responsive presentation and synchronise its active state. */
  update(): void;
  private syncState;
  /** Remove generated buttons, listeners, and responsive presentation state. */
  destroy(): void;
  private teardown;
  private onMediaChange;
  private onResize;
  private onTabsDestroy;
  private setMode;
  private startObserving;
  private isTabListConstrained;
  private restoreAttribute;
  private onClick;
  private createButtons;
  private getFocusedControlIndex;
  private restoreEquivalentFocus;
  private restorePresentation;
  private getButtonText;
  private getList;
  private getTabs;
  private getPanels;
}
//#endregion
export { A11yTabsAccordion, A11yTabsAccordion as default, A11yTabsAccordionOptions, AccordionButtonContext };
//# sourceMappingURL=a11y-tabs-accordion.d.ts.map