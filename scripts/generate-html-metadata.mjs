import { readFileSync, writeFileSync } from "node:fs";

const packageData = JSON.parse(readFileSync("package.json", "utf8"));
const siteUrl = packageData.homepage;
const repositoryUrl = packageData.repository.url
  .replace(/^git\+/, "")
  .replace(/\.git$/, "");
const socialImageUrl = new URL("social-preview.png", siteUrl).href;
const socialImageAlt =
  "A11y Tabs: accessible tabs for semantic, progressively enhanced interfaces, shown with a manual activation tab example.";
const socialImageWidth = 1280;
const socialImageHeight = 640;

const pages = {
  "index.html": {
    title: "Accessible Tabs Demos and API | A11y Tabs",
    description:
      "Try manual, automatic, vertical, RTL, disabled, and add-on tab patterns, then review keyboard behavior, API methods, styling, and limits.",
    path: "",
    features: [
      "Manual and automatic tab activation",
      "Horizontal, vertical, and right-to-left keyboard navigation",
      "Disabled tab handling",
      "Cancellable tab changes",
      "Optional lifecycle, navigation, validation, and presentation add-ons"
    ]
  },
  "examples/basic/index.html": {
    title: "Basic Accessible Tabs Example | A11y Tabs",
    description:
      "Start with semantic buttons and panels, then inspect the ARIA relationships, roving focus, keyboard navigation, and hidden panel state added at runtime.",
    path: "examples/basic/",
    features: [
      "Semantic button tabs",
      "Progressive enhancement",
      "Roving tabindex keyboard navigation",
      "ARIA tab and tabpanel relationships",
      "Hidden inactive panel state"
    ]
  },
  "examples/addon-accordion/index.html": {
    title: "Responsive FAQ Accordion Adapter | A11y Tabs",
    description:
      "Test FAQ tabs that switch to required-open disclosure controls when labels wrap or overflow while preserving selection and focus context.",
    path: "examples/addon-accordion/",
    features: [
      "Container-aware presentation changes",
      "Required-open disclosure controls",
      "Selection and focus continuity",
      "Readable no-JavaScript content"
    ]
  },
  "examples/addon-analytics/index.html": {
    title: "Tab Analytics Event Log Example | A11y Tabs",
    description:
      "Forward normalized tab changes to a local event log and compare keyboard and pointer activation without adding an analytics SDK to the core package.",
    path: "examples/addon-analytics/",
    features: [
      "Normalized tab change data",
      "Local analytics-style event log",
      "Shared keyboard and pointer callback path"
    ]
  },
  "examples/addon-autoinit/index.html": {
    title: "Event-driven Tab Auto-init Example | A11y Tabs",
    description:
      "Initialize existing tabs when the document is ready, then enhance routed fragments with an explicit scoped request event and removable controller.",
    path: "examples/addon-autoinit/",
    features: [
      "Explicit document-ready initialization",
      "Scoped event-driven fragment initialization",
      "Duplicate initialization protection",
      "Removable controller listeners"
    ]
  },
  "examples/addon-badges/index.html": {
    title: "Accessible Tab Badge States | A11y Tabs",
    description:
      "Add, clear, and label review counts and urgent states on tabs while keeping status changes available without relying on color alone.",
    path: "examples/addon-badges/",
    features: [
      "Count and status badges",
      "Custom accessible badge labels",
      "Zero-count hiding",
      "Non-color status feedback"
    ]
  },
  "examples/addon-history/index.html": {
    title: "Back and Forward Tab History | A11y Tabs",
    description:
      "Create hash-based tab history, restore panels with browser Back and Forward, and keep stable panel IDs as deep-link targets.",
    path: "examples/addon-history/",
    features: [
      "Hash-based panel URLs",
      "Browser Back and Forward restoration",
      "Stable panel deep links"
    ]
  },
  "examples/addon-loader/index.html": {
    title: "Lazy Tab Panel Loading States | A11y Tabs",
    description:
      "Inspect lazy panel loading with readable fallback content, busy state, polite updates, retry controls, failure handling, and cached results.",
    path: "examples/addon-loader/",
    features: [
      "Lazy panel loading",
      "Loading and error feedback",
      "Retry controls",
      "Cached successful responses"
    ]
  },
  "examples/addon-overflow-menu/index.html": {
    title: "Overflowing Tablist Jump Menu | A11y Tabs",
    description:
      "Use a generated jump menu for a crowded tablist while preserving the original tabs, mirrored state, Escape handling, and keyboard navigation.",
    path: "examples/addon-overflow-menu/",
    features: [
      "Generated overflow jump menu",
      "Visible keyboard-operable tablist",
      "Mirrored selected and disabled state",
      "Escape focus return"
    ]
  },
  "examples/addon-shortcuts/index.html": {
    title: "Direct Tab Keyboard Shortcuts | A11y Tabs",
    description:
      "Map optional direct shortcuts to tabs, preserve the standard keyboard pattern, and prevent document-level commands from interrupting text entry.",
    path: "examples/addon-shortcuts/",
    features: [
      "Explicit direct shortcut mappings",
      "Document-scoped keyboard handling",
      "Editable control protection",
      "Standard tabs keyboard fallback"
    ]
  },
  "examples/addon-stepper/index.html": {
    title: "Tabs as a Checkout Stepper | A11y Tabs",
    description:
      "Synchronize selected tabs with current-step text and Previous and Next buttons while retaining direct tablist keyboard navigation.",
    path: "examples/addon-stepper/",
    features: [
      "Synchronized step progress",
      "Previous and Next controls",
      "Boundary button states",
      "Direct tablist navigation"
    ]
  },
  "examples/addon-tour/index.html": {
    title: "Guided Tab Panel Tour Example | A11y Tabs",
    description:
      "Guide visitors through tab panels with generated controls, step callbacks, Escape-to-skip behavior, visible target state, and reduced-motion support.",
    path: "examples/addon-tour/",
    features: [
      "Generated guided tour controls",
      "Sequential panel activation",
      "Escape-to-skip behavior",
      "Reduced-motion support"
    ]
  },
  "examples/addon-unsaved-guard/index.html": {
    title: "Unsaved Form Tab Guard | A11y Tabs",
    description:
      "Track dirty fields, cancel tab changes before unsaved work is lost, and compare save, reset, and native confirmation recovery paths.",
    path: "examples/addon-unsaved-guard/",
    features: [
      "Dirty field tracking",
      "Cancellable tab changes",
      "Save and reset recovery flows",
      "Native confirmation example"
    ]
  },
  "examples/addon-validation/index.html": {
    title: "Tabbed Form Validation Summary | A11y Tabs",
    description:
      "Mark tabs containing invalid fields, add accessible error descriptions and badges, then activate the right panel and focus the first problem.",
    path: "examples/addon-validation/",
    features: [
      "Invalid tab summaries",
      "Accessible error descriptions",
      "Error badges",
      "First-invalid-field focus routing"
    ]
  }
};

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildJsonLd(page, canonical) {
  const authorId = `${canonical}#author`;
  const softwareId = `${canonical}#software`;
  const imageId = `${socialImageUrl}#image`;
  const webpage = {
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: page.title,
    description: page.description,
    inLanguage: "en",
    ...(page.path
      ? { isPartOf: { "@id": `${siteUrl}#webpage` } }
      : {}),
    about: { "@id": softwareId },
    mainEntity: { "@id": softwareId },
    author: { "@id": authorId },
    image: { "@id": imageId },
    primaryImageOfPage: { "@id": imageId }
  };

  const software = {
    "@type": "SoftwareSourceCode",
    "@id": softwareId,
    name: packageData.name,
    alternateName: "A11y Tabs",
    description: packageData.description,
    codeRepository: repositoryUrl,
    programmingLanguage: ["TypeScript", "JavaScript"],
    runtimePlatform: "Browser",
    version: packageData.version,
    license: packageData.license,
    keywords: packageData.keywords,
    featureList: page.features,
    author: { "@id": authorId },
    creator: { "@id": authorId },
    image: { "@id": imageId },
    targetProduct: {
      "@type": "SoftwareApplication",
      name: "Modern web browsers",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      runtimePlatform: "Browser"
    },
    sameAs: [repositoryUrl]
  };

  const author = {
    "@type": "Person",
    "@id": authorId,
    name: packageData.author,
    url: "https://github.com/vmitsaras/",
    sameAs: [
      "https://github.com/vmitsaras/",
      "https://linkedin.com/in/vasilis-mitsaras"
    ]
  };

  const image = {
    "@type": "ImageObject",
    "@id": imageId,
    url: socialImageUrl,
    contentUrl: socialImageUrl,
    caption: socialImageAlt,
    width: socialImageWidth,
    height: socialImageHeight,
    encodingFormat: "image/png"
  };

  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": [webpage, software, author, image]
    },
    null,
    2
  )
    .split("\n")
    .map((line) => `      ${line}`)
    .join("\n");
}

