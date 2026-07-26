import {
  escapeSelectorValue,
  getPanels,
  getTabsEventDetail,
  resolveRoot,
  resolveTabs,
  type TabsTarget
} from "./shared.js";
import type { TabsInstance } from "../index.js";

type LoaderCache = boolean | "reload";
type LoaderContentType = "html" | "text";
type LoaderMessage = string | ((context: LoaderContext) => string | number);
type FetchOptionsFactory = (context: LoaderContext) => RequestInit | undefined;

export interface LoaderContext {
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

export interface A11yTabsLoaderOptions {
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

interface NormalizedLoaderOptions {
  srcAttribute: string;
  cache: LoaderCache;
  contentType: LoaderContentType;
  loadingText: LoaderMessage;
  loadedText: LoaderMessage;
  errorText: LoaderMessage;
  retryText: LoaderMessage;
  statusClass: string;
  errorClass: string;
  retryClass: string;
  fetchOptions?: RequestInit | FetchOptionsFactory;
  sanitize: ((content: string, context: LoaderContext) => string) | null;
  allowUnsafeHtml: boolean;
  renderContent: ((context: LoaderContext) => void) | null;
  renderError: ((context: LoaderContext) => Node | void | null) | null;
  onLoad: ((context: LoaderContext) => void) | null;
  onError: ((context: LoaderContext) => void) | null;
  onRetry: ((context: LoaderContext) => void) | null;
}

interface LoaderState {
  status: HTMLDivElement | null;
  error: Node | null;
  content: string | null;
}

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
  fetchOptions: undefined,
  sanitize: null,
  allowUnsafeHtml: false,
  renderContent: null,
  renderError: null,
  onLoad: null,
  onError: null,
  onRetry: null
} satisfies NormalizedLoaderOptions);

/**
 * Optional add-on that lazy-loads remote panel content on first activation.
 *
 * Panels opt in with data-tab-src by default. HTML responses are only injected
 * when a sanitize callback is supplied, allowUnsafeHtml is true, or a custom
 * renderContent callback takes responsibility for rendering.
 */
class A11yTabsLoader {
  private readonly tabs: TabsInstance;
  private readonly root: HTMLElement;
  private readonly options: NormalizedLoaderOptions;
  private readonly states = new WeakMap<HTMLElement, LoaderState>();
  private readonly loadedPanels = new WeakSet<HTMLElement>();
  private readonly controllers = new Map<HTMLElement, AbortController>();
  private readonly retryContexts = new WeakMap<HTMLButtonElement, LoaderContext>();
  private destroyed = false;

  private readonly handleChange = this.onChange.bind(this);
  private readonly handleDestroy = this.destroy.bind(this);
  private readonly handleRetryClick = this.onRetryClick.bind(this);

  constructor(target: TabsTarget, options: A11yTabsLoaderOptions = {}) {
    this.tabs = resolveTabs(target, "A11yTabsLoader");
    this.root = resolveRoot(target, this.tabs, "A11yTabsLoader");
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.root.addEventListener("a11y-tabs:change", this.handleChange);
    this.root.addEventListener("a11y-tabs:destroy", this.handleDestroy);

    void this.load(this.tabs.getActivePanel());
  }

  async load(
    panel: HTMLElement | null = this.tabs.getActivePanel()
  ): Promise<string | null> {
    if (this.destroyed || !(panel instanceof HTMLElement)) return null;

    const src = panel.getAttribute(this.options.srcAttribute);
    if (!src) return null;

    if (this.shouldUseCache(panel)) {
      return this.getState(panel).content;
    }

    this.controllers.get(panel)?.abort();
    const controller =
      typeof AbortController === "function" ? new AbortController() : null;
    if (controller) this.controllers.set(panel, controller);

    const context = this.createContext(panel, { src });
    this.setLoading(panel, context);

    try {
      const response = await fetch(src, this.getFetchOptions(context, controller));
      if (!response.ok) {
        throw new Error(
          `A11yTabsLoader: request failed with ${response.status}.`
        );
      }

      const content = await response.text();
      const nextContext = this.createContext(panel, { src, response, content });
      this.renderContent(nextContext);
      this.loadedPanels.add(panel);
      this.getState(panel).content = content;
      this.setLiveMessage(panel, this.format(this.options.loadedText, nextContext));
      panel.removeAttribute("aria-busy");
      this.options.onLoad?.(nextContext);
      return content;
    } catch (error) {
      if (this.isAbortError(error)) return null;

      const errorContext = this.createContext(panel, { src, error });
      this.renderError(errorContext);
      panel.removeAttribute("aria-busy");
      this.options.onError?.(errorContext);
      return null;
    } finally {
      if (controller && this.controllers.get(panel) === controller) {
        this.controllers.delete(panel);
      }
    }
  }

