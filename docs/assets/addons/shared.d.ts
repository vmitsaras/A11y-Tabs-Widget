import { i as TabsInstance } from "../index-B5ll15sm.js";
//#region src/addons/shared.d.ts
type TabsTarget = TabsInstance | HTMLElement;
interface TabsChangeDetail {
  instance?: TabsInstance;
  tab?: HTMLElement | null;
  panel?: HTMLElement | null;
  index?: number;
  previousIndex?: number;
}
declare function isRecord(value: unknown): value is Record<string, unknown>;
declare function isTabsInstance(value: unknown): value is TabsInstance;
declare function resolveTabs(target: TabsTarget, label: string): TabsInstance;
declare function resolveRoot(target: TabsTarget, tabs: TabsInstance, label: string): HTMLElement;
declare function getTabsList(root: HTMLElement): HTMLElement | null;
declare function getTabs(root: HTMLElement): HTMLElement[];
declare function getPanels(root: HTMLElement): HTMLElement[];
declare function getTabsEventDetail(event: Event): TabsChangeDetail;
declare function isDisableable(element: HTMLElement): element is HTMLElement & {
  disabled: boolean;
};
declare function isDisabledElement(element: HTMLElement | null | undefined): boolean;
declare function resolveElement<T extends HTMLElement = HTMLElement>(elementOrSelector: HTMLElement | string | false | null | undefined, scope: ParentNode): T | null;
declare function escapeSelectorValue(value: string): string;
//#endregion
export { TabsChangeDetail, TabsTarget, escapeSelectorValue, getPanels, getTabs, getTabsEventDetail, getTabsList, isDisableable, isDisabledElement, isRecord, isTabsInstance, resolveElement, resolveRoot, resolveTabs };
//# sourceMappingURL=shared.d.ts.map