function buildMetadata(page) {
  const canonical = new URL(page.path, siteUrl).href;
  const title = escapeAttribute(page.title);
  const description = escapeAttribute(page.description);

  return `
    <!-- seo:start -->
    <meta name="description" content="${description}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${socialImageUrl}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="${socialImageWidth}" />
    <meta property="og:image:height" content="${socialImageHeight}" />
    <meta property="og:image:alt" content="${escapeAttribute(socialImageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${socialImageUrl}" />
    <meta name="twitter:image:alt" content="${escapeAttribute(socialImageAlt)}" />
    <script type="application/ld+json">
${buildJsonLd(page, canonical)}
    </script>
    <!-- seo:end -->`;
}

for (const [filePath, page] of Object.entries(pages)) {
  let html = readFileSync(filePath, "utf8");
  const faviconHref = page.path ? "../../favicon.svg" : "favicon.svg";
  html = html.replace(
    /\s*<!-- seo:start -->[\s\S]*?<!-- seo:end -->\s*/,
    "\n"
  );
  html = html.replace(
    /<link rel="icon"[^>]*>/,
    `<link rel="icon" href="${faviconHref}" type="image/svg+xml" />`
  );
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`);
  html = html.replace(
    /(<title>[\s\S]*?<\/title>)/,
    `$1${buildMetadata(page)}`
  );
  writeFileSync(filePath, html);
}

console.log(`Updated metadata for ${Object.keys(pages).length} source HTML pages.`);
