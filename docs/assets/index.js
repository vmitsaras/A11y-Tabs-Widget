//#region src/index.ts
const COMPONENT_NAME = "a11y-tabs";
const DEFAULT_OPTIONS = Object.freeze({
	activation: "manual",
	orientation: "horizontal",
	dir: "auto",
	useHash: false,
	scrollSelectedIntoView: true,
	initialIndex: null
});
const SELECTORS = Object.freeze({
	root: "[data-a11y-tabs], .a11y-tabs",
	list: "[data-a11y-tabs-list], [data-tabs-list]",
	tab: "[data-a11y-tabs-tab], [data-tab-target]",
	panel: "[data-a11y-tabs-panel], [data-tab-panel]"
});
const CLASSES = Object.freeze({
	initialized: "is-initialized",
	active: "is-active",
	disabled: "is-disabled"
});
const ATTRIBUTES = Object.freeze({
	role: "role",
	selected: "aria-selected",
	controls: "aria-controls",
	labelledBy: "aria-labelledby",
	disabled: "aria-disabled",
	orientation: "aria-orientation",
	hidden: "hidden",
	tabIndex: "tabindex"
});
const EVENTS = Object.freeze({
	init: `${COMPONENT_NAME}:init`,
	beforeChange: `${COMPONENT_NAME}:before-change`,
	change: `${COMPONENT_NAME}:change`,
	destroy: `${COMPONENT_NAME}:destroy`
});
const VALID_ACTIVATIONS = /* @__PURE__ */ new Set(["manual", "automatic"]);
const VALID_ORIENTATIONS = /* @__PURE__ */ new Set(["horizontal", "vertical"]);
const VALID_DIRECTIONS = /* @__PURE__ */ new Set([
	"auto",
	"ltr",
	"rtl"
]);
function toSafeBoolean(value, fallback) {
	if (value === true || value === "true") return true;
	if (value === false || value === "false") return false;
	return fallback;
}
function toSafeInteger(value, fallback, options = {}) {
	const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
	if (!Number.isFinite(parsed)) return fallback;
	if (options.min !== void 0 && parsed < options.min) return fallback;
	if (options.max !== void 0 && parsed > options.max) return fallback;
	return parsed;
}
function toSafeString(value, fallback) {
	const normalized = String(value ?? "").trim();
	return normalized.length > 0 ? normalized : fallback;
}
function toSafeChoice(value, fallback, choices) {
	const normalized = toSafeString(value, fallback);
	return choices.has(normalized) ? normalized : fallback;
}
function getDatasetOptions(root) {
	return {
		activation: root.dataset.a11yTabsActivation,
		orientation: root.dataset.a11yTabsOrientation,
		dir: root.dataset.a11yTabsDir,
		useHash: root.dataset.a11yTabsUseHash,
		scrollSelectedIntoView: root.dataset.a11yTabsScrollSelectedIntoView,
		initialIndex: root.dataset.a11yTabsInitialIndex
	};
}
function normalizeOptions(root, options = {}) {
	const datasetOptions = getDatasetOptions(root);
	const initialIndexValue = options.initialIndex ?? datasetOptions.initialIndex ?? void 0;
	const parsedInitialIndex = initialIndexValue === void 0 ? -1 : toSafeInteger(initialIndexValue, -1, { min: 0 });
	return {
		activation: toSafeChoice(options.activation ?? datasetOptions.activation, DEFAULT_OPTIONS.activation, VALID_ACTIVATIONS),
		orientation: toSafeChoice(options.orientation ?? datasetOptions.orientation, DEFAULT_OPTIONS.orientation, VALID_ORIENTATIONS),
		dir: toSafeChoice(options.dir ?? datasetOptions.dir, DEFAULT_OPTIONS.dir, VALID_DIRECTIONS),
		useHash: toSafeBoolean(options.useHash ?? datasetOptions.useHash, DEFAULT_OPTIONS.useHash),
		scrollSelectedIntoView: toSafeBoolean(options.scrollSelectedIntoView ?? datasetOptions.scrollSelectedIntoView, DEFAULT_OPTIONS.scrollSelectedIntoView),
		initialIndex: parsedInitialIndex >= 0 ? parsedInitialIndex : null
	};
}
function isHTMLElement(element) {
	return typeof HTMLElement !== "undefined" && element instanceof HTMLElement;
}
function isDisableable(element) {
	return "disabled" in element;
}
function getTabPanelId(tab) {
	return tab.dataset.a11yTabsPanelId ?? tab.dataset.tabTarget ?? tab.getAttribute(ATTRIBUTES.controls) ?? void 0;
}
function restoreAttribute(element, attribute, originalValue) {
	if (originalValue === null) {
		element.removeAttribute(attribute);
		return;
	}
	element.setAttribute(attribute, originalValue);
}
function restoreClass(element, className, wasPresent) {
	element.classList.toggle(className, wasPresent);
}
var A11yTabs = class A11yTabs {
	static instances = /* @__PURE__ */ new WeakMap();
	static instanceCounter = 0;
	root;
	options;
	list = null;
	tabs = [];
	panels = [];
	activeIndex = 0;
	focusedIndex = 0;
	instanceId = 0;
	destroyed = false;
	hadInitializedClass = false;
	generatedTabIds = /* @__PURE__ */ new Set();
	generatedPanelIds = /* @__PURE__ */ new Set();
	originalListState = {
		role: null,
		orientation: null
	};
	originalTabStates = [];
	originalPanelStates = [];
	handleKeydown = this.onKeydown.bind(this);
	handleClick = this.onClick.bind(this);
	handleHashChange = this.onHashChange.bind(this);
	constructor(root, options = {}) {
		if (!isHTMLElement(root)) throw new TypeError("A11yTabs: first argument must be an HTMLElement.");
		const existingInstance = A11yTabs.instances.get(root);
		if (existingInstance) return existingInstance;
		this.root = root;
		this.options = normalizeOptions(root, options);
		this.instanceId = ++A11yTabs.instanceCounter;
		this.hadInitializedClass = root.classList.contains(CLASSES.initialized);
		A11yTabs.instances.set(root, this);
		this.init();
	}
	init() {
		this.list = this.root.querySelector(SELECTORS.list);
		if (!isHTMLElement(this.list)) {
			console.warn("A11yTabs: no tab list element found inside root.");
			this.dispatch(EVENTS.init);
			return;
		}
		this.tabs = this.getTabs();
		this.panels = this.getPanels();
		if (this.tabs.length === 0) {
			console.warn("A11yTabs: no tab elements found.");
			this.dispatch(EVENTS.init);
			return;
		}
		this.snapshotOriginalState();
		this.root.classList.add(CLASSES.initialized);
		this.setupTablist();
		this.setupTabsAndPanels();
		this.activeIndex = this.determineInitialIndex();
		this.focusedIndex = this.activeIndex;
		this.applyState(this.activeIndex);
		this.scrollTabIntoView(this.tabs[this.activeIndex]);
		this.list.addEventListener("keydown", this.handleKeydown);
		this.list.addEventListener("click", this.handleClick);
		if (this.options.useHash && typeof window !== "undefined") {
			this.activateFromHash();
			window.addEventListener("hashchange", this.handleHashChange);
		}
		this.dispatch(EVENTS.init);
	}
	getTabs() {
		if (!this.list) return [];
		return Array.from(this.list.querySelectorAll(SELECTORS.tab)).filter((tab) => isHTMLElement(tab) && tab.closest(SELECTORS.list) === this.list);
	}
	getPanels() {
		const rootPanels = Array.from(this.root.querySelectorAll(SELECTORS.panel)).filter((panel) => isHTMLElement(panel) && (panel.closest(SELECTORS.root) === this.root || panel.closest(SELECTORS.root) === null));
		return this.tabs.map((tab, index) => {
			const targetId = getTabPanelId(tab);
			return rootPanels.find((panel) => panel.id === targetId) ?? rootPanels[index];
		}).filter((panel) => isHTMLElement(panel)).filter((panel, index, panels) => panels.indexOf(panel) === index);
	}
	snapshotOriginalState() {
		if (!this.list) return;
		this.originalListState = {
			role: this.list.getAttribute(ATTRIBUTES.role),
			orientation: this.list.getAttribute(ATTRIBUTES.orientation)
		};
		this.originalTabStates = this.tabs.map((tab) => ({
			role: tab.getAttribute(ATTRIBUTES.role),
			selected: tab.getAttribute(ATTRIBUTES.selected),
			controls: tab.getAttribute(ATTRIBUTES.controls),
			disabled: tab.getAttribute(ATTRIBUTES.disabled),
			tabIndex: tab.getAttribute(ATTRIBUTES.tabIndex),
			id: tab.getAttribute("id"),
			activeClass: tab.classList.contains(CLASSES.active),
			disabledClass: tab.classList.contains(CLASSES.disabled)
		}));
		this.originalPanelStates = this.panels.map((panel) => ({
			role: panel.getAttribute(ATTRIBUTES.role),
			labelledBy: panel.getAttribute(ATTRIBUTES.labelledBy),
			tabIndex: panel.getAttribute(ATTRIBUTES.tabIndex),
			id: panel.getAttribute("id"),
			hidden: panel.hasAttribute(ATTRIBUTES.hidden),
			activeClass: panel.classList.contains(CLASSES.active)
		}));
	}
	setupTablist() {
		if (!this.list) return;
		this.list.setAttribute(ATTRIBUTES.role, "tablist");
		if (this.options.orientation === "vertical") {
			this.list.setAttribute(ATTRIBUTES.orientation, "vertical");
			return;
		}
		this.list.removeAttribute(ATTRIBUTES.orientation);
	}
	setupTabsAndPanels() {
		this.tabs.forEach((tab, index) => {
			if (!tab.id) {
				const generated = `${COMPONENT_NAME}-tab-${this.instanceId}-${index + 1}`;
				tab.id = generated;
				this.generatedTabIds.add(generated);
			}
			tab.setAttribute(ATTRIBUTES.role, "tab");
			tab.setAttribute(ATTRIBUTES.disabled, this.isDisabled(tab) ? "true" : "false");
			const panel = this.getPanelForTabByMarkup(tab) ?? this.panels[index];
			if (panel) {
				if (!panel.id) {
					const generated = `${COMPONENT_NAME}-panel-${this.instanceId}-${index + 1}`;
					panel.id = generated;
					this.generatedPanelIds.add(generated);
				}
				tab.setAttribute(ATTRIBUTES.controls, panel.id);
			}
		});
		this.panels.forEach((panel, index) => {
			if (!panel.id) {
				const generated = `${COMPONENT_NAME}-panel-${this.instanceId}-${index + 1}`;
				panel.id = generated;
				this.generatedPanelIds.add(generated);
			}
			panel.setAttribute(ATTRIBUTES.role, "tabpanel");
			panel.setAttribute(ATTRIBUTES.tabIndex, "0");
			const controllingTab = this.tabs.find((tab) => tab.getAttribute(ATTRIBUTES.controls) === panel.id);
			if (controllingTab) panel.setAttribute(ATTRIBUTES.labelledBy, controllingTab.id);
		});
	}
	determineInitialIndex() {
		if (this.options.initialIndex !== null && this.canActivateIndex(this.options.initialIndex)) return this.options.initialIndex;
		for (let index = 0; index < this.tabs.length; index += 1) if (!this.isDisabled(this.tabs[index]) && this.originalTabStates[index]?.selected === "true") return index;
		for (let index = 0; index < this.panels.length; index += 1) if (!this.originalPanelStates[index]?.hidden) {
			const panel = this.panels[index];
			const tabIndex = this.tabs.findIndex((tab) => tab.getAttribute(ATTRIBUTES.controls) === panel.id);
			if (this.canActivateIndex(tabIndex)) return tabIndex;
		}
		const firstEnabledIndex = this.tabs.findIndex((tab) => !this.isDisabled(tab));
		return firstEnabledIndex >= 0 ? firstEnabledIndex : 0;
	}
	applyState(activeIndex) {
		this.tabs.forEach((tab, index) => {
			const disabled = this.isDisabled(tab);
			const active = index === activeIndex && !disabled;
			tab.setAttribute(ATTRIBUTES.disabled, disabled ? "true" : "false");
			tab.setAttribute(ATTRIBUTES.selected, active ? "true" : "false");
			tab.setAttribute(ATTRIBUTES.tabIndex, active ? "0" : "-1");
			tab.classList.toggle(CLASSES.active, active);
			tab.classList.toggle(CLASSES.disabled, disabled);
		});
		this.panels.forEach((panel, index) => {
			const tab = this.getTabForPanel(panel);
			const tabIndex = tab ? this.tabs.indexOf(tab) : index;
			const activeTab = this.tabs[activeIndex];
			const active = tabIndex === activeIndex && activeTab !== void 0 && !this.isDisabled(activeTab);
			panel.classList.toggle(CLASSES.active, active);
			if (active) {
				panel.removeAttribute(ATTRIBUTES.hidden);
				return;
			}
			panel.setAttribute(ATTRIBUTES.hidden, "");
		});
	}
	activateIndex(index) {
		if (!this.canActivateIndex(index)) return false;
		if (index === this.activeIndex) {
			this.focusedIndex = index;
			this.applyState(index);
			return true;
		}
		const previousIndex = this.activeIndex;
		const tab = this.tabs[index];
		const panel = this.getPanelForTab(tab);
		if (!this.dispatch(EVENTS.beforeChange, {
			tab,
			panel,
			index,
			previousIndex
		})) {
			this.focusedIndex = this.activeIndex;
			this.applyState(this.activeIndex);
			this.tabs[this.activeIndex]?.focus();
			return false;
		}
		this.activeIndex = index;
		this.focusedIndex = index;
		this.applyState(index);
		this.scrollTabIntoView(tab);
		this.updateHash(panel);
		this.dispatch(EVENTS.change, {
			tab,
			panel,
			index,
			previousIndex
		});
		return true;
	}
	canActivateIndex(index) {
		return Number.isInteger(index) && index >= 0 && index < this.tabs.length && !this.isDisabled(this.tabs[index]);
	}
	onKeydown(event) {
		const eventTarget = event.target;
		if (!(eventTarget instanceof Element) || !this.list) return;
		const currentTab = eventTarget.closest("[role=\"tab\"]");
		if (!isHTMLElement(currentTab) || !this.list.contains(currentTab)) return;
		const vertical = this.options.orientation === "vertical";
		const rtl = !vertical && this.getDirection() === "rtl";
		const previousKey = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
		const nextKey = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
		switch (event.key) {
			case nextKey:
				event.preventDefault();
				this.moveFocus(1);
				break;
			case previousKey:
				event.preventDefault();
				this.moveFocus(-1);
				break;
			case "Home":
				event.preventDefault();
				this.focusFirst();
				break;
			case "End":
				event.preventDefault();
				this.focusLast();
				break;
			case "Enter":
			case " ":
				if (this.options.activation === "manual") {
					event.preventDefault();
					this.activateIndex(this.focusedIndex);
				}
				break;
		}
	}
	onClick(event) {
		const eventTarget = event.target;
		if (!(eventTarget instanceof Element) || !this.list) return;
		const tab = eventTarget.closest("[role=\"tab\"]");
		if (!isHTMLElement(tab) || !this.list.contains(tab)) return;
		const index = this.tabs.indexOf(tab);
		if (index === -1 || this.isDisabled(tab)) return;
		this.focusTab(index);
		if (this.options.activation === "manual") this.activateIndex(index);
	}
	moveFocus(direction) {
		const next = this.getEnabledIndex(this.focusedIndex, direction);
		if (next !== -1) this.focusTab(next);
	}
	focusFirst() {
		const index = this.tabs.findIndex((tab) => !this.isDisabled(tab));
		if (index !== -1) this.focusTab(index);
	}
	focusLast() {
		for (let index = this.tabs.length - 1; index >= 0; index -= 1) if (!this.isDisabled(this.tabs[index])) {
			this.focusTab(index);
			return;
		}
	}
	focusTab(index) {
		if (!this.canActivateIndex(index)) return;
		this.focusedIndex = index;
		this.tabs.forEach((tab, tabIndex) => {
			tab.setAttribute(ATTRIBUTES.tabIndex, tabIndex === index && !this.isDisabled(tab) ? "0" : "-1");
		});
		this.tabs[index].focus();
		this.scrollTabIntoView(this.tabs[index]);
		if (this.options.activation === "automatic") this.activateIndex(index);
	}
	activateFromHash() {
		const hash = this.getHashValue();
		if (!hash) return;
		this.activateByPanelId(hash);
	}
	onHashChange() {
		this.activateFromHash();
	}
	updateHash(panel) {
		if (!this.options.useHash || !panel || typeof history === "undefined") return;
		history.replaceState(null, "", `#${encodeURIComponent(panel.id)}`);
	}
	getDirection() {
		if (this.options.dir !== "auto") return this.options.dir;
		const explicitDirection = this.root.closest("[dir]")?.getAttribute("dir");
		if (explicitDirection === "rtl" || explicitDirection === "ltr") return explicitDirection;
		if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
			const computedDirection = window.getComputedStyle(this.root).direction;
			if (computedDirection === "rtl" || computedDirection === "ltr") return computedDirection;
		}
		return typeof document !== "undefined" && document.dir === "rtl" ? "rtl" : "ltr";
	}
	getHashValue() {
		if (typeof window === "undefined") return "";
		const hash = window.location.hash.slice(1);
		try {
			return decodeURIComponent(hash);
		} catch {
			return hash;
		}
	}
	isDisabled(tab) {
		return isDisableable(tab) && tab.disabled || tab.getAttribute(ATTRIBUTES.disabled) === "true";
	}
	getEnabledIndex(startIndex, direction) {
		const { length } = this.tabs;
		let next = startIndex;
		for (let count = 0; count < length; count += 1) {
			next = (next + direction + length) % length;
			if (!this.isDisabled(this.tabs[next])) return next;
		}
		return -1;
	}
	scrollTabIntoView(tab) {
		if (!this.options.scrollSelectedIntoView || !tab || !this.list || typeof window === "undefined" || typeof window.getComputedStyle !== "function") return;
		const listStyle = window.getComputedStyle(this.list);
		const canScrollHorizontally = /(auto|scroll|overlay)/.test(listStyle.overflowX) && this.list.scrollWidth > this.list.clientWidth;
		const canScrollVertically = /(auto|scroll|overlay)/.test(listStyle.overflowY) && this.list.scrollHeight > this.list.clientHeight;
		if (canScrollHorizontally) {
			const tabStart = tab.offsetLeft;
			const tabEnd = tabStart + tab.offsetWidth;
			const viewStart = this.list.scrollLeft;
			const viewEnd = viewStart + this.list.clientWidth;
			if (tabStart < viewStart) this.list.scrollLeft = tabStart;
			else if (tabEnd > viewEnd) this.list.scrollLeft = tabEnd - this.list.clientWidth;
		}
		if (canScrollVertically) {
			const tabStart = tab.offsetTop;
			const tabEnd = tabStart + tab.offsetHeight;
			const viewStart = this.list.scrollTop;
			const viewEnd = viewStart + this.list.clientHeight;
			if (tabStart < viewStart) this.list.scrollTop = tabStart;
			else if (tabEnd > viewEnd) this.list.scrollTop = tabEnd - this.list.clientHeight;
		}
	}
	getPanelForTabByMarkup(tab) {
		const panelId = getTabPanelId(tab);
		if (!panelId) return null;
		return this.panels.find((panel) => panel.id === panelId) ?? null;
	}
	getPanelForTab(tab) {
		const controlsId = tab.getAttribute(ATTRIBUTES.controls);
		if (!controlsId) return null;
		return this.panels.find((panel) => panel.id === controlsId) ?? null;
	}
	getTabForPanel(panel) {
		return this.tabs.find((tab) => tab.getAttribute(ATTRIBUTES.controls) === panel.id) ?? null;
	}
	dispatch(type, detail = {}) {
		return this.root.dispatchEvent(new CustomEvent(type, {
			bubbles: true,
			cancelable: type === EVENTS.beforeChange,
			detail: {
				instance: this,
				...detail
			}
		}));
	}
	activate(indexOrId) {
		if (typeof indexOrId === "number" && Number.isInteger(indexOrId)) return this.activateIndex(indexOrId);
		const index = this.tabs.findIndex((tab) => tab.id === indexOrId);
		return index !== -1 ? this.activateIndex(index) : false;
	}
	activateByPanelId(panelId) {
		const index = this.tabs.findIndex((tab) => tab.getAttribute(ATTRIBUTES.controls) === panelId);
		return index !== -1 ? this.activateIndex(index) : false;
	}
	next() {
		const index = this.getEnabledIndex(this.activeIndex, 1);
		return index !== -1 ? this.activateIndex(index) : false;
	}
	previous() {
		const index = this.getEnabledIndex(this.activeIndex, -1);
		return index !== -1 ? this.activateIndex(index) : false;
	}
	getActiveTab() {
		return this.tabs[this.activeIndex] ?? null;
	}
	getActivePanel() {
		const tab = this.getActiveTab();
		return tab ? this.getPanelForTab(tab) : null;
	}
	destroy() {
		if (this.destroyed) {
			A11yTabs.instances.delete(this.root);
			return;
		}
		if (this.list) {
			this.list.removeEventListener("keydown", this.handleKeydown);
			this.list.removeEventListener("click", this.handleClick);
			restoreAttribute(this.list, ATTRIBUTES.role, this.originalListState.role);
			restoreAttribute(this.list, ATTRIBUTES.orientation, this.originalListState.orientation);
		}
		if (this.options.useHash && typeof window !== "undefined") window.removeEventListener("hashchange", this.handleHashChange);
		this.tabs.forEach((tab, index) => {
			const original = this.originalTabStates[index];
			if (!original) return;
			restoreAttribute(tab, ATTRIBUTES.role, original.role);
			restoreAttribute(tab, ATTRIBUTES.selected, original.selected);
			restoreAttribute(tab, ATTRIBUTES.controls, original.controls);
			restoreAttribute(tab, ATTRIBUTES.disabled, original.disabled);
			restoreAttribute(tab, ATTRIBUTES.tabIndex, original.tabIndex);
			if (original.id === null && this.generatedTabIds.has(tab.id)) tab.removeAttribute("id");
			else restoreAttribute(tab, "id", original.id);
			restoreClass(tab, CLASSES.active, original.activeClass);
			restoreClass(tab, CLASSES.disabled, original.disabledClass);
		});
		this.panels.forEach((panel, index) => {
			const original = this.originalPanelStates[index];
			if (!original) return;
			restoreAttribute(panel, ATTRIBUTES.role, original.role);
			restoreAttribute(panel, ATTRIBUTES.labelledBy, original.labelledBy);
			restoreAttribute(panel, ATTRIBUTES.tabIndex, original.tabIndex);
			if (original.id === null && this.generatedPanelIds.has(panel.id)) panel.removeAttribute("id");
			else restoreAttribute(panel, "id", original.id);
			if (original.hidden) panel.setAttribute(ATTRIBUTES.hidden, "");
			else panel.removeAttribute(ATTRIBUTES.hidden);
			restoreClass(panel, CLASSES.active, original.activeClass);
		});
		restoreClass(this.root, CLASSES.initialized, this.hadInitializedClass);
		this.dispatch(EVENTS.destroy);
		A11yTabs.instances.delete(this.root);
		this.destroyed = true;
	}
};
function createTabs(root, options = {}) {
	return new A11yTabs(root, options);
}
function initTabsAll(options = {}, scope) {
	const searchRoot = scope ?? (typeof document !== "undefined" ? document : void 0);
	if (!searchRoot) return [];
	const roots = /* @__PURE__ */ new Set();
	if (typeof HTMLElement !== "undefined" && searchRoot instanceof HTMLElement && searchRoot.matches(SELECTORS.root)) roots.add(searchRoot);
	searchRoot.querySelectorAll(SELECTORS.root).forEach((root) => {
		if (isHTMLElement(root)) roots.add(root);
	});
	return Array.from(roots).map((root) => createTabs(root, options));
}
//#endregion
export { A11yTabs, createTabs, initTabsAll };

//# sourceMappingURL=index.js.map