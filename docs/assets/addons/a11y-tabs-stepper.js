import { getTabs, resolveElement, resolveRoot, resolveTabs } from "./shared.js";
//#region src/addons/a11y-tabs-stepper.ts
const DEFAULT_SELECTORS = Object.freeze({
	root: "[data-a11y-tabs-stepper]",
	current: "[data-a11y-tabs-stepper-current]",
	total: "[data-a11y-tabs-stepper-total]",
	completed: "[data-a11y-tabs-stepper-completed]",
	previous: "[data-a11y-tabs-stepper-previous]",
	next: "[data-a11y-tabs-stepper-next]"
});
/**
* Optional add-on that mirrors an A11yTabs instance into external stepper UI.
*
* The add-on only controls tabs through A11yTabs' public methods:
* getActiveTab(), getActivePanel(), next(), previous(), and activate(index).
*/
var A11yTabsStepper = class {
	tabs;
	root;
	options;
	stepper;
	elements;
	destroyed = false;
	handleUpdate = this.update.bind(this);
	handlePrevious = this.previous.bind(this);
	handleNext = this.next.bind(this);
	handleDestroy = this.destroy.bind(this);
	constructor(target, options = {}) {
		this.tabs = resolveTabs(target, "A11yTabsStepper");
		this.root = resolveRoot(target, this.tabs, "A11yTabsStepper");
		this.options = {
			...options,
			selectors: {
				...DEFAULT_SELECTORS,
				...options.selectors
			},
			disableAtEnds: options.disableAtEnds !== false,
			formatCompleted: options.formatCompleted ?? (({ completed, total }) => `${completed} of ${total} completed`)
		};
		this.stepper = resolveElement(this.options.stepper, document) ?? document.querySelector(this.options.selectors.root);
		this.elements = this.resolveElements(this.options.elements ?? {});
		this.root.addEventListener("a11y-tabs:change", this.handleUpdate);
		this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
		this.elements.previous?.addEventListener("click", this.handlePrevious);
		this.elements.next?.addEventListener("click", this.handleNext);
		this.update();
	}
	update() {
		const activeTab = this.tabs.getActiveTab();
		const activePanel = this.tabs.getActivePanel();
		const tabs = this.getTabs();
		const index = activeTab ? tabs.indexOf(activeTab) : -1;
		const current = index + 1;
		const total = tabs.length;
		const context = {
			activeTab,
			activePanel,
			index,
			current,
			total,
			completed: Math.max(index, 0)
		};
		this.setText(this.elements.current, current || "");
		this.setText(this.elements.total, total);
		this.setText(this.elements.completed, this.options.formatCompleted(context));
		if (this.options.disableAtEnds) {
			if (this.elements.previous) this.elements.previous.disabled = index <= 0;
			if (this.elements.next) this.elements.next.disabled = index === -1 || index >= total - 1;
		}
		return context;
	}
	previous() {
		return this.tabs.previous();
	}
	next() {
		return this.tabs.next();
	}
	activate(index) {
		return this.tabs.activate(index);
	}
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.root.removeEventListener("a11y-tabs:change", this.handleUpdate);
		this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
		this.elements.previous?.removeEventListener("click", this.handlePrevious);
		this.elements.next?.removeEventListener("click", this.handleNext);
	}
	resolveElements(elements) {
		const scope = this.stepper ?? document;
		const selectors = this.options.selectors;
		return {
			current: resolveElement(elements.current, scope) ?? scope.querySelector(selectors.current),
			total: resolveElement(elements.total, scope) ?? scope.querySelector(selectors.total),
			completed: resolveElement(elements.completed, scope) ?? scope.querySelector(selectors.completed),
			previous: resolveElement(elements.previous, scope) ?? scope.querySelector(selectors.previous),
			next: resolveElement(elements.next, scope) ?? scope.querySelector(selectors.next)
		};
	}
	getTabs() {
		return getTabs(this.root);
	}
	setText(element, value) {
		if (element) element.textContent = String(value);
	}
};
//#endregion
export { A11yTabsStepper, A11yTabsStepper as default };

//# sourceMappingURL=a11y-tabs-stepper.js.map