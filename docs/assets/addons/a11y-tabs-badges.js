import { getTabs, resolveRoot, resolveTabs } from "./shared.js";
//#region src/addons/a11y-tabs-badges.ts
const DEFAULT_OPTIONS = Object.freeze({
	badgeClass: "a11y-tabs__badge",
	visuallyHiddenClass: "a11y-tabs__sr-only",
	defaultVariant: "info",
	hideZero: true,
	includeVisualInName: false,
	labelMode: "aria-label",
	formatBadge: ({ count, text }) => text ?? count,
	formatAccessibleLabel: ({ tabLabel, count, text, label, variant }) => {
		const badgeText = label ? `${count} ${label}` : text ?? count;
		const status = variant && variant !== "info" ? `${variant}: ` : "";
		return badgeText === "" || badgeText === null || badgeText === void 0 ? tabLabel : `${tabLabel}, ${status}${badgeText}`;
	}
});
const VALID_LABEL_MODES = /* @__PURE__ */ new Set([
	"aria-label",
	"hidden-text",
	"none"
]);
/**
* Optional add-on that attaches status/count badges to A11yTabs tab buttons.
*
* Badge config keys may be either panel ids or tab ids. The visual badge is
* marked aria-hidden by default so the count/status does not get merged into
* the tab's accessible name. Use labelMode: "aria-label" or "hidden-text" to
* provide a deliberate screen-reader label.
*/
var A11yTabsBadges = class {
	tabs;
	root;
	options;
	badges = /* @__PURE__ */ new Map();
	entries = /* @__PURE__ */ new Map();
	destroyed = false;
	handleDestroy = this.destroy.bind(this);
	constructor(target, badges = {}, options = {}) {
		this.tabs = resolveTabs(target, "A11yTabsBadges");
		this.root = resolveRoot(target, this.tabs, "A11yTabsBadges");
		this.options = {
			...DEFAULT_OPTIONS,
			...options
		};
		if (!VALID_LABEL_MODES.has(this.options.labelMode)) throw new TypeError("A11yTabsBadges: options.labelMode must be 'aria-label', 'hidden-text', or 'none'.");
		this.getTabs().forEach((tab) => {
			this.entries.set(tab, {
				tab,
				badge: null,
				hiddenText: null,
				originalAriaLabel: tab.getAttribute("aria-label")
			});
		});
		this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);
		this.setBadges(badges);
	}
	/** Replace all badge configuration and render it. */
	setBadges(badges = {}) {
		this.badges = new Map(Object.entries(badges));
		this.update();
	}
	/** Set or clear a single badge by panel id or tab id. */
	setBadge(id, badge) {
		if (badge === null || badge === void 0 || badge === false) this.badges.delete(id);
		else this.badges.set(id, badge);
		this.update();
	}
	/** Convenience helper for changing only the count value. */
	updateCount(id, count) {
		const current = this.normalizeBadge(this.badges.get(id));
		this.setBadge(id, {
			...current,
			count
		});
	}
	/** Re-render badges from current configuration. */
	update() {
		this.entries.forEach((entry) => {
			const rawBadge = this.getBadgeForTab(entry.tab);
			const badge = rawBadge === void 0 ? null : this.normalizeBadge(rawBadge);
			if (!badge || this.shouldHide(badge)) {
				this.removeBadge(entry);
				this.restoreTabLabel(entry);
				return;
			}
			this.renderBadge(entry, badge);
			this.updateTabLabel(entry, badge);
		});
	}
	/** Remove generated badges, labels, and event listeners. */
	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.root.removeEventListener("a11y-tabs:destroy", this.handleDestroy);
		this.entries.forEach((entry) => {
			this.removeBadge(entry);
			this.restoreTabLabel(entry);
		});
		this.badges.clear();
		this.entries.clear();
	}
	renderBadge(entry, badge) {
		if (!entry.badge) {
			entry.badge = document.createElement("span");
			entry.badge.className = this.options.badgeClass;
			entry.tab.append(entry.badge);
		}
		const context = this.getContext(entry.tab, badge);
		const text = this.options.formatBadge(context);
		entry.badge.textContent = String(text ?? "");
		entry.badge.dataset.a11yTabsBadgeVariant = badge.variant;
		entry.badge.hidden = false;
		if (this.options.includeVisualInName) entry.badge.removeAttribute("aria-hidden");
		else entry.badge.setAttribute("aria-hidden", "true");
	}
	updateTabLabel(entry, badge) {
		if (this.options.labelMode === "none" || this.options.includeVisualInName) {
			this.removeHiddenText(entry);
			return;
		}
		const label = this.options.formatAccessibleLabel(this.getContext(entry.tab, badge));
		if (this.options.labelMode === "aria-label") {
			this.removeHiddenText(entry);
			entry.tab.setAttribute("aria-label", label);
			return;
		}
		entry.tab.removeAttribute("aria-label");
		if (!entry.hiddenText) {
			entry.hiddenText = document.createElement("span");
			entry.hiddenText.className = this.options.visuallyHiddenClass;
			entry.tab.append(entry.hiddenText);
		}
		entry.hiddenText.textContent = label.replace(this.getBaseTabLabel(entry.tab), "").replace(/^[\s,;:–—-]+/, "").trim();
	}
	restoreTabLabel(entry) {
		this.removeHiddenText(entry);
		if (entry.originalAriaLabel === null) entry.tab.removeAttribute("aria-label");
		else entry.tab.setAttribute("aria-label", entry.originalAriaLabel);
	}
	removeBadge(entry) {
		entry.badge?.remove();
		entry.badge = null;
	}
	removeHiddenText(entry) {
		entry.hiddenText?.remove();
		entry.hiddenText = null;
	}
	getBadgeForTab(tab) {
		const panelId = tab.getAttribute("aria-controls") ?? tab.dataset.tabTarget ?? void 0;
		if (panelId && this.badges.has(panelId)) return this.badges.get(panelId);
		if (tab.id && this.badges.has(tab.id)) return this.badges.get(tab.id);
	}
	normalizeBadge(badge) {
		if (typeof badge === "number" || typeof badge === "string") return {
			count: badge,
			variant: this.options.defaultVariant
		};
		return {
			count: badge?.count ?? "",
			text: badge?.text,
			label: badge?.label,
			variant: badge?.variant || this.options.defaultVariant,
			hideZero: badge?.hideZero
		};
	}
	shouldHide(badge) {
		return (badge.hideZero ?? this.options.hideZero) && (badge.count === 0 || badge.count === "0");
	}
	getContext(tab, badge) {
		const panelId = tab.getAttribute("aria-controls") ?? tab.dataset.tabTarget ?? "";
		const tabLabel = this.getBaseTabLabel(tab);
		return {
			tabs: this.tabs,
			root: this.root,
			tab,
			panelId,
			tabLabel,
			count: badge.count,
			text: badge.text ?? badge.count,
			label: badge.label,
			variant: badge.variant
		};
	}
	getBaseTabLabel(tab) {
		const clone = tab.cloneNode(true);
		if (!(clone instanceof HTMLElement)) return "";
		clone.querySelectorAll(`.${this.options.badgeClass}, .${this.options.visuallyHiddenClass}`).forEach((node) => node.remove());
		return clone.textContent?.trim().replace(/\s+/g, " ") ?? "";
	}
	getTabs() {
		return getTabs(this.root);
	}
};
//#endregion
export { A11yTabsBadges, A11yTabsBadges as default };

//# sourceMappingURL=a11y-tabs-badges.js.map