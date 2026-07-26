import { escapeSelectorValue, getTabs, isDisabledElement, resolveRoot, resolveTabs } from "./shared.js";
//#region src/addons/a11y-tabs-shortcuts.ts
const DEFAULT_SHORTCUTS = Object.freeze([
	"Alt+1",
	"Alt+2",
	"Alt+3",
	"Alt+4",
	"Alt+5",
	"Alt+6",
	"Alt+7",
	"Alt+8",
	"Alt+9"
]);
const DEFAULT_OPTIONS = Object.freeze({
	shortcuts: DEFAULT_SHORTCUTS,
	scope: "root",
	preventDefault: true,
	ignoreEditable: true
});
const VALID_SCOPES = /* @__PURE__ */ new Set(["root", "document"]);
const UNAVAILABLE_EVENT = "a11y-tabs:shortcut-unavailable";
const MODIFIER_ALIASES = Object.freeze({
	cmd: "meta",
	command: "meta",
	control: "ctrl",
	option: "alt",
	return: "enter",
	spacebar: " ",
	space: " ",
	esc: "escape"
});
/**
* Optional add-on that activates tabs through configurable direct shortcuts.
*
* Listeners are scoped to the tab root by default. Set scope: "document" only
* when your application intentionally owns those global key bindings. The
* default Alt+1 through Alt+9 bindings can be replaced or disabled with
* shortcuts: false to avoid conflicts with browser, operating-system, or
* assistive-technology shortcuts.
*/
var A11yTabsShortcuts = class {
	tabs;
	root;
	options;
	listenerTarget;
	destroyed = false;
	shortcuts = [];
	handleKeydown = (event) => {
		if (event instanceof KeyboardEvent) this.onKeydown(event);
	};
	handleDestroy = this.destroy.bind(this);
	constructor(target, options = {}) {
		this.tabs = resolveTabs(target, "A11yTabsShortcuts");
		this.root = resolveRoot(target, this.tabs, "A11yTabsShortcuts");
		this.options = {
			...DEFAULT_OPTIONS,
			...options
		};
		if (!VALID_SCOPES.has(this.options.scope)) throw new TypeError("A11yTabsShortcuts: options.scope must be 'root' or 'document'.");
		this.shortcuts = this.normalizeShortcuts(this.options.shortcuts);
		this.listenerTarget = this.options.scope === "document" ? document : this.root;
		if (this.shortcuts.length > 0) this.listenerTarget.addEventListener("keydown", this.handleKeydown);
		this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
	}
	/** Replace shortcut definitions. Pass false, null, or [] to disable them. */
	setShortcuts(shortcuts) {
		const hadListener = this.shortcuts.length > 0;
		this.shortcuts = this.normalizeShortcuts(shortcuts);
		if (hadListener && this.shortcuts.length === 0) this.listenerTarget.removeEventListener("keydown", this.handleKeydown);
		else if (!hadListener && this.shortcuts.length > 0 && !this.destroyed) this.listenerTarget.addEventListener("keydown", this.handleKeydown);
	}
	/** Remove shortcut and destroy listeners. */
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.listenerTarget.removeEventListener("keydown", this.handleKeydown);
		this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
		this.shortcuts = [];
	}
	onKeydown(event) {
		if (this.destroyed || event.defaultPrevented) return;
		if (this.options.ignoreEditable && this.isEditableTarget(event.target)) return;
		const shortcut = this.shortcuts.find((entry) => this.matches(event, entry));
		if (!shortcut) return;
		const result = this.runShortcut(shortcut, event);
		if (this.options.preventDefault) event.preventDefault();
		if (result.unavailableReason) this.dispatchUnavailable(shortcut, result.tab, result.unavailableReason);
	}
	normalizeShortcuts(shortcuts) {
		if (!shortcuts) return [];
		if (Array.isArray(shortcuts)) return shortcuts.map((shortcut, index) => this.normalizeShortcut(shortcut, index)).filter((shortcut) => shortcut !== null);
		return Object.entries(shortcuts).map(([combo, target]) => this.normalizeShortcut({
			combo,
			target
		})).filter((shortcut) => shortcut !== null);
	}
	normalizeShortcut(shortcut, fallbackIndex = 0) {
		if (typeof shortcut === "string") return {
			...this.parseCombo(shortcut),
			target: fallbackIndex,
			targetTab: this.resolveTab(fallbackIndex)
		};
		const combo = shortcut.combo ?? shortcut.shortcut ?? shortcut.keys ?? shortcut.key;
		if (typeof combo !== "string") return null;
		const target = shortcut.target ?? shortcut.index ?? shortcut.panelId ?? shortcut.tabId ?? fallbackIndex;
		return {
			...this.parseCombo(combo),
			target,
			targetTab: typeof target === "function" ? null : this.resolveTab(target)
		};
	}
	parseCombo(combo) {
		const parts = combo.split("+").map((part) => this.normalizeKeyName(part)).filter(Boolean);
		const parsed = {
			alt: false,
			ctrl: false,
			meta: false,
			shift: false,
			key: ""
		};
		parts.forEach((part) => {
			if (part === "alt" || part === "ctrl" || part === "meta" || part === "shift") parsed[part] = true;
			else parsed.key = part;
		});
		if (!parsed.key) throw new TypeError(`A11yTabsShortcuts: shortcut "${combo}" must include a non-modifier key.`);
		return parsed;
	}
	matches(event, shortcut) {
		return event.altKey === shortcut.alt && event.ctrlKey === shortcut.ctrl && event.metaKey === shortcut.meta && event.shiftKey === shortcut.shift && this.normalizeKeyName(event.key) === shortcut.key;
	}
	runShortcut(shortcut, event) {
		const context = {
			event,
			tabs: this.tabs,
			root: this.root,
			shortcut
		};
		const target = shortcut.target;
		if (typeof target === "function") {
			const result = target(context);
			if (Number.isInteger(result)) return this.activateTab(this.resolveTab(result), this.shouldMoveFocus(event));
			return {
				activated: Boolean(result),
				tab: null
			};
		}
		return this.activateTab(shortcut.targetTab, this.shouldMoveFocus(event));
	}
	activateTab(tab, moveFocus) {
		const unavailableReason = this.getUnavailableReason(tab);
		if (unavailableReason) return {
			activated: false,
			tab,
			unavailableReason
		};
		const activated = this.tabs.activate(tab.id);
		if (activated && moveFocus) tab?.focus();
		return {
			activated,
			tab
		};
	}
	shouldMoveFocus(event) {
		return event.target instanceof Element && this.root.contains(event.target);
	}
	resolveTab(target) {
		if (typeof target === "number" && Number.isInteger(target)) return this.getTabs()[target] ?? null;
		if (typeof target !== "string") return null;
		const escaped = escapeSelectorValue(target);
		const tab = this.root.querySelector(`#${escaped}[role="tab"]`);
		if (tab) return tab;
		return this.getTabs().find((currentTab) => currentTab.getAttribute("aria-controls") === target) ?? null;
	}
	getUnavailableReason(tab) {
		if (!tab) return "missing";
		if (!tab.isConnected || !this.root.contains(tab)) return "disconnected";
		if (isDisabledElement(tab)) return "disabled";
		const hiddenContainer = tab.closest("[hidden], [aria-hidden=\"true\"]");
		if (hiddenContainer && this.root.contains(hiddenContainer)) return "hidden";
		const panelId = tab.getAttribute("aria-controls");
		if (!panelId) return "missing-panel";
		const panel = this.root.querySelector(`#${escapeSelectorValue(panelId)}`);
		if (!panel?.isConnected || !this.root.contains(panel)) return "missing-panel";
		return null;
	}
	dispatchUnavailable(shortcut, tab, reason) {
		this.root.dispatchEvent(new CustomEvent(UNAVAILABLE_EVENT, {
			bubbles: true,
			detail: {
				tabs: this.tabs,
				root: this.root,
				shortcut,
				tab,
				reason
			}
		}));
	}
	isEditableTarget(target) {
		if (!(target instanceof Element)) return false;
		return Boolean(target.closest("input, textarea, select, [contenteditable=\"\"], [contenteditable=\"true\"]"));
	}
	normalizeKeyName(key) {
		const normalized = key.trim().toLowerCase();
		return MODIFIER_ALIASES[normalized] ?? normalized;
	}
	getTabs() {
		return getTabs(this.root);
	}
};
//#endregion
export { A11yTabsShortcuts, A11yTabsShortcuts as default };

//# sourceMappingURL=a11y-tabs-shortcuts.js.map