  reload(
    panel: HTMLElement | null = this.tabs.getActivePanel()
  ): Promise<string | null> {
    if (panel instanceof HTMLElement) {
      this.loadedPanels.delete(panel);
      this.getState(panel).content = null;
    }

    return this.load(panel);
  }

  destroy(): void {
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

  private onChange(event: Event): void {
    const detail = getTabsEventDetail(event);
    void this.load(detail.panel ?? null);
  }

  private shouldUseCache(panel: HTMLElement): boolean {
    return (
      this.options.cache !== false &&
      this.options.cache !== "reload" &&
      this.loadedPanels.has(panel)
    );
  }

  private setLoading(panel: HTMLElement, context: LoaderContext): void {
    const state = this.getState(panel);
    this.clearError(state);
    panel.setAttribute("aria-busy", "true");
    this.setLiveMessage(panel, this.format(this.options.loadingText, context));
  }

  private renderContent(context: LoaderContext): void {
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

    throw new TypeError(
      'A11yTabsLoader: provide options.sanitize, options.renderContent, or set contentType to "text" before loading HTML.'
    );
  }

  private renderError(context: LoaderContext): void {
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

  private onRetryClick(event: MouseEvent): void {
    if (!(event.currentTarget instanceof HTMLButtonElement)) return;
    const context = this.retryContexts.get(event.currentTarget);
    if (!context) return;

    this.options.onRetry?.(context);
    void this.reload(context.panel);
  }

  private setLiveMessage(panel: HTMLElement, message: string): void {
    const status = this.getStatus(panel);
    status.textContent = message;
  }

  private getStatus(panel: HTMLElement): HTMLDivElement {
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

  private getState(panel: HTMLElement): LoaderState {
    let state = this.states.get(panel);
    if (!state) {
      state = { status: null, error: null, content: null };
      this.states.set(panel, state);
    }
    return state;
  }

  private clearError(state: LoaderState): void {
    if (state.error instanceof Element) {
      state.error.querySelectorAll("button").forEach((button) => {
        if (button instanceof HTMLButtonElement && this.retryContexts.has(button)) {
          button.removeEventListener("click", this.handleRetryClick);
          this.retryContexts.delete(button);
        }
      });
    }

    state.error?.parentNode?.removeChild(state.error);
    state.error = null;
  }

  private getFetchOptions(
    context: LoaderContext,
    controller: AbortController | null
  ): RequestInit | undefined {
    const fetchOptions =
      typeof this.options.fetchOptions === "function"
        ? this.options.fetchOptions(context)
        : this.options.fetchOptions;

    if (!fetchOptions && !controller) {
      return undefined;
    }

    const base = fetchOptions ?? {};
    return {
      ...base,
      signal: controller?.signal ?? base.signal
    };
  }

  private createContext<T extends Partial<LoaderContext>>(
    panel: HTMLElement,
    extra: T = {} as T
  ): LoaderContext & T {
    return {
      loader: this,
      tabs: this.tabs,
      root: this.root,
      tab: this.getTabForPanel(panel),
      panel,
      ...extra
    };
  }

  private format(value: LoaderMessage, context: LoaderContext): string {
    return typeof value === "function" ? String(value(context)) : String(value ?? "");
  }

  private getTabForPanel(panel: HTMLElement): HTMLElement | null {
    if (!panel.id) return null;
    return this.root.querySelector<HTMLElement>(
      `[role="tab"][aria-controls="${escapeSelectorValue(panel.id)}"]`
    );
  }

  private getPanels(): HTMLElement[] {
    return getPanels(this.root);
  }

  private isAbortError(error: unknown): boolean {
    return (
      error instanceof DOMException && error.name === "AbortError"
    ) || (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError"
    );
  }
}

export default A11yTabsLoader;
export { A11yTabsLoader };
