import {
  getTabs,
  resolveRoot,
  resolveTabs,
  type TabsTarget
} from "./shared.js";
import type { TabsInstance } from "../index.js";

type BadgeValue = string | number;
type BadgeLabelMode = "aria-label" | "hidden-text" | "none";
type BadgeInput = BadgeValue | BadgeConfig;
type BadgeMapInput = Record<string, BadgeInput>;

export interface BadgeConfig {
  count?: BadgeValue;
  text?: BadgeValue | null;
  label?: string;
  variant?: string;
  hideZero?: boolean;
}

interface NormalizedBadge {
  count: BadgeValue;
  text?: BadgeValue | null;
  label?: string;
  variant: string;
  hideZero?: boolean;
}

export interface BadgeContext {
  tabs: TabsInstance;
  root: HTMLElement;
  tab: HTMLElement;
  panelId: string;
  tabLabel: string;
  count: BadgeValue;
  text: BadgeValue;
  label?: string;
  variant: string;
}

export interface A11yTabsBadgesOptions {
  badgeClass?: string;
  visuallyHiddenClass?: string;
  defaultVariant?: string;
  hideZero?: boolean;
  includeVisualInName?: boolean;
  labelMode?: BadgeLabelMode;
  formatBadge?: (context: BadgeContext) => BadgeValue | null | undefined;
  formatAccessibleLabel?: (context: BadgeContext) => string;
}

interface NormalizedBadgesOptions {
  badgeClass: string;
  visuallyHiddenClass: string;
  defaultVariant: string;
  hideZero: boolean;
  includeVisualInName: boolean;
  labelMode: BadgeLabelMode;
  formatBadge: (context: BadgeContext) => BadgeValue | null | undefined;
  formatAccessibleLabel: (context: BadgeContext) => string;
}

interface BadgeEntry {
  tab: HTMLElement;
  badge: HTMLSpanElement | null;
  hiddenText: HTMLSpanElement | null;
  originalAriaLabel: string | null;
}

const DEFAULT_OPTIONS = Object.freeze({
  badgeClass: "a11y-tabs__badge",
  visuallyHiddenClass: "a11y-tabs__sr-only",
  defaultVariant: "info",
  hideZero: true,
  includeVisualInName: false,
  labelMode: "aria-label",
  formatBadge: ({ count, text }: BadgeContext) => text ?? count,
  formatAccessibleLabel: ({
    tabLabel,
    count,
    text,
    label,
    variant
  }: BadgeContext) => {
    const badgeText = label ? `${count} ${label}` : text ?? count;
    const status = variant && variant !== "info" ? `${variant}: ` : "";
    return badgeText === "" || badgeText === null || badgeText === undefined
      ? tabLabel
      : `${tabLabel}, ${status}${badgeText}`;
  }
} satisfies NormalizedBadgesOptions);

