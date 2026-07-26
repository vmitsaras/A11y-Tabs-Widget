import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";

const assets = [
  ["dist/index.js", "docs/assets/index.js"],
  ["dist/index.js.map", "docs/assets/index.js.map"],
  ["dist/styles.css", "docs/assets/styles.css"],
  ["examples/addon-demo.css", "docs/assets/addon-demo.css"],
  [".github/social-preview.png", "docs/social-preview.png"],
  ["favicon.svg", "docs/favicon.svg"]
];

const addonDistDir = "dist/addons";

if (existsSync(addonDistDir)) {
  for (const fileName of readdirSync(addonDistDir)) {
    assets.push([
      join(addonDistDir, fileName),
      join("docs/assets/addons", fileName)
    ]);
  }
}

for (const [source, target] of assets) {
  if (!existsSync(source)) {
    throw new Error(`Missing ${source}. Run npm run build before copying docs assets.`);
  }

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

const examples = [
  "basic",
  "addon-accordion",
  "addon-analytics",
  "addon-autoinit",
  "addon-badges",
  "addon-history",
  "addon-loader",
  "addon-overflow-menu",
  "addon-shortcuts",
  "addon-stepper",
  "addon-tour",
  "addon-unsaved-guard",
  "addon-validation"
];

function setDocsFavicon(html, href) {
  const favicon = `<link rel="icon" href="${href}" type="image/svg+xml" />`;

  if (html.includes('rel="icon"')) {
    return html.replace(/<link rel="icon"[^>]*>/, favicon);
  }

  return html.replace(
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />\n',
    `    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    ${favicon}\n`
  );
}

for (const slug of examples) {
  const source = join("examples", slug, "index.html");
  const target = join("docs/examples", slug, "index.html");

  if (!existsSync(source)) {
    throw new Error(`Missing ${source}. Create the example before building docs.`);
  }

  const html = setDocsFavicon(
    readFileSync(source, "utf8")
      .replaceAll('href="../../dist/styles.css"', 'href="../../assets/styles.css"')
      .replaceAll('href="../addon-demo.css"', 'href="../../assets/addon-demo.css"')
      .replaceAll("../../dist/index.js", "../../assets/index.js")
      .replaceAll("../../dist/addons/", "../../assets/addons/"),
    "../../favicon.svg"
  );

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
}

const rootHtml = setDocsFavicon(
  readFileSync("index.html", "utf8")
    .replaceAll('href="dist/styles.css"', 'href="assets/styles.css"')
    .replaceAll(
      'href="examples/addon-demo.css"',
      'href="assets/addon-demo.css"'
    )
    .replaceAll("'./dist/index.js'", "'./assets/index.js'")
    .replaceAll("'./dist/addons/", "'./assets/addons/"),
  "favicon.svg"
);

writeFileSync("docs/index.html", rootHtml);
