export interface PluginDocs {
  slug: string;
  name: string;
  packageName: string;
  description: string;
  repo?: string;
  npm?: string;
  install: {
    npm: string;
    pnpm: string;
    yarn: string;
  };
  usage: string;
  selectors?: string[];
  keyboard?: Array<{
    key: string;
    description: string;
  }>;
  api: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  examples?: Array<{
    name: string;
    description: string;
    path: string;
  }>;
}

export const docs = {
  slug: "a11y-tabs",
  name: "A11y Tabs",
  packageName: "a11y-tabs-widget",
  description:
    "Accessible tabs behavior for semantic, progressively enhanced tab interfaces.",
  repo: "https://github.com/vmitsaras/a11y-tabs-widget",
  npm: "https://www.npmjs.com/package/a11y-tabs-widget",
  install: {
    npm: "npm install a11y-tabs-widget",
    pnpm: "pnpm add a11y-tabs-widget",
    yarn: "yarn add a11y-tabs-widget"
  },
  usage: `import { createTabs } from "a11y-tabs-widget";
import "a11y-tabs-widget/styles.css";

const root = document.querySelector("[data-a11y-tabs]");

if (root instanceof HTMLElement) {
  createTabs(root);
}`,
  selectors: [
    "[data-a11y-tabs]",
    "[data-a11y-tabs-list]",
    "[data-a11y-tabs-tab]",
    "[data-a11y-tabs-panel]"
  ],
  keyboard: [
    {
      key: "ArrowLeft / ArrowRight",
      description:
        "Moves focus between tabs in horizontal tablists, with RTL direction support."
    },
    {
      key: "ArrowUp / ArrowDown",
      description: "Moves focus between tabs in vertical tablists."
    },
    {
      key: "Home / End",
      description: "Moves focus to the first or last enabled tab."
    },
    {
      key: "Enter / Space",
      description: "Activates the focused tab when manual activation is used."
    }
  ],
  api: [
    {
      name: "createTabs(root, options)",
      type: "(root: HTMLElement, options?: TabsOptions) => TabsInstance",
      description: "Initializes tabs behavior on a root element."
    },
    {
      name: "initTabsAll(options, scope)",
      type: "(options?: TabsOptions, scope?: ParentNode) => TabsInstance[]",
      description:
        "Initializes every tabs root in a document or scoped container."
    },
    {
      name: "installTabsAutoInit(options, scope)",
      type: "(options?: TabsOptions, scope?: Document | DocumentFragment | Element) => TabsAutoInitController",
      description:
        "Optional a11y-tabs-autoinit export for document-ready initialization and scoped a11y-tabs:request-init events."
    },
    {
      name: "A11yTabs",
      type: "class A11yTabs implements TabsInstance",
      description:
        "Plugin-specific class with duplicate-initialization protection."
    },
    {
      name: "activate(indexOrId)",
      type: "(indexOrId: number | string) => boolean",
      description: "Activates a tab by numeric index or tab element id."
    },
    {
      name: "activateByPanelId(panelId)",
      type: "(panelId: string) => boolean",
      description: "Activates the tab that controls a matching panel id."
    },
    {
      name: "next() / previous()",
      type: "() => boolean",
      description: "Activates the next or previous enabled tab."
    },
    {
      name: "destroy()",
      type: "() => void",
      description:
        "Removes event listeners, restores original DOM state, and clears plugin state."
    }
  ],
  examples: [
    {
      name: "Basic",
      description:
        "Basic tabs markup initialized from the built package, with a docs-site mirror for GitHub Pages.",
      path: "examples/basic"
    },
    {
      name: "Accordion Adapter",
      description:
        "Container-aware FAQ tabs adapted into required-open disclosure controls with focus continuity when labels wrap or overflow.",
      path: "examples/addon-accordion"
    },
    {
      name: "Analytics Log",
      description:
        "Tab change data forwarded to a local analytics-style event log.",
      path: "examples/addon-analytics"
    },
    {
      name: "Auto-init",
      description:
        "Explicit document-ready initialization plus scoped request events for routed fragments.",
      path: "examples/addon-autoinit"
    },
    {
      name: "Badges",
      description:
        "Status and count badges on tabs with deliberate accessible labels.",
      path: "examples/addon-badges"
    },
    {
      name: "History",
      description:
        "Hash-based tab history with browser Back and Forward restoration.",
      path: "examples/addon-history"
    },
    {
      name: "Loader",
      description:
        "Lazy-loaded tab panels with loading, error, retry, and cached states.",
      path: "examples/addon-loader"
    },
    {
      name: "Overflow Menu",
      description:
        "A compact generated jump menu for overflowing tablists.",
      path: "examples/addon-overflow-menu"
    },
    {
      name: "Shortcuts",
      description:
        "Optional direct keyboard shortcuts for activating tabs.",
      path: "examples/addon-shortcuts"
    },
    {
      name: "Stepper",
      description:
        "External progress text and Previous/Next controls synced to tabs.",
      path: "examples/addon-stepper"
    },
    {
      name: "Tour",
      description:
        "Guided tour controls that activate tab panels in sequence.",
      path: "examples/addon-tour"
    },
    {
      name: "Unsaved Guard",
      description:
        "Dirty form tracking that cancels tab changes until the user confirms.",
      path: "examples/addon-unsaved-guard"
    },
    {
      name: "Validation",
      description:
        "Invalid form fields summarized with tab badges and focus routing.",
      path: "examples/addon-validation"
    }
  ]
} satisfies PluginDocs;
