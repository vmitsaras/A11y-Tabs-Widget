import { TabsTarget } from "./shared.js";
//#region src/addons/a11y-tabs-analytics.d.ts
interface AnalyticsData {
  tabId: string;
  panelId: string;
  index: number;
  previousIndex: number;
  tabText: string;
  rootId: string;
}
type AnalyticsCallback = (data: AnalyticsData, event: Event) => void;
interface A11yTabsAnalyticsOptions {
  onChange?: AnalyticsCallback | null;
}
/**
 * Optional add-on that forwards successful tab changes to a consumer callback.
 *
 * This add-on intentionally does not include or depend on any analytics SDK.
 * Consumers receive normalized tab data and can forward it to their own
 * analytics, data layer, logging, or telemetry code.
 */
declare class A11yTabsAnalytics {
  private readonly tabs;
  private readonly root;
  private readonly options;
  private destroyed;
  private readonly handleChange;
  private readonly handleDestroy;
  constructor(target: TabsTarget, options?: A11yTabsAnalyticsOptions | AnalyticsCallback);
  destroy(): void;
  private normalizeOptions;
  private onChange;
  private getData;
  private getTabText;
  private getRootIdentifier;
}
//#endregion
export { A11yTabsAnalytics, A11yTabsAnalyticsOptions, AnalyticsCallback, AnalyticsData };
//# sourceMappingURL=a11y-tabs-analytics.d.ts.map