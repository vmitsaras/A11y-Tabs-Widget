import { i as TabsInstance } from "../index-B5ll15sm.js";
import { TabsTarget } from "./shared.js";
//#region src/addons/a11y-tabs-loader.d.ts
type LoaderCache = boolean | "reload";
type LoaderContentType = "html" | "text";
type LoaderMessage = string | ((context: LoaderContext) => string | number);
type FetchOptionsFactory = (context: LoaderContext) => RequestInit | undefined;
interface LoaderContext {
  loader: A11yTabsLoader;
  tabs: TabsInstance;
  root: HTMLElement;
  tab: HTMLElement | null;
  panel: HTMLElement;
  src?: string;
  response?: Response;
  content?: string;
  error?: unknown;
}
interface A11yTabsLoaderOptions {
  srcAttribute?: string;
  cache?: LoaderCache;
  contentType?: LoaderContentType;
  loadingText?: LoaderMessage;
  loadedText?: LoaderMessage;
  errorText?: LoaderMessage;
  retryText?: LoaderMessage;
  statusClass?: string;
  errorClass?: string;
  retryClass?: string;
  fetchOptions?: RequestInit | FetchOptionsFactory;
  sanitize?: ((content: string, context: LoaderContext) => string) | null;
  allowUnsafeHtml?: boolean;
  renderContent?: ((context: LoaderContext) => void) | null;
  renderError?: ((context: LoaderContext) => Node | void | null) | null;
  onLoad?: ((context: LoaderContext) => void) | null;
  onError?: ((context: LoaderContext) => void) | null;
  onRetry?: ((context: LoaderContext) => void) | null;
}
/**
 * Optional add-on that lazy-loads remote panel content on first activation.
 *
 * Panels opt in with data-tab-src by default. HTML responses are only injected
 * when a sanitize callback is supplied, allowUnsafeHtml is true, or a custom
 * renderContent callback takes responsibility for rendering.
 */
declare class A11yTabsLoader {
  private readonly tabs;
  private readonly root;
  private readonly options;
  private readonly states;
  private readonly loadedPanels;
  private readonly controllers;
  private readonly retryContexts;
  private destroyed;
  private readonly handleChange;
  private readonly handleDestroy;
  private readonly handleRetryClick;
  constructor(target: TabsTarget, options?: A11yTabsLoaderOptions);
  load(panel?: HTMLElement | null): Promise<string | null>;
  reload(panel?: HTMLElement | null): Promise<string | null>;
  destroy(): void;
  private onChange;
  private shouldUseCache;
  private setLoading;
  private renderContent;
  private renderError;
  private onRetryClick;
  private setLiveMessage;
  private getStatus;
  private getState;
  private clearError;
  private getFetchOptions;
  private createContext;
  private format;
  private getTabForPanel;
  private getPanels;
  private isAbortError;
}
//#endregion
export { A11yTabsLoader, A11yTabsLoader as default, A11yTabsLoaderOptions, LoaderContext };
//# sourceMappingURL=a11y-tabs-loader.d.ts.map