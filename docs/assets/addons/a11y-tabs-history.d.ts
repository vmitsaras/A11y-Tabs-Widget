import { i as TabsInstance } from "../index-B5ll15sm.js";
import { TabsTarget } from "./shared.js";
//#region src/addons/a11y-tabs-history.d.ts
type HistoryMode = "hash" | "query" | "state";
interface HistoryContext {
  tabs: TabsInstance;
  root: HTMLElement;
  tab: HTMLElement | null;
  panel: HTMLElement | null;
  index: number;
  previousIndex: number;
}
interface A11yTabsHistoryOptions {
  mode?: HistoryMode;
  queryParam?: string;
  stateKey?: string;
  pushInitialState?: boolean;
  getState?: ((context: HistoryContext) => unknown) | null;
  readState?: ((state: unknown, context: HistoryContext) => string | null) | null;
}
/**
 * Optional add-on that records tab changes in browser history.
 *
 * Use this when every tab activation should become a Back/Forward entry. The
 * core useHash option intentionally stays lightweight by replacing the current
 * hash instead of pushing history entries.
 */
declare class A11yTabsHistory {
  private readonly tabs;
  private readonly root;
  private readonly options;
  private isRestoring;
  private readonly handleChange;
  private readonly handlePopState;
  private readonly handleDestroy;
  constructor(target: TabsTarget, options?: A11yTabsHistoryOptions);
  destroy(): void;
  private normalizeOptions;
  private onChange;
  private onPopState;
  private restorePanel;
  private push;
  private getState;
  private getUrl;
  private readPanelId;
  private getActiveContext;
  private getContext;
  private getHashValue;
  private getTabs;
}
//#endregion
export { A11yTabsHistory, A11yTabsHistoryOptions, HistoryContext };
//# sourceMappingURL=a11y-tabs-history.d.ts.map