const VALID_LABEL_MODES = new Set<BadgeLabelMode>([
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
class A11yTabsBadges {
  private readonly tabs: TabsInstance;
  private readonly root: HTMLElement;
  private readonly options: NormalizedBadgesOptions;
  private badges = new Map<string, BadgeInput>();
  private readonly entries = new Map<HTMLElement, BadgeEntry>();
  private destroyed = false;
  private readonly handleDestroy = this.destroy.bind(this);

  constructor(
    target: TabsTarget,
    badges: BadgeMapInput = {},
    options: A11yTabsBadgesOptions = {}
  ) {
    this.tabs = resolveTabs(target, "A11yTabsBadges");
    this.root = resolveRoot(target, this.tabs, "A11yTabsBadges");
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (!VALID_LABEL_MODES.has(this.options.labelMode)) {
      throw new TypeError(
        "A11yTabsBadges: options.labelMode must be 'aria-label', 'hidden-text', or 'none'."
      );
    }

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
  setBadges(badges: BadgeMapInput = {}): void {
    this.badges = new Map(Object.entries(badges));
    this.update();
  }

  /** Set or clear a single badge by panel id or tab id. */
  setBadge(id: string, badge: BadgeInput | false | null | undefined): void {
    if (badge === null || badge === undefined || badge === false) {
      this.badges.delete(id);
    } else {
      this.badges.set(id, badge);
    }

    this.update();
  }

  /** Convenience helper for changing only the count value. */
  updateCount(id: string, count: BadgeValue): void {
    const current = this.normalizeBadge(this.badges.get(id));
    this.setBadge(id, { ...current, count });
  }

  /** Re-render badges from current configuration. */
  update(): void {
    this.entries.forEach((entry) => {
      const rawBadge = this.getBadgeForTab(entry.tab);
      const badge = rawBadge === undefined ? null : this.normalizeBadge(rawBadge);
      const isHidden = !badge || this.shouldHide(badge);

      if (isHidden) {
        this.removeBadge(entry);
        this.restoreTabLabel(entry);
        return;
      }

      this.renderBadge(entry, badge);
      this.updateTabLabel(entry, badge);
    });
  }

  /** Remove generated badges, labels, and event listeners. */
  destroy(): void {
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

  private renderBadge(entry: BadgeEntry, badge: NormalizedBadge): void {
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

    if (this.options.includeVisualInName) {
      entry.badge.removeAttribute("aria-hidden");
    } else {
      entry.badge.setAttribute("aria-hidden", "true");
    }
  }

  private updateTabLabel(entry: BadgeEntry, badge: NormalizedBadge): void {
    if (this.options.labelMode === "none" || this.options.includeVisualInName) {
      this.removeHiddenText(entry);
      return;
    }

    const label = this.options.formatAccessibleLabel(
      this.getContext(entry.tab, badge)
    );

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

    entry.hiddenText.textContent = label
      .replace(this.getBaseTabLabel(entry.tab), "")
      .replace(/^[\s,;:–—-]+/, "")
      .trim();
  }

  private restoreTabLabel(entry: BadgeEntry): void {
    this.removeHiddenText(entry);

    if (entry.originalAriaLabel === null) {
      entry.tab.removeAttribute("aria-label");
    } else {
      entry.tab.setAttribute("aria-label", entry.originalAriaLabel);
    }
  }

  private removeBadge(entry: BadgeEntry): void {
    entry.badge?.remove();
    entry.badge = null;
  }

  private removeHiddenText(entry: BadgeEntry): void {
    entry.hiddenText?.remove();
    entry.hiddenText = null;
  }

  private getBadgeForTab(tab: HTMLElement): BadgeInput | undefined {
    const panelId =
      tab.getAttribute("aria-controls") ?? tab.dataset.tabTarget ?? undefined;

    if (panelId && this.badges.has(panelId)) return this.badges.get(panelId);
    if (tab.id && this.badges.has(tab.id)) return this.badges.get(tab.id);

    return undefined;
  }

  private normalizeBadge(badge: BadgeInput | undefined): NormalizedBadge {
    if (typeof badge === "number" || typeof badge === "string") {
      return { count: badge, variant: this.options.defaultVariant };
    }

    return {
      count: badge?.count ?? "",
      text: badge?.text,
      label: badge?.label,
      variant: badge?.variant || this.options.defaultVariant,
      hideZero: badge?.hideZero
    };
  }

  private shouldHide(badge: NormalizedBadge): boolean {
    const hideZero = badge.hideZero ?? this.options.hideZero;
    return hideZero && (badge.count === 0 || badge.count === "0");
  }

  private getContext(tab: HTMLElement, badge: NormalizedBadge): BadgeContext {
    const panelId =
      tab.getAttribute("aria-controls") ?? tab.dataset.tabTarget ?? "";
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

  private getBaseTabLabel(tab: HTMLElement): string {
    const clone = tab.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return "";

    clone
      .querySelectorAll(`.${this.options.badgeClass}, .${this.options.visuallyHiddenClass}`)
      .forEach((node) => node.remove());

    return clone.textContent?.trim().replace(/\s+/g, " ") ?? "";
  }

  private getTabs(): HTMLElement[] {
    return getTabs(this.root);
  }
}

export default A11yTabsBadges;
export { A11yTabsBadges };
