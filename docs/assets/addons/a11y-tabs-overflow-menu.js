import { getTabs, getTabsList, isDisabledElement, resolveRoot, resolveTabs } from "./shared.js";
//#region src/addons/a11y-tabs-overflow-menu.ts
const DEFAULT_OPTIONS = Object.freeze({
	control: "menu",
	className: "a11y-tabs__overflow",
	label: "More tabs",
	menuButtonText: "More",
	observeInterval: 250
});
const VALID_CONTROLS = /* @__PURE__ */ new Set([
	"menu",
	"select",
	"jump-list",
	false,
	null
]);
/**
* Optional add-on that detects tablist overflow and mirrors the tabs into an
* auxiliary control for narrow containers.
*
* The original tablist is never hidden or replaced. Keyboard users can keep
* using the normal tablist arrow-key behavior, while the generated menu,
* select, or jump list provides a compact direct-jump alternative when the
* tablist overflows. The control is hidden when all tabs fit.
*/
var A11yTabsOverflowMenu = class {
	tabs;
	root;
	options;
	list;
	items = [];
	control = null;
	destroyed = false;
	isOverflowing = false;
	resizeObserver = null;
	fallbackTimer = null;
	originalRootOverflow;
	handleChange = this.update.bind(this);
	handleClick = (event) => {
		this.onClick(event);
	};
	handleSelectChange = this.onSelectChange.bind(this);
	handleDocumentClick = this.onDocumentClick.bind(this);
	handleKeydown = this.onKeydown.bind(this);
	handleResize = this.refresh.bind(this);
	handleDestroy = this.destroy.bind(this);
	handleMenuButtonClick = this.onMenuButtonClick.bind(this);
	handleMenuButtonKeydown = this.onMenuButtonKeydown.bind(this);
	constructor(target, options = {}) {
		this.tabs = resolveTabs(target, "A11yTabsOverflowMenu");
		this.root = resolveRoot(target, this.tabs, "A11yTabsOverflowMenu");
		this.options = {
			...DEFAULT_OPTIONS,
			...options
		};
		if (!VALID_CONTROLS.has(this.options.control)) throw new TypeError("A11yTabsOverflowMenu: options.control must be 'menu', 'select', 'jump-list', false, or null.");
		const list = this.getList();
		if (!list) throw new TypeError("A11yTabsOverflowMenu: no tab list element found.");
		this.list = list;
		this.originalRootOverflow = this.root.getAttribute("data-a11y-tabs-overflow");
		this.createControl();
		this.startObserving();
		this.root.addEventListener("a11y-tabs:change", this.handleChange);
		this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
		this.refresh();
		this.update();
	}
	/** Re-read the tablist dimensions and show/hide the auxiliary control. */
	refresh() {
		if (this.destroyed) return;
		const isOverflowing = this.detectOverflow();
		this.isOverflowing = isOverflowing;
		this.root.dataset.a11yTabsOverflow = isOverflowing ? "true" : "false";
		if (this.control) this.control.hidden = !isOverflowing;
	}
	/** Synchronise generated control options with selected and disabled tabs. */
	update() {
		if (this.destroyed) return;
		const tabs = this.getTabs();
		const activeTab = this.tabs.getActiveTab();
		const activeIndex = activeTab ? tabs.indexOf(activeTab) : -1;
		if (this.options.control === "select") this.syncSelect(tabs, activeIndex);
		else if (this.options.control === "menu" || this.options.control === "jump-list") this.syncButtons(tabs, activeIndex);
		this.refresh();
	}
	/** Remove generated controls and resize/change listeners. */
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.root.removeEventListener("a11y-tabs:change", this.handleChange);
		this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
		document.removeEventListener("click", this.handleDocumentClick);
		document.removeEventListener("keydown", this.handleKeydown);
		window.removeEventListener("resize", this.handleResize);
		this.items.forEach((item) => {
			item.removeEventListener("click", this.handleClick);
		});
		this.control?.querySelector("button[aria-haspopup=\"menu\"]")?.removeEventListener("click", this.handleMenuButtonClick);
		this.control?.querySelector("button[aria-haspopup=\"menu\"]")?.removeEventListener("keydown", this.handleMenuButtonKeydown);
		this.control?.querySelector("select")?.removeEventListener("change", this.handleSelectChange);
		this.resizeObserver?.disconnect();
		if (this.fallbackTimer !== null) window.clearInterval(this.fallbackTimer);
		this.control?.remove();
		this.control = null;
		this.items = [];
		this.restoreOverflowState();
	}
	createControl() {
		if (!this.options.control) return;
		if (this.options.control === "select") this.createSelect();
		else if (this.options.control === "jump-list") this.createJumpList();
		else this.createMenu();
		if (this.control) this.list.insertAdjacentElement("afterend", this.control);
	}
	createMenu() {
		const wrapper = document.createElement("div");
		wrapper.className = `${this.options.className} ${this.options.className}--menu`;
		wrapper.hidden = true;
		const button = document.createElement("button");
		button.type = "button";
		button.className = `${this.options.className}-button`;
		button.setAttribute("aria-haspopup", "menu");
		button.setAttribute("aria-expanded", "false");
		button.textContent = this.options.menuButtonText;
		button.addEventListener("click", this.handleMenuButtonClick);
		button.addEventListener("keydown", this.handleMenuButtonKeydown);
		const menu = document.createElement("div");
		menu.className = `${this.options.className}-panel`;
		menu.setAttribute("role", "menu");
		menu.setAttribute("aria-label", this.options.label);
		menu.hidden = true;
		this.getTabs().forEach((tab, index) => {
			const item = document.createElement("button");
			item.type = "button";
			item.className = `${this.options.className}-item`;
			item.setAttribute("role", "menuitemradio");
			item.dataset.a11yTabsOverflowIndex = String(index);
			item.textContent = tab.textContent?.trim() || `Tab ${index + 1}`;
			item.addEventListener("click", this.handleClick);
			menu.append(item);
			this.items.push(item);
		});
		wrapper.append(button, menu);
		this.control = wrapper;
	}
	createSelect() {
		const label = document.createElement("label");
		label.className = `${this.options.className} ${this.options.className}--select`;
		label.hidden = true;
		const labelText = document.createElement("span");
		labelText.className = `${this.options.className}-label`;
		labelText.textContent = this.options.label;
		const select = document.createElement("select");
		select.className = `${this.options.className}-select`;
		select.addEventListener("change", this.handleSelectChange);
		this.getTabs().forEach((tab, index) => {
			const option = document.createElement("option");
			option.value = String(index);
			option.textContent = tab.textContent?.trim() || `Tab ${index + 1}`;
			select.append(option);
			this.items.push(option);
		});
		label.append(labelText, select);
		this.control = label;
	}
	createJumpList() {
		const nav = document.createElement("nav");
		nav.className = `${this.options.className} ${this.options.className}--jump-list`;
		nav.setAttribute("aria-label", this.options.label);
		nav.hidden = true;
		this.getTabs().forEach((tab, index) => {
			const button = document.createElement("button");
			button.type = "button";
			button.className = `${this.options.className}-item`;
			button.dataset.a11yTabsOverflowIndex = String(index);
			button.textContent = tab.textContent?.trim() || `Tab ${index + 1}`;
			button.addEventListener("click", this.handleClick);
			nav.append(button);
			this.items.push(button);
		});
		this.control = nav;
	}
	startObserving() {
		if (typeof ResizeObserver === "function") {
			this.resizeObserver = new ResizeObserver(this.handleResize);
			this.resizeObserver.observe(this.list);
			this.resizeObserver.observe(this.root);
			return;
		}
		window.addEventListener("resize", this.handleResize);
		this.fallbackTimer = window.setInterval(this.handleResize, Math.max(100, Number(this.options.observeInterval) || DEFAULT_OPTIONS.observeInterval));
	}
	detectOverflow() {
		return this.list.scrollWidth > this.list.clientWidth + 1 || this.list.scrollHeight > this.list.clientHeight + 1;
	}
	onClick(event) {
		if (!(event.currentTarget instanceof HTMLElement)) return;
		const index = Number(event.currentTarget.dataset.a11yTabsOverflowIndex);
		if (this.tabs.activate(index)) {
			this.setMenuOpen(false);
			this.getTabs()[index]?.focus();
		}
	}
	onSelectChange(event) {
		if (!(event.currentTarget instanceof HTMLSelectElement)) return;
		this.tabs.activate(Number(event.currentTarget.value));
	}
	syncSelect(tabs, activeIndex) {
		const select = this.control?.querySelector("select");
		if (!select) return;
		Array.from(select.options).forEach((option, index) => {
			option.disabled = isDisabledElement(tabs[index]);
		});
		if (activeIndex >= 0) select.value = String(activeIndex);
	}
	syncButtons(tabs, activeIndex) {
		this.items.forEach((item, index) => {
			const isActive = index === activeIndex;
			const isDisabled = isDisabledElement(tabs[index]);
			item.disabled = isDisabled;
			item.setAttribute("aria-disabled", isDisabled ? "true" : "false");
			item.setAttribute("aria-current", isActive ? "page" : "false");
			if (this.options.control === "menu") item.setAttribute("aria-checked", isActive ? "true" : "false");
		});
	}
	onMenuButtonClick() {
		const menu = this.control?.querySelector("[role=\"menu\"]");
		if (!menu) return;
		this.setMenuOpen(menu.hidden === true);
	}
	onMenuButtonKeydown(event) {
		if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
		event.preventDefault();
		event.stopPropagation();
		this.setMenuOpen(true, false);
		const enabledItems = this.getEnabledMenuItems();
		(event.key === "ArrowUp" ? enabledItems[enabledItems.length - 1] : enabledItems[0])?.focus();
	}
	setMenuOpen(isOpen, restoreFocus = true) {
		if (this.options.control !== "menu" || !this.control) return;
		const button = this.control.querySelector("button[aria-haspopup=\"menu\"]");
		const menu = this.control.querySelector("[role=\"menu\"]");
		if (!button || !menu) return;
		button.setAttribute("aria-expanded", isOpen ? "true" : "false");
		menu.hidden = !isOpen;
		document.removeEventListener("click", this.handleDocumentClick);
		document.removeEventListener("keydown", this.handleKeydown);
		if (isOpen) {
			document.addEventListener("click", this.handleDocumentClick);
			document.addEventListener("keydown", this.handleKeydown);
			this.items.find((item) => !item.disabled)?.focus();
		} else if (restoreFocus) button.focus();
	}
	onDocumentClick(event) {
		if (this.control && event.target instanceof Node && !this.control.contains(event.target)) this.setMenuOpen(false, false);
	}
	onKeydown(event) {
		if (event.key === "Escape") {
			if (!this.isMenuOpen()) return;
			this.setMenuOpen(false);
			event.preventDefault();
			return;
		}
		if (!this.isMenuOpen()) return;
		const enabledItems = this.getEnabledMenuItems();
		const currentIndex = enabledItems.findIndex((item) => item === document.activeElement);
		if (currentIndex === -1) return;
		let nextIndex = null;
		if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % enabledItems.length;
		else if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
		else if (event.key === "Home") nextIndex = 0;
		else if (event.key === "End") nextIndex = enabledItems.length - 1;
		else if (event.key === "Tab") {
			this.setMenuOpen(false);
			return;
		}
		if (nextIndex !== null) {
			event.preventDefault();
			enabledItems[nextIndex]?.focus();
		}
	}
	isMenuOpen() {
		return (this.control?.querySelector("[role=\"menu\"]"))?.hidden === false;
	}
	getEnabledMenuItems() {
		return this.items.filter((item) => item instanceof HTMLButtonElement && !item.disabled);
	}
	getList() {
		return getTabsList(this.root);
	}
	getTabs() {
		return getTabs(this.root);
	}
	restoreOverflowState() {
		if (this.originalRootOverflow === null) delete this.root.dataset.a11yTabsOverflow;
		else this.root.dataset.a11yTabsOverflow = this.originalRootOverflow;
	}
};
//#endregion
export { A11yTabsOverflowMenu, A11yTabsOverflowMenu as default };

//# sourceMappingURL=a11y-tabs-overflow-menu.js.map