import { escapeSelectorValue, getPanels, getTabsEventDetail, resolveRoot, resolveTabs } from "./shared.js";
//#region src/addons/a11y-tabs-validation.ts
const DEFAULT_FIELD_SELECTOR = [
	"input:not([type=\"button\"]):not([type=\"submit\"]):not([type=\"reset\"]):not([type=\"hidden\"])",
	"textarea",
	"select"
].join(",");
const DEFAULT_OPTIONS = Object.freeze({
	fieldSelector: DEFAULT_FIELD_SELECTOR,
	errorClass: "a11y-tabs__tab--error",
	panelErrorClass: "a11y-tabs__panel--error",
	badgeClass: "a11y-tabs__badge",
	descriptionClass: "a11y-tabs__validation-description",
	visuallyHiddenClass: "a11y-tabs__sr-only",
	badgeText: ({ count }) => count ?? 0,
	describe: ({ count }) => `${count ?? 0} invalid ${count === 1 ? "field" : "fields"} in this tab panel.`,
	validate: null,
	live: true,
	validateOnInput: true
});
/**
* Optional add-on that marks tabs containing invalid form controls.
*
* Validation uses native constraint validation by default. Provide a custom
* `validate(field, context)` callback to return true/false or an object like
* `{ valid: false, message: "Required" }` for app-specific rules.
*/
var A11yTabsValidation = class {
	tabs;
	root;
	options;
	panelState = /* @__PURE__ */ new Map();
	descriptionHost = null;
	destroyed = false;
	updating = false;
	handleRefreshFromEvent = this.refreshFromEvent.bind(this);
	handleDestroy = this.destroy.bind(this);
	constructor(target, options = {}) {
		this.tabs = resolveTabs(target, "A11yTabsValidation");
		this.root = resolveRoot(target, this.tabs, "A11yTabsValidation");
		this.options = {
			...DEFAULT_OPTIONS,
			...options
		};
		this.getPanels().forEach((panel) => {
			const tab = this.getTabForPanel(panel);
			if (!tab) return;
			this.panelState.set(panel, {
				tab,
				badge: null,
				description: null,
				originalDescribedBy: tab.getAttribute("aria-describedby")
			});
		});
		this.root.addEventListener("change", this.handleRefreshFromEvent);
		this.root.addEventListener("invalid", this.handleRefreshFromEvent, true);
		this.root.addEventListener("reset", this.handleRefreshFromEvent);
		this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
		if (this.options.validateOnInput) this.root.addEventListener("input", this.handleRefreshFromEvent);
		this.update();
	}
	/** Re-scan every panel and update tab error indicators. */
	update() {
		if (this.updating) return [];
		this.updating = true;
		try {
			this.panelState.forEach((state, panel) => {
				const invalidFields = this.getInvalidFields(panel);
				this.setPanelInvalid(panel, state, invalidFields);
			});
			return this.getInvalidFields();
		} finally {
			this.updating = false;
		}
	}
	/** Return invalid fields for a specific panel, or all invalid fields. */
	getInvalidFields(panel = null) {
		return (panel ? [panel] : Array.from(this.panelState.keys())).flatMap((currentPanel) => this.getFields(currentPanel).filter((field) => !this.isFieldValid(field, currentPanel)));
	}
	/** Whether any tracked panel contains invalid fields. */
	hasInvalid() {
		return this.getInvalidFields().length > 0;
	}
	/** Activate the tab containing the first invalid control and focus it. */
	focusFirstInvalid() {
		this.update();
		for (const panel of this.panelState.keys()) {
			const invalidField = this.getInvalidFields(panel)[0];
			if (!invalidField) continue;
			this.tabs.activateByPanelId(panel.id);
			invalidField.focus({ preventScroll: false });
			if (typeof invalidField.reportValidity === "function") invalidField.reportValidity();
			return invalidField;
		}
		return null;
	}
	/** Remove generated indicators, descriptions, and listeners. */
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.root.removeEventListener("change", this.handleRefreshFromEvent);
		this.root.removeEventListener("invalid", this.handleRefreshFromEvent, true);
		this.root.removeEventListener("reset", this.handleRefreshFromEvent);
		this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
		if (this.options.validateOnInput) this.root.removeEventListener("input", this.handleRefreshFromEvent);
		this.panelState.forEach((state, panel) => {
			this.clearPanelInvalid(panel, state);
			this.restoreDescribedBy(state);
		});
		this.panelState.clear();
	}
	refreshFromEvent(event) {
		getTabsEventDetail(event);
		if (this.updating) return;
		if (event.type === "reset") {
			window.setTimeout(() => this.update());
			return;
		}
		this.update();
	}
	setPanelInvalid(panel, state, invalidFields) {
		const count = invalidFields.length;
		if (count === 0) {
			this.clearPanelInvalid(panel, state);
			return;
		}
		const context = {
			validation: this,
			tabs: this.tabs,
			root: this.root,
			panel,
			tab: state.tab,
			invalidFields,
			count
		};
		const badgeText = this.options.badgeText(context);
		const description = this.options.describe(context);
		state.tab.classList.add(this.options.errorClass);
		panel.classList.add(this.options.panelErrorClass);
		panel.dataset.a11yTabsInvalid = "true";
		if (!state.badge) {
			state.badge = document.createElement("span");
			state.badge.className = this.options.badgeClass;
			state.badge.dataset.a11yTabsBadgeVariant = "error";
			state.badge.setAttribute("aria-hidden", "true");
			state.tab.append(state.badge);
		}
		state.badge.textContent = String(badgeText ?? count);
		if (!state.description) {
			state.description = document.createElement("span");
			state.description.id = `${state.tab.id || panel.id}-validation-description`;
			state.description.className = `${this.options.descriptionClass} ${this.options.visuallyHiddenClass}`;
			if (this.options.live) state.description.setAttribute("aria-live", "polite");
			this.getDescriptionHost().append(state.description);
		}
		state.description.textContent = description;
		this.appendDescribedBy(state, state.description.id);
	}
	clearPanelInvalid(panel, state) {
		state.tab.classList.remove(this.options.errorClass);
		panel.classList.remove(this.options.panelErrorClass);
		delete panel.dataset.a11yTabsInvalid;
		state.badge?.remove();
		state.badge = null;
		state.description?.remove();
		state.description = null;
		this.removeDescriptionHostIfEmpty();
		this.restoreDescribedBy(state);
	}
	getDescriptionHost() {
		if (this.descriptionHost?.isConnected) return this.descriptionHost;
		const host = document.createElement("div");
		host.dataset.a11yTabsValidationDescriptions = "";
		const list = this.root.querySelector("[data-a11y-tabs-list], [data-tabs-list]");
		if (list) list.after(host);
		else this.root.prepend(host);
		this.descriptionHost = host;
		return host;
	}
	removeDescriptionHostIfEmpty() {
		if (this.descriptionHost && this.descriptionHost.childElementCount === 0) {
			this.descriptionHost.remove();
			this.descriptionHost = null;
		}
	}
	appendDescribedBy(state, id) {
		const ids = new Set((state.originalDescribedBy || "").split(/\s+/).filter(Boolean));
		ids.add(id);
		state.tab.setAttribute("aria-describedby", Array.from(ids).join(" "));
	}
	restoreDescribedBy(state) {
		if (state.originalDescribedBy === null) state.tab.removeAttribute("aria-describedby");
		else state.tab.setAttribute("aria-describedby", state.originalDescribedBy);
	}
	isFieldValid(field, panel) {
		if (field.disabled || field.closest("[disabled], [aria-hidden=\"true\"]")) return true;
		const context = {
			validation: this,
			tabs: this.tabs,
			root: this.root,
			panel,
			field
		};
		if (typeof this.options.validate === "function") {
			const result = this.options.validate(field, context);
			if (typeof result === "boolean") return result;
			if (result && typeof result === "object" && "valid" in result) return Boolean(result.valid);
		}
		return typeof field.validity === "object" ? field.validity.valid : true;
	}
	getFields(panel) {
		return Array.from(panel.querySelectorAll(this.options.fieldSelector)).filter((field) => this.isValidatableField(field) && field.closest("[data-a11y-tabs-panel], [data-tab-panel]") === panel);
	}
	getPanels() {
		return getPanels(this.root);
	}
	getTabForPanel(panel) {
		if (!panel.id) return null;
		return this.root.querySelector("[data-a11y-tabs-list], [data-tabs-list]")?.querySelector(`[aria-controls="${escapeSelectorValue(panel.id)}"], [data-a11y-tabs-panel-id="${escapeSelectorValue(panel.id)}"], [data-tab-target="${escapeSelectorValue(panel.id)}"]`) ?? null;
	}
	isValidatableField(field) {
		return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement;
	}
};
//#endregion
export { A11yTabsValidation, A11yTabsValidation as default };

//# sourceMappingURL=a11y-tabs-validation.js.map