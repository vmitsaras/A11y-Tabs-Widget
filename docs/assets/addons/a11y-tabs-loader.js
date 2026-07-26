import { escapeSelectorValue, getPanels, getTabsEventDetail, resolveRoot, resolveTabs } from "./shared.js";
//#region src/addons/a11y-tabs-loader.ts
const DEFAULT_OPTIONS = Object.freeze({
	srcAttribute: "data-tab-src",
	cache: true,
	contentType: "html",
	loadingText: "Loading tab content…",
	loadedText: "Tab content loaded.",
	errorText: "Unable to load tab content.",
	retryText: "Retry",
	statusClass: "a11y-tabs__loader-status",
	errorClass: "a11y-tabs__loader-error",
	retryClass: "a11y-tabs__loader-retry",
	fetchOptions: void 0,
	sanitize: null,
	allowUnsafeHtml: false,
	renderContent: null,
	renderError: null,
	onLoad: null,
	onError: null,
	onRetry: null
});
/**
* Optional add-on that lazy-loads remote panel content on first activation.
*
* Panels opt in with data-tab-src by default. HTML responses are only injected
* when a sanitize callback is supplied, allowUnsafeHtml is true, or a custom
* renderContent callback takes responsibility for rendering.
*/
var A11yTabsLoader = class {
	tabs;
	root;
	options;
	states = /* @__PURE__ */ new WeakMap();
	loadedPanels = /* @__PURE__ */ new WeakSet();
	controllers = /* @__PURE__ */ new Map();
	retryContexts = /* @__PURE__ */ new WeakMap();
	destroyed = false;
	handleChange = this.onChange.bind(this);
	handleDestroy = this.destroy.bind(this);
	handleRetryClick = this.onRetryClick.bind(this);
	constructor(target, options = {}) {
		this.tabs = resolveTabs(target, "A11yTabsLoader");
		this.root = resolveRoot(target, this.tabs, "A11yTabsLoader");
		this.options = {
			...DEFAULT_OPTIONS,
			...options
		};
		this.root.addEventListener("a11y-tabs:change", this.handleChange);
		this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
		this.load(this.tabs.getActivePanel());
	}
	async load(panel = this.tabs.getActivePanel()) {
		if (this.destroyed || !(panel instanceof HTMLElement)) return null;
		const src = panel.getAttribute(this.options.srcAttribute);
		if (!src) return null;
		if (this.shouldUseCache(panel)) return this.getState(panel).content;
		this.controllers.get(panel)?.abort();
		const controller = typeof AbortController === "function" ? new AbortController() : null;
		if (controller) this.controllers.set(panel, controller);
		const context = this.createContext(panel, { src });
		this.setLoading(panel, context);
		try {
			const response = await fetch(src, this.getFetchOptions(context, controller));
			if (!response.ok) throw new Error(`A11yTabsLoader: request failed with ${response.status}.`);
			const content = await response.text();
			const nextContext = this.createContext(panel, {
				src,
				response,
				content
			});
			this.renderContent(nextContext);
			this.loadedPanels.add(panel);
			this.getState(panel).content = content;
			this.setLiveMessage(panel, this.format(this.options.loadedText, nextContext));
			panel.removeAttribute("aria-busy");
			this.options.onLoad?.(nextContext);
			return content;
		} catch (error) {
			if (this.isAbortError(error)) return null;
			const errorContext = this.createContext(panel, {
				src,
				error
			});
			this.renderError(errorContext);
			panel.removeAttribute("aria-busy");
			this.options.onError?.(errorContext);
			return null;
		} finally {
			if (controller && this.controllers.get(panel) === controller) this.controllers.delete(panel);
		}
	}
	reload(panel = this.tabs.getActivePanel()) {
		if (panel instanceof HTMLElement) {
			this.loadedPanels.delete(panel);
			this.getState(panel).content = null;
		}
		return this.load(panel);
	}
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.root.removeEventListener("a11y-tabs:change", this.handleChange);
		this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
		this.controllers.forEach((controller) => controller.abort());
		this.controllers.clear();
		this.getPanels().forEach((panel) => {
			const state = this.states.get(panel);
			if (!state) return;
			state.status?.remove();
			this.clearError(state);
			panel.removeAttribute("aria-busy");
		});
	}
	onChange(event) {
		const detail = getTabsEventDetail(event);
		this.load(detail.panel ?? null);
	}
	shouldUseCache(panel) {
		return this.options.cache !== false && this.options.cache !== "reload" && this.loadedPanels.has(panel);
	}
	setLoading(panel, context) {
		const state = this.getState(panel);
		this.clearError(state);
		panel.setAttribute("aria-busy", "true");
		this.setLiveMessage(panel, this.format(this.options.loadingText, context));
	}
	renderContent(context) {
		const { panel, content = "" } = context;
		const state = this.getState(panel);
		this.clearError(state);
		if (this.options.renderContent) {
			this.options.renderContent(context);
			return;
		}
		if (this.options.contentType === "text") {
			panel.textContent = content;
			panel.append(this.getStatus(panel));
			return;
		}
		if (typeof this.options.sanitize === "function") {
			panel.innerHTML = this.options.sanitize(content, context);
			panel.append(this.getStatus(panel));
			return;
		}
		if (this.options.allowUnsafeHtml === true) {
			panel.innerHTML = content;
			panel.append(this.getStatus(panel));
			return;
		}
		throw new TypeError("A11yTabsLoader: provide options.sanitize, options.renderContent, or set contentType to \"text\" before loading HTML.");
	}
	renderError(context) {
		const { panel } = context;
		const state = this.getState(panel);
		const message = this.format(this.options.errorText, context);
		if (this.options.renderError) {
			this.setLiveMessage(panel, message);
			const rendered = this.options.renderError(context);
			if (rendered instanceof Node) {
				this.clearError(state);
				state.error = rendered;
				panel.append(rendered);
			}
			return;
		}
		this.getStatus(panel).textContent = "";
		const error = document.createElement("div");
		error.className = this.options.errorClass;
		error.setAttribute("role", "alert");
		const text = document.createElement("p");
		text.textContent = message;
		error.append(text);
		const retry = document.createElement("button");
		retry.type = "button";
		retry.className = this.options.retryClass;
		retry.textContent = this.format(this.options.retryText, context);
		retry.addEventListener("click", this.handleRetryClick);
		this.retryContexts.set(retry, context);
		error.append(retry);
		this.clearError(state);
		state.error = error;
		panel.append(error);
	}
	onRetryClick(event) {
		if (!(event.currentTarget instanceof HTMLButtonElement)) return;
		const context = this.retryContexts.get(event.currentTarget);
		if (!context) return;
		this.options.onRetry?.(context);
		this.reload(context.panel);
	}
	setLiveMessage(panel, message) {
		const status = this.getStatus(panel);
		status.textContent = message;
	}
	getStatus(panel) {
		const state = this.getState(panel);
		if (!state.status) {
			state.status = document.createElement("div");
			state.status.className = this.options.statusClass;
			state.status.setAttribute("role", "status");
			state.status.setAttribute("aria-live", "polite");
			panel.prepend(state.status);
		}
		return state.status;
	}
	getState(panel) {
		let state = this.states.get(panel);
		if (!state) {
			state = {
				status: null,
				error: null,
				content: null
			};
			this.states.set(panel, state);
		}
		return state;
	}
	clearError(state) {
		if (state.error instanceof Element) state.error.querySelectorAll("button").forEach((button) => {
			if (button instanceof HTMLButtonElement && this.retryContexts.has(button)) {
				button.removeEventListener("click", this.handleRetryClick);
				this.retryContexts.delete(button);
			}
		});
		state.error?.parentNode?.removeChild(state.error);
		state.error = null;
	}
	getFetchOptions(context, controller) {
		const fetchOptions = typeof this.options.fetchOptions === "function" ? this.options.fetchOptions(context) : this.options.fetchOptions;
		if (!fetchOptions && !controller) return;
		const base = fetchOptions ?? {};
		return {
			...base,
			signal: controller?.signal ?? base.signal
		};
	}
	createContext(panel, extra = {}) {
		return {
			loader: this,
			tabs: this.tabs,
			root: this.root,
			tab: this.getTabForPanel(panel),
			panel,
			...extra
		};
	}
	format(value, context) {
		return typeof value === "function" ? String(value(context)) : String(value ?? "");
	}
	getTabForPanel(panel) {
		if (!panel.id) return null;
		return this.root.querySelector(`[role="tab"][aria-controls="${escapeSelectorValue(panel.id)}"]`);
	}
	getPanels() {
		return getPanels(this.root);
	}
	isAbortError(error) {
		return error instanceof DOMException && error.name === "AbortError" || typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
	}
};
//#endregion
export { A11yTabsLoader, A11yTabsLoader as default };

//# sourceMappingURL=a11y-tabs-loader.js.map