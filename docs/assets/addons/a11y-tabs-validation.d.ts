import { i as TabsInstance } from "../index-B5ll15sm.js";
import { TabsTarget } from "./shared.js";
//#region src/addons/a11y-tabs-validation.d.ts
type ValidatableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
interface ValidationResult {
  valid: boolean;
  message?: string;
}
interface ValidationContext {
  validation: A11yTabsValidation;
  tabs: TabsInstance;
  root: HTMLElement;
  panel: HTMLElement;
  field?: ValidatableField;
  tab?: HTMLElement;
  invalidFields?: ValidatableField[];
  count?: number;
}
interface A11yTabsValidationOptions {
  fieldSelector?: string;
  errorClass?: string;
  panelErrorClass?: string;
  badgeClass?: string;
  descriptionClass?: string;
  visuallyHiddenClass?: string;
  badgeText?: (context: ValidationContext) => string | number;
  describe?: (context: ValidationContext) => string;
  validate?: ((field: ValidatableField, context: ValidationContext) => boolean | ValidationResult) | null;
  live?: boolean;
  validateOnInput?: boolean;
}
/**
 * Optional add-on that marks tabs containing invalid form controls.
 *
 * Validation uses native constraint validation by default. Provide a custom
 * `validate(field, context)` callback to return true/false or an object like
 * `{ valid: false, message: "Required" }` for app-specific rules.
 */
declare class A11yTabsValidation {
  private readonly tabs;
  private readonly root;
  private readonly options;
  private readonly panelState;
  private descriptionHost;
  private destroyed;
  private updating;
  private readonly handleRefreshFromEvent;
  private readonly handleDestroy;
  constructor(target: TabsTarget, options?: A11yTabsValidationOptions);
  /** Re-scan every panel and update tab error indicators. */
  update(): ValidatableField[];
  /** Return invalid fields for a specific panel, or all invalid fields. */
  getInvalidFields(panel?: HTMLElement | null): ValidatableField[];
  /** Whether any tracked panel contains invalid fields. */
  hasInvalid(): boolean;
  /** Activate the tab containing the first invalid control and focus it. */
  focusFirstInvalid(): ValidatableField | null;
  /** Remove generated indicators, descriptions, and listeners. */
  destroy(): void;
  private refreshFromEvent;
  private setPanelInvalid;
  private clearPanelInvalid;
  private getDescriptionHost;
  private removeDescriptionHostIfEmpty;
  private appendDescribedBy;
  private restoreDescribedBy;
  private isFieldValid;
  private getFields;
  private getPanels;
  private getTabForPanel;
  private isValidatableField;
}
//#endregion
export { A11yTabsValidation, A11yTabsValidation as default, A11yTabsValidationOptions, ValidationContext };
//# sourceMappingURL=a11y-tabs-validation.d.ts.map