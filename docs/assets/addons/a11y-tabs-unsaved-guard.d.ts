import { i as TabsInstance } from "../index-B5ll15sm.js";
import { TabsTarget } from "./shared.js";
//#region src/addons/a11y-tabs-unsaved-guard.d.ts
type GuardField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type GuardDecision = boolean | Promise<boolean>;
interface UnsavedGuardContext {
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
interface A11yTabsUnsavedGuardOptions {
  fieldSelector?: string;
  message?: string | ((context: UnsavedGuardContext) => string);
  confirm?: ((context: UnsavedGuardContext) => GuardDecision) | null;
  modal?: ((context: UnsavedGuardContext) => GuardDecision) | null;
  resetOnSubmit?: boolean;
}
/**
 * Optional add-on that prevents leaving a dirty tab panel without confirmation.
 *
 * The add-on listens to the core cancellable `a11y-tabs:before-change` event,
 * so it does not need to modify A11yTabs itself. Confirmation can be handled by
 * native `confirm()`, a custom callback, or an async custom modal hook.
 */
declare class A11yTabsUnsavedGuard {
  private readonly tabs;
  private readonly root;
  private readonly options;
  private readonly initialValues;
  private readonly dirtyPanels;
  private pendingIndex;
  private confirmationPending;
  private allowNextChange;
  private destroyed;
  private readonly handleTrackField;
  private readonly handleBeforeChange;
  private readonly handleReset;
  private readonly handleSubmit;
  private readonly handleDestroy;
  constructor(target: TabsTarget, options?: A11yTabsUnsavedGuardOptions);
  /** Whether a panel, or any panel, has dirty fields. */
  isDirty(panel?: HTMLElement | null): boolean;
  /** Mark fields in one panel, or all panels, as clean from their current values. */
  markClean(panel?: HTMLElement | null): void;
  /** Remove all listeners and tracked state. */
  destroy(): void;
  private onBeforeChange;
  private requestConfirmation;
  private continueIfAllowed;
  private trackField;
  private onReset;
  private onSubmit;
  private snapshotFields;
  private getDirtyFields;
  private getFields;
  private getPanels;
  private setPanelDirty;
  private getFieldValue;
  private isTrackableField;
}
//#endregion
export { A11yTabsUnsavedGuard, A11yTabsUnsavedGuard as default, A11yTabsUnsavedGuardOptions, UnsavedGuardContext };
//# sourceMappingURL=a11y-tabs-unsaved-guard.d.ts.map