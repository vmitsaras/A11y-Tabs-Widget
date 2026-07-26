import { A11yTabs } from "../index.js";
//#region src/addons/shared.ts
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
function isTabsInstance(value) {
	return isRecord(value) && typeof value.getActiveTab === "function" && typeof value.getActivePanel === "function" && typeof value.activate === "function";
}
function resolveTabs(target, label) {
	if (isTabsInstance(target)) return target;
	if (target instanceof HTMLElement) return new A11yTabs(target);
	throw new TypeError(`${label}: target must be an A11yTabs instance or HTMLElement.`);
}
function resolveRoot(target, tabs, label) {
	if (target instanceof HTMLElement) return target;
	const activeTab = tabs.getActiveTab();
	const activePanel = tabs.getActivePanel();
	const root = activeTab?.closest("[data-a11y-tabs], .a11y-tabs") ?? activePanel?.closest("[data-a11y-tabs], .a11y-tabs") ?? null;
	if (!root) throw new TypeError(`${label}: unable to find the tabs root element.`);
	return root;
}
function getTabsList(root) {
	return root.querySelector("[data-a11y-tabs-list], [data-tabs-list]");
}
function getTabs(root) {
	const list = getTabsList(root);
	if (!list) return [];
	return Array.from(list.querySelectorAll("[role=\"tab\"], [data-a11y-tabs-tab], [data-tab-target]")).filter((tab) => tab.closest("[data-a11y-tabs-list], [data-tabs-list]") === list);
}
function getPanels(root) {
	return Array.from(root.querySelectorAll("[data-a11y-tabs-panel], [data-tab-panel]")).filter((panel) => panel.closest("[data-a11y-tabs], .a11y-tabs") === root || panel.closest("[data-a11y-tabs], .a11y-tabs") === null);
}
function getTabsEventDetail(event) {
	if (!(event instanceof CustomEvent) || !isRecord(event.detail)) return {};
	const { instance, tab, panel, index, previousIndex } = event.detail;
	return {
		instance: isTabsInstance(instance) ? instance : void 0,
		tab: tab instanceof HTMLElement ? tab : null,
		panel: panel instanceof HTMLElement ? panel : null,
		index: typeof index === "number" ? index : void 0,
		previousIndex: typeof previousIndex === "number" ? previousIndex : void 0
	};
}
function isDisableable(element) {
	return "disabled" in element;
}
function isDisabledElement(element) {
	return Boolean(element && (isDisableable(element) && element.disabled || element.getAttribute("aria-disabled") === "true"));
}
function resolveElement(elementOrSelector, scope) {
	if (!elementOrSelector) return null;
	if (elementOrSelector instanceof HTMLElement) return elementOrSelector;
	return scope.querySelector(elementOrSelector);
}
function escapeSelectorValue(value) {
	if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
	return value.replace(/["\\]/g, "\\$&");
}
//#endregion
export { escapeSelectorValue, getPanels, getTabs, getTabsEventDetail, getTabsList, isDisableable, isDisabledElement, isRecord, isTabsInstance, resolveElement, resolveRoot, resolveTabs };

//# sourceMappingURL=shared.js.map