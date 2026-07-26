import { initTabsAll } from "../index.js";
//#region src/addons/a11y-tabs-autoinit.ts
const A11Y_TABS_INIT_REQUEST = "a11y-tabs:request-init";
const installations = /* @__PURE__ */ new WeakMap();
function isAutoInitScope(value) {
	if (typeof value !== "object" || value === null) return false;
	const scope = value;
	return typeof scope.querySelectorAll === "function" && typeof scope.addEventListener === "function" && typeof scope.removeEventListener === "function";
}
function getDefaultScope() {
	return typeof document === "undefined" ? null : document;
}
function isDocumentScope(scope) {
	return scope.nodeType === 9 && "readyState" in scope;
}
var TabsAutoInitControllerImpl = class {
	options;
	scope;
	destroyed = false;
	waitingForDomReady = false;
	handleDomReady = () => {
		this.waitingForDomReady = false;
		this.init();
	};
	handleInitRequest = (event) => {
		const requestScope = isAutoInitScope(event.target) ? event.target : this.scope;
		if (requestScope) this.init(requestScope);
	};
	constructor(options, scope) {
		this.options = { ...options };
		this.scope = scope;
		if (!scope) return;
		scope.addEventListener(A11Y_TABS_INIT_REQUEST, this.handleInitRequest);
		if (isDocumentScope(scope) && scope.readyState === "loading") {
			this.waitingForDomReady = true;
			scope.addEventListener("DOMContentLoaded", this.handleDomReady, { once: true });
			return;
		}
		this.init();
	}
	init(scope = this.scope ?? void 0) {
		if (this.destroyed || !scope) return [];
		return initTabsAll(this.options, scope);
	}
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		if (!this.scope) return;
		this.scope.removeEventListener(A11Y_TABS_INIT_REQUEST, this.handleInitRequest);
		if (this.waitingForDomReady) {
			this.scope.removeEventListener("DOMContentLoaded", this.handleDomReady);
			this.waitingForDomReady = false;
		}
		installations.delete(this.scope);
	}
};
/**
* Explicitly install document-ready and event-driven tabs initialization.
*
* Importing this module has no side effects. The first installation for a scope
* initializes existing tabs when that scope is ready. Later calls for the same
* scope reuse the current controller and ignore replacement options.
*/
function installTabsAutoInit(options = {}, scope = getDefaultScope() ?? void 0) {
	if (scope) {
		const existing = installations.get(scope);
		if (existing) return existing;
	}
	const controller = new TabsAutoInitControllerImpl(options, scope ?? null);
	if (scope) installations.set(scope, controller);
	return controller;
}
//#endregion
export { A11Y_TABS_INIT_REQUEST, installTabsAutoInit };

//# sourceMappingURL=a11y-tabs-autoinit.js.map