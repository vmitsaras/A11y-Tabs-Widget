import { i as TabsInstance } from "../index-B5ll15sm.js";
import { TabsTarget } from "./shared.js";
//#region src/addons/a11y-tabs-badges.d.ts
type BadgeValue = string | number;
type BadgeLabelMode = "aria-label" | "hidden-text" | "none";
type BadgeInput = BadgeValue | BadgeConfig;
type BadgeMapInput = Record<string, BadgeInput>;
interface BadgeConfig {
  count?: BadgeValue;
  text?: BadgeValue | null;
  label?: string;
  variant?: string;
  hideZero?: boolean;
}
interface BadgeContext {
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
interface A11yTabsBadgesOptions {
  badgeClass?: string;
  visuallyHiddenClass?: string;
  defaultVariant?: string;
  hideZero?: boolean;
  includeVisualInName?: boolean;
  labelMode?: BadgeLabelMode;
  formatBadge?: (context: BadgeContext) => BadgeValue | null | undefined;
  formatAccessibleLabel?: (context: BadgeContext) => string;
}
/**
 * Optional add-on that attaches status/count badges to A11yTabs tab buttons.
 *
 * Badge config keys may be either panel ids or tab ids. The visual badge is
 * marked aria-hidden by default so the count/status does not get merged into
 * the tab's accessible name. Use labelMode: "aria-label" or "hidden-text" to
 * provide a deliberate screen-reader label.
 */
declare class A11yTabsBadges {
  private readonly tabs;
  private readonly root;
  private readonly options;
  private badges;
  private readonly entries;
  private destroyed;
  private readonly handleDestroy;
  constructor(target: TabsTarget, badges?: BadgeMapInput, options?: A11yTabsBadgesOptions);
  /** Replace all badge configuration and render it. */
  setBadges(badges?: BadgeMapInput): void;
  /** Set or clear a single badge by panel id or tab id. */
  setBadge(id: string, badge: BadgeInput | false | null | undefined): void;
  /** Convenience helper for changing only the count value. */
  updateCount(id: string, count: BadgeValue): void;
  /** Re-render badges from current configuration. */
  update(): void;
  /** Remove generated badges, labels, and event listeners. */
  destroy(): void;
  private renderBadge;
  private updateTabLabel;
  private restoreTabLabel;
  private removeBadge;
  private removeHiddenText;
  private getBadgeForTab;
  private normalizeBadge;
  private shouldHide;
  private getContext;
  private getBaseTabLabel;
  private getTabs;
}
//#endregion
export { A11yTabsBadges, A11yTabsBadges as default, A11yTabsBadgesOptions, BadgeConfig, BadgeContext };
//# sourceMappingURL=a11y-tabs-badges.d.ts.map