import { getTabs, getTabsEventDetail, isRecord, resolveRoot, resolveTabs } from "./shared.js";
//#region src/addons/a11y-tabs-history.ts
const DEFAULT_OPTIONS = Object.freeze({
	mode: "hash",
	queryParam: "tab",
	stateKey: "a11yTabs",
	pushInitialState: false,
	getState: null,
	readState: null
});
const VALID_MODES = /* @__PURE__ */ new Set([
	"hash",
	"query",
	"state"
]);
/**
* Optional add-on that records tab changes in browser history.
*
* Use this when every tab activation should become a Back/Forward entry. The
* core useHash option intentionally stays lightweight by replacing the current
* hash instead of pushing history entries.
*/
var A11yTabsHistory = class {
	tabs;
	root;
	options;
	isRestoring = false;
	handleChange = this.onChange.bind(this);
	handlePopState = this.onPopState.bind(this);
	handleDestroy = this.destroy.bind(this);
	constructor(target, options = {}) {
		this.tabs = resolveTabs(target, "A11yTabsHistory");
		this.root = resolveRoot(target, this.tabs, "A11yTabsHistory");
		this.options = this.normalizeOptions(options);
		this.root.addEventListener("a11y-tabs:change", this.handleChange);
		this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
		window.addEventListener("popstate", this.handlePopState);
		const initialPanelId = this.readPanelId({ state: history.state });
		if (initialPanelId) this.restorePanel(initialPanelId);
		else if (this.options.pushInitialState) this.push(this.getActiveContext());
	}
	destroy() {
		this.root.removeEventListener("a11y-tabs:change", this.handleChange);
		this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
		window.removeEventListener("popstate", this.handlePopState);
	}
	normalizeOptions(options) {
		const normalized = {
			...DEFAULT_OPTIONS,
			...options
		};
		if (!VALID_MODES.has(normalized.mode)) throw new TypeError("A11yTabsHistory: options.mode must be 'hash', 'query', or 'state'.");
		if (typeof normalized.queryParam !== "string" || normalized.queryParam.length === 0) throw new TypeError("A11yTabsHistory: options.queryParam must be a non-empty string.");
		if (typeof normalized.stateKey !== "string" || normalized.stateKey.length === 0) throw new TypeError("A11yTabsHistory: options.stateKey must be a non-empty string.");
		if (normalized.getState !== null && typeof normalized.getState !== "function") throw new TypeError("A11yTabsHistory: options.getState must be a function.");
		if (normalized.readState !== null && typeof normalized.readState !== "function") throw new TypeError("A11yTabsHistory: options.readState must be a function.");
		normalized.pushInitialState = Boolean(normalized.pushInitialState);
		return normalized;
	}
	onChange(event) {
		if (this.isRestoring) return;
		this.push(this.getContext(getTabsEventDetail(event)));
	}
	onPopState(event) {
		const panelId = this.readPanelId({ state: event.state });
		if (panelId) this.restorePanel(panelId);
	}
	restorePanel(panelId) {
		this.isRestoring = true;
		this.tabs.activateByPanelId(panelId);
		this.isRestoring = false;
	}
	push(context) {
		if (!context.panel?.id) return;
		const state = this.getState(context);
		const url = this.getUrl(context);
		history.pushState(state, "", url);
	}
	getState(context) {
		if (this.options.getState) return this.options.getState(context);
		return {
			...isRecord(history.state) ? history.state : {},
			[this.options.stateKey]: {
				panelId: context.panel?.id ?? "",
				tabId: context.tab?.id || "",
				index: context.index
			}
		};
	}
	getUrl(context) {
		const url = new URL(window.location.href);
		if (this.options.mode === "hash" && context.panel?.id) url.hash = encodeURIComponent(context.panel.id);
		else if (this.options.mode === "query" && context.panel?.id) url.searchParams.set(this.options.queryParam, context.panel.id);
		return url;
	}
	readPanelId({ state }) {
		const context = this.getActiveContext();
		if (this.options.mode === "state") {
			if (this.options.readState) return this.options.readState(state, context);
			if (!isRecord(state)) return null;
			const value = state[this.options.stateKey];
			return isRecord(value) && typeof value.panelId === "string" ? value.panelId : null;
		}
		if (this.options.mode === "query") return new URL(window.location.href).searchParams.get(this.options.queryParam);
		return this.getHashValue();
	}
	getActiveContext() {
		const tab = this.tabs.getActiveTab();
		const panel = this.tabs.getActivePanel();
		const tabs = this.getTabs();
		return this.getContext({
			tab,
			panel,
			index: tab ? tabs.indexOf(tab) : -1,
			previousIndex: -1
		});
	}
	getContext(detail = {}) {
		return {
			tabs: this.tabs,
			root: this.root,
			tab: detail.tab ?? null,
			panel: detail.panel ?? null,
			index: Number.isInteger(detail.index) ? detail.index ?? -1 : -1,
			previousIndex: Number.isInteger(detail.previousIndex) ? detail.previousIndex ?? -1 : -1
		};
	}
	getHashValue() {
		const hash = window.location.hash.slice(1);
		if (!hash) return null;
		try {
			return decodeURIComponent(hash);
		} catch {
			return hash;
		}
	}
	getTabs() {
		return getTabs(this.root);
	}
};
//#endregion
export { A11yTabsHistory };

//# sourceMappingURL=a11y-tabs-history.js.map