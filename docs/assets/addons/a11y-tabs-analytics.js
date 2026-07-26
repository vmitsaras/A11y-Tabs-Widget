import { getTabsEventDetail, resolveRoot, resolveTabs } from "./shared.js";
//#region src/addons/a11y-tabs-analytics.ts
const DEFAULT_OPTIONS = Object.freeze({ onChange: null });
/**
* Optional add-on that forwards successful tab changes to a consumer callback.
*
* This add-on intentionally does not include or depend on any analytics SDK.
* Consumers receive normalized tab data and can forward it to their own
* analytics, data layer, logging, or telemetry code.
*/
var A11yTabsAnalytics = class {
	tabs;
	root;
	options;
	destroyed = false;
	handleChange = this.onChange.bind(this);
	handleDestroy = this.destroy.bind(this);
	constructor(target, options = {}) {
		this.tabs = resolveTabs(target, "A11yTabsAnalytics");
		this.root = resolveRoot(target, this.tabs, "A11yTabsAnalytics");
		this.options = this.normalizeOptions(options);
		this.root.addEventListener("a11y-tabs:change", this.handleChange);
		this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
	}
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.root.removeEventListener("a11y-tabs:change", this.handleChange);
		this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
	}
	normalizeOptions(options) {
		const normalized = typeof options === "function" ? {
			...DEFAULT_OPTIONS,
			onChange: options
		} : {
			...DEFAULT_OPTIONS,
			...options
		};
		if (typeof normalized.onChange !== "function") throw new TypeError("A11yTabsAnalytics: options.onChange must be a function.");
		return { onChange: normalized.onChange };
	}
	onChange(event) {
		if (this.destroyed) return;
		this.options.onChange(this.getData(event), event);
	}
	getData(event) {
		const detail = getTabsEventDetail(event);
		const tab = detail.tab ?? null;
		const panel = detail.panel ?? null;
		return {
			tabId: tab?.id || "",
			panelId: panel?.id || tab?.getAttribute("aria-controls") || tab?.dataset.tabTarget || "",
			index: Number.isInteger(detail.index) ? detail.index ?? -1 : -1,
			previousIndex: Number.isInteger(detail.previousIndex) ? detail.previousIndex ?? -1 : -1,
			tabText: this.getTabText(tab),
			rootId: this.getRootIdentifier()
		};
	}
	getTabText(tab) {
		if (!(tab instanceof HTMLElement)) return "";
		return tab.textContent?.replace(/\s+/g, " ").trim() ?? "";
	}
	getRootIdentifier() {
		return this.root.id || this.root.getAttribute("data-a11y-tabs-id") || this.root.getAttribute("data-analytics-id") || this.root.getAttribute("aria-label") || "";
	}
};
//#endregion
export { A11yTabsAnalytics };

//# sourceMappingURL=a11y-tabs-analytics.js.map