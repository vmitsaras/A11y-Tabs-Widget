import {
  getTabsEventDetail,
  resolveRoot,
  resolveTabs,
  type TabsTarget
} from "./shared.js";
import type { TabsInstance } from "../index.js";

export interface AnalyticsData {
  tabId: string;
  panelId: string;
  index: number;
  previousIndex: number;
  tabText: string;
  rootId: string;
}

export type AnalyticsCallback = (data: AnalyticsData, event: Event) => void;

export interface A11yTabsAnalyticsOptions {
  onChange?: AnalyticsCallback | null;
}

interface NormalizedAnalyticsOptions {
  onChange: AnalyticsCallback;
}

const DEFAULT_OPTIONS = Object.freeze({
  onChange: null
} satisfies A11yTabsAnalyticsOptions);

/**
 * Optional add-on that forwards successful tab changes to a consumer callback.
 *
 * This add-on intentionally does not include or depend on any analytics SDK.
 * Consumers receive normalized tab data and can forward it to their own
 * analytics, data layer, logging, or telemetry code.
 */
class A11yTabsAnalytics {
  private readonly tabs: TabsInstance;
  private readonly root: HTMLElement;
  private readonly options: NormalizedAnalyticsOptions;
  private destroyed = false;

  private readonly handleChange = this.onChange.bind(this);
  private readonly handleDestroy = this.destroy.bind(this);

  constructor(
    target: TabsTarget,
    options: A11yTabsAnalyticsOptions | AnalyticsCallback = {}
  ) {
    this.tabs = resolveTabs(target, "A11yTabsAnalytics");
    this.root = resolveRoot(target, this.tabs, "A11yTabsAnalytics");
    this.options = this.normalizeOptions(options);

    this.root.addEventListener("a11y-tabs:change", this.handleChange);
    this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.root.removeEventListener("a11y-tabs:change", this.handleChange);
    this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
  }

  private normalizeOptions(
    options: A11yTabsAnalyticsOptions | AnalyticsCallback
  ): NormalizedAnalyticsOptions {
    const normalized =
      typeof options === "function"
        ? { ...DEFAULT_OPTIONS, onChange: options }
        : { ...DEFAULT_OPTIONS, ...options };

    if (typeof normalized.onChange !== "function") {
      throw new TypeError(
        "A11yTabsAnalytics: options.onChange must be a function."
      );
    }

    return { onChange: normalized.onChange };
  }

  private onChange(event: Event): void {
    if (this.destroyed) return;
    this.options.onChange(this.getData(event), event);
  }

  private getData(event: Event): AnalyticsData {
    const detail = getTabsEventDetail(event);
    const tab = detail.tab ?? null;
    const panel = detail.panel ?? null;

    return {
      tabId: tab?.id || "",
      panelId:
        panel?.id ||
        tab?.getAttribute("aria-controls") ||
        tab?.dataset.tabTarget ||
        "",
      index: Number.isInteger(detail.index) ? detail.index ?? -1 : -1,
      previousIndex: Number.isInteger(detail.previousIndex)
        ? detail.previousIndex ?? -1
        : -1,
      tabText: this.getTabText(tab),
      rootId: this.getRootIdentifier()
    };
  }

  private getTabText(tab: HTMLElement | null): string {
    if (!(tab instanceof HTMLElement)) return "";
    return tab.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }

  private getRootIdentifier(): string {
    return (
      this.root.id ||
      this.root.getAttribute("data-a11y-tabs-id") ||
      this.root.getAttribute("data-analytics-id") ||
      this.root.getAttribute("aria-label") ||
      ""
    );
  }
}

export { A11yTabsAnalytics };
