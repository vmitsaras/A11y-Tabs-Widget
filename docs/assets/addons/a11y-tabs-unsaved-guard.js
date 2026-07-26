import { getPanels, getTabsEventDetail, resolveRoot, resolveTabs } from "./shared.js";
//#region src/addons/a11y-tabs-unsaved-guard.ts
const DEFAULT_FIELD_SELECTOR = [
	"input:not([type=\"button\"]):not([type=\"submit\"]):not([type=\"reset\"]):not([type=\"hidden\"])",
	"textarea",
	"select"
].join(",");
const DEFAULT_OPTIONS = Object.freeze({
	fieldSelector: DEFAULT_FIELD_SELECTOR,
	message: "You have unsaved changes. Leave this tab anyway?",
	confirm: null,
	modal: null,
	resetOnSubmit: true
});
/**
* Optional add-on that prevents leaving a dirty tab panel without confirmation.
*
* The add-on listens to the core cancellable `a11y-tabs:before-change` event,
* so it does not need to modify A11yTabs itself. Confirmation can be handled by
* native `confirm()`, a custom callback, or an async custom modal hook.
*/
var A11yTabsUnsavedGuard = class {
	tabs;
	root;
	options;
	initialValues = /* @__PURE__ */ new WeakMap();
	dirtyPanels = /* @__PURE__ */ new Set();
	pendingIndex = null;
	confirmationPending = false;
	allowNextChange = false;
	destroyed = false;
	handleTrackField = this.trackField.bind(this);
	handleBeforeChange = this.onBeforeChange.bind(this);
	handleReset = this.onReset.bind(this);
	handleSubmit = this.onSubmit.bind(this);
	handleDestroy = this.destroy.bind(this);
	constructor(target, options = {}) {
		this.tabs = resolveTabs(target, "A11yTabsUnsavedGuard");
		this.root = resolveRoot(target, this.tabs, "A11yTabsUnsavedGuard");
		this.options = {
			...DEFAULT_OPTIONS,
			...options
		};
		this.snapshotFields();
		this.root.addEventListener("input", this.handleTrackField);
		this.root.addEventListener("change", this.handleTrackField);
		this.root.addEventListener("reset", this.handleReset);
		this.root.addEventListener("submit", this.handleSubmit);
		this.root.addEventListener("a11y-tabs:before-change", this.handleBeforeChange);
		this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
	}
	/** Whether a panel, or any panel, has dirty fields. */
	isDirty(panel = null) {
		if (panel) return this.dirtyPanels.has(panel);
		return this.dirtyPanels.size > 0;
	}
	/** Mark fields in one panel, or all panels, as clean from their current values. */
	markClean(panel = null) {
		(panel ? [panel] : this.getPanels()).forEach((currentPanel) => {
			this.getFields(currentPanel).forEach((field) => {
				this.initialValues.set(field, this.getFieldValue(field));
			});
			this.setPanelDirty(currentPanel, false);
		});
	}
	/** Remove all listeners and tracked state. */
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.root.removeEventListener("input", this.handleTrackField);
		this.root.removeEventListener("change", this.handleTrackField);
		this.root.removeEventListener("reset", this.handleReset);
		this.root.removeEventListener("submit", this.handleSubmit);
		this.root.removeEventListener("a11y-tabs:before-change", this.handleBeforeChange);
		this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
		this.dirtyPanels.forEach((panel) => {
			delete panel.dataset.a11yTabsDirty;
		});
		this.dirtyPanels.clear();
		this.pendingIndex = null;
		this.confirmationPending = false;
		this.allowNextChange = false;
	}
	onBeforeChange(event) {
		if (this.destroyed) return;
		if (this.allowNextChange) {
			this.allowNextChange = false;
			return;
		}
		if (this.confirmationPending) {
			event.preventDefault();
			return;
		}
		const activePanel = this.tabs.getActivePanel();
		if (!activePanel || !this.isDirty(activePanel)) return;
		const detail = getTabsEventDetail(event);
		const context = {
			guard: this,
			tabs: this.tabs,
			root: this.root,
			activePanel,
			nextTab: detail.tab ?? null,
			nextPanel: detail.panel ?? null,
			nextIndex: detail.index ?? -1,
			previousIndex: detail.previousIndex ?? -1,
			dirtyFields: this.getDirtyFields(activePanel),
			event
		};
		const decision = this.requestConfirmation(context);
		if (decision instanceof Promise) {
			event.preventDefault();
			this.pendingIndex = context.nextIndex;
			this.confirmationPending = true;
			decision.then((allowed) => this.continueIfAllowed(Boolean(allowed))).catch(() => this.continueIfAllowed(false));
			return;
		}
		if (!decision) event.preventDefault();
	}
	requestConfirmation(context) {
		if (typeof this.options.modal === "function") return this.options.modal(context);
		if (typeof this.options.confirm === "function") return this.options.confirm(context);
		const message = typeof this.options.message === "function" ? this.options.message(context) : this.options.message;
		return window.confirm(message);
	}
	continueIfAllowed(allowed) {
		if (this.destroyed) return;
		const index = this.pendingIndex;
		this.pendingIndex = null;
		this.confirmationPending = false;
		if (!allowed || typeof index !== "number" || !Number.isInteger(index)) return;
		this.allowNextChange = true;
		this.tabs.activate(index);
	}
	trackField(event) {
		if (this.destroyed) return;
		const field = event.target;
		if (!this.isTrackableField(field)) return;
		if (!this.initialValues.has(field)) this.initialValues.set(field, this.getFieldValue(field));
		const panel = field.closest("[data-a11y-tabs-panel], [data-tab-panel]");
		if (panel) this.setPanelDirty(panel, this.getDirtyFields(panel).length > 0);
	}
	onReset(event) {
		if (this.destroyed) return;
		if (!(event.target instanceof Element)) return;
		const panel = event.target.closest("[data-a11y-tabs-panel], [data-tab-panel]");
		if (!panel) return;
		window.setTimeout(() => {
			if (this.destroyed) return;
			this.getFields(panel).forEach((field) => {
				this.initialValues.set(field, this.getFieldValue(field));
			});
			this.setPanelDirty(panel, false);
		});
	}
	onSubmit(event) {
		if (this.destroyed) return;
		if (!this.options.resetOnSubmit) return;
		if (!(event.target instanceof Element)) return;
		const panel = event.target.closest("[data-a11y-tabs-panel], [data-tab-panel]");
		if (panel) this.markClean(panel);
	}
	snapshotFields() {
		this.getPanels().forEach((panel) => {
			this.getFields(panel).forEach((field) => {
				this.initialValues.set(field, this.getFieldValue(field));
			});
			this.setPanelDirty(panel, false);
		});
	}
	getDirtyFields(panel) {
		return this.getFields(panel).filter((field) => this.initialValues.get(field) !== this.getFieldValue(field));
	}
	getFields(panel) {
		return Array.from(panel.querySelectorAll(this.options.fieldSelector)).filter((field) => this.isTrackableField(field));
	}
	getPanels() {
		return getPanels(this.root);
	}
	setPanelDirty(panel, isDirty) {
		if (isDirty) {
			this.dirtyPanels.add(panel);
			panel.dataset.a11yTabsDirty = "true";
		} else {
			this.dirtyPanels.delete(panel);
			delete panel.dataset.a11yTabsDirty;
		}
	}
	getFieldValue(field) {
		if (field instanceof HTMLInputElement) {
			if (field.type === "checkbox" || field.type === "radio") return field.checked ? "checked" : "unchecked";
			if (field.type === "file") return Array.from(field.files || []).map((file) => `${file.name}:${file.size}:${file.lastModified}`).join("|");
		}
		if (field instanceof HTMLSelectElement && field.multiple) return Array.from(field.selectedOptions).map((option) => option.value).join("|");
		return field.value;
	}
	isTrackableField(field) {
		if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return false;
		const isReadOnly = field instanceof HTMLSelectElement ? false : field.readOnly;
		return !field.disabled && !isReadOnly && field.matches(this.options.fieldSelector);
	}
};
//#endregion
export { A11yTabsUnsavedGuard, A11yTabsUnsavedGuard as default };

//# sourceMappingURL=a11y-tabs-unsaved-guard.js.map