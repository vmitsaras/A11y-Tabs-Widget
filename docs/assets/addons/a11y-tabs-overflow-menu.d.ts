import { TabsTarget } from "./shared.js";
//#region src/addons/a11y-tabs-overflow-menu.d.ts
type OverflowControl = "menu" | "select" | "jump-list" | false | null;
interface A11yTabsOverflowMenuOptions {
  control?: OverflowControl;
  className?: string;
  label?: string;
  menuButtonText?: string;
  observeInterval?: number;
}
/**
 * Optional add-on that detects tablist overflow and mirrors the tabs into an
 * auxiliary control for narrow containers.
 *
 * The original tablist is never hidden or replaced. Keyboard users can keep
 * using the normal tablist arrow-key behavior, while the generated menu,
 * select, or jump list provides a compact direct-jump alternative when the
 * tablist overflows. The control is hidden when all tabs fit.
 */
declare class A11yTabsOverflowMenu {
  private readonly tabs;
  private readonly root;
  private readonly options;
  private readonly list;
  private items;
  private control;
  private destroyed;
  private isOverflowing;
  private resizeObserver;
  private fallbackTimer;
  private readonly originalRootOverflow;
  private readonly handleChange;
  private readonly handleClick;
  private readonly handleSelectChange;
  private readonly handleDocumentClick;
  private readonly handleKeydown;
  private readonly handleResize;
  private readonly handleDestroy;
  private readonly handleMenuButtonClick;
  private readonly handleMenuButtonKeydown;
  constructor(target: TabsTarget, options?: A11yTabsOverflowMenuOptions);
  /** Re-read the tablist dimensions and show/hide the auxiliary control. */
  refresh(): void;
  /** Synchronise generated control options with selected and disabled tabs. */
  update(): void;
  /** Remove generated controls and resize/change listeners. */
  destroy(): void;
  private createControl;
  private createMenu;
  private createSelect;
  private createJumpList;
  private startObserving;
  private detectOverflow;
  private onClick;
  private onSelectChange;
  private syncSelect;
  private syncButtons;
  private onMenuButtonClick;
  private onMenuButtonKeydown;
  private setMenuOpen;
  private onDocumentClick;
  private onKeydown;
  private isMenuOpen;
  private getEnabledMenuItems;
  private getList;
  private getTabs;
  private restoreOverflowState;
}
//#endregion
export { A11yTabsOverflowMenu, A11yTabsOverflowMenu as default, A11yTabsOverflowMenuOptions };
//# sourceMappingURL=a11y-tabs-overflow-menu.d.ts.map