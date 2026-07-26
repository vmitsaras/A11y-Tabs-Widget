import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const packageData = JSON.parse(readFileSync("package.json", "utf8"));
const excludedDirectories = new Set([".git", "dist", "node_modules"]);
const socialImageUrl = new URL(
  "social-preview.png",
  packageData.homepage
).href;
const socialImageAlt =
  "A11y Tabs: accessible tabs for semantic, progressively enhanced interfaces, shown with a manual activation tab example.";
const socialImageWidth = 1280;
const socialImageHeight = 640;
const maxSocialImageBytes = 1_000_000;
const socialImagePaths = [
  ".github/social-preview.png",
  "docs/social-preview.png"
];
const faviconPaths = ["favicon.svg", "docs/favicon.svg"];

function discoverHtml(directory = ".") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) return [];

    const path = join(directory, entry.name);
    if (entry.isDirectory()) return discoverHtml(path);
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  });
}

function oneMatch(html, expression, label, filePath) {
  const matches = [...html.matchAll(expression)];
  if (matches.length !== 1) {
    throw new Error(`${filePath}: expected one ${label}, found ${matches.length}`);
  }
  return matches[0][1];
}

function readPng(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`${filePath}: missing social preview image`);
  }

  const image = readFileSync(filePath);
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
  ]);

  if (image.length < 24 || !image.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`${filePath}: social preview must be a valid PNG`);
  }
  if (image.length >= maxSocialImageBytes) {
    throw new Error(
      `${filePath}: social preview must be under ${maxSocialImageBytes} bytes`
    );
  }

  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== socialImageWidth || height !== socialImageHeight) {
    throw new Error(
      `${filePath}: expected ${socialImageWidth}x${socialImageHeight}, found ${width}x${height}`
    );
  }

  return image;
}

const htmlFiles = discoverHtml().sort();
const sourceMetadata = [];

for (const filePath of htmlFiles) {
  const html = readFileSync(filePath, "utf8");
  const title = oneMatch(html, /<title>([\s\S]*?)<\/title>/g, "title", filePath);
  const favicon = oneMatch(
    html,
    /<link rel="icon" href="([^"]+)" type="image\/svg\+xml" \/>/g,
    "SVG favicon",
    filePath
  );
  const expectedFavicon = filePath.includes("examples/")
    ? "../../favicon.svg"
    : "favicon.svg";
  if (favicon !== expectedFavicon) {
    throw new Error(
      `${filePath}: expected favicon ${expectedFavicon}, found ${favicon}`
    );
  }
  const description = oneMatch(
    html,
    /<meta name="description" content="([^"]+)" \/>/g,
    "meta description",
    filePath
  );
  oneMatch(
    html,
    /<meta name="robots" content="(index,follow)" \/>/g,
    "robots directive",
    filePath
  );
  const canonical = oneMatch(
    html,
    /<link rel="canonical" href="([^"]+)" \/>/g,
    "canonical URL",
    filePath
  );
  const ogTitle = oneMatch(
    html,
    /<meta property="og:title" content="([^"]+)" \/>/g,
    "Open Graph title",
    filePath
  );
  const ogDescription = oneMatch(
    html,
    /<meta property="og:description" content="([^"]+)" \/>/g,
    "Open Graph description",
    filePath
  );
  const ogUrl = oneMatch(
    html,
    /<meta property="og:url" content="([^"]+)" \/>/g,
    "Open Graph URL",
    filePath
  );
  const ogImage = oneMatch(
    html,
    /<meta property="og:image" content="([^"]+)" \/>/g,
    "Open Graph image",
    filePath
  );
  const ogImageType = oneMatch(
    html,
    /<meta property="og:image:type" content="([^"]+)" \/>/g,
    "Open Graph image type",
    filePath
  );
  const ogImageWidth = oneMatch(
    html,
    /<meta property="og:image:width" content="([^"]+)" \/>/g,
    "Open Graph image width",
    filePath
  );
  const ogImageHeight = oneMatch(
    html,
    /<meta property="og:image:height" content="([^"]+)" \/>/g,
    "Open Graph image height",
    filePath
  );
  const ogImageAlt = oneMatch(
    html,
    /<meta property="og:image:alt" content="([^"]+)" \/>/g,
    "Open Graph image alt text",
    filePath
  );
  const twitterCard = oneMatch(
    html,
    /<meta name="twitter:card" content="([^"]+)" \/>/g,
    "Twitter card type",
    filePath
  );
  const twitterImage = oneMatch(
    html,
    /<meta name="twitter:image" content="([^"]+)" \/>/g,
    "Twitter image",
    filePath
  );
  const twitterImageAlt = oneMatch(
    html,
    /<meta name="twitter:image:alt" content="([^"]+)" \/>/g,
    "Twitter image alt text",
    filePath
  );
  const jsonText = oneMatch(
    html,
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    "JSON-LD block",
    filePath
  );

  const canonicalUrl = new URL(canonical);
  if (canonicalUrl.protocol !== "https:") {
    throw new Error(`${filePath}: canonical URL must use HTTPS`);
  }
  if (ogTitle !== title || ogDescription !== description || ogUrl !== canonical) {
    throw new Error(`${filePath}: Open Graph metadata does not match canonical metadata`);
  }
  if (
    ogImage !== socialImageUrl ||
    ogImageType !== "image/png" ||
    ogImageWidth !== String(socialImageWidth) ||
    ogImageHeight !== String(socialImageHeight) ||
    ogImageAlt !== socialImageAlt
  ) {
    throw new Error(`${filePath}: Open Graph image metadata is inconsistent`);
  }
  if (
    twitterCard !== "summary_large_image" ||
    twitterImage !== ogImage ||
    twitterImageAlt !== ogImageAlt
  ) {
    throw new Error(`${filePath}: Twitter image metadata does not match Open Graph`);
  }

  const jsonLd = JSON.parse(jsonText);
  const graph = jsonLd["@graph"];
  const webpage = graph?.find((node) => node["@type"] === "WebPage");
  const software = graph?.find((node) => node["@type"] === "SoftwareSourceCode");
  const image = graph?.find((node) => node["@type"] === "ImageObject");
  const imageId = `${socialImageUrl}#image`;

  if (
    webpage?.url !== canonical ||
    webpage?.name !== title ||
    webpage?.description !== description ||
    webpage?.["@id"] !== `${canonical}#webpage` ||
    webpage?.image?.["@id"] !== imageId ||
    webpage?.primaryImageOfPage?.["@id"] !== imageId
  ) {
    throw new Error(`${filePath}: WebPage JSON-LD does not match page metadata`);
  }
  if (
    software?.name !== packageData.name ||
    software?.version !== packageData.version ||
    software?.license !== packageData.license ||
    software?.image?.["@id"] !== imageId
  ) {
    throw new Error(`${filePath}: SoftwareSourceCode JSON-LD does not match package.json`);
  }
  if (
    image?.["@id"] !== imageId ||
    image?.url !== socialImageUrl ||
    image?.contentUrl !== socialImageUrl ||
    image?.caption !== socialImageAlt ||
    image?.width !== socialImageWidth ||
    image?.height !== socialImageHeight ||
    image?.encodingFormat !== "image/png"
  ) {
    throw new Error(`${filePath}: ImageObject JSON-LD does not match the social preview`);
  }
  if (/localhost|\/Users\/|file:\/\//i.test(jsonText)) {
    throw new Error(`${filePath}: JSON-LD contains a local or private URL`);
  }
  if (html.indexOf('type="application/ld+json"') > html.indexOf("</head>")) {
    throw new Error(`${filePath}: JSON-LD must appear in the document head`);
  }

  oneMatch(html, /<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/g, "h1", filePath);
  oneMatch(html, /(<main(?:\s[^>]*)?>)/g, "main landmark", filePath);
  oneMatch(html, /(<footer(?:\s[^>]*)?>)/g, "footer landmark", filePath);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${filePath}: duplicate id values found`);
  }

  const moduleScripts = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)]
    .map((match) => match[1]);
  const localAssets = [
    ...[...html.matchAll(/<link[^>]+href="([^"]+)"[^>]*>/g)].map(
      (match) => match[1]
    ),
    ...moduleScripts.flatMap((script) =>
      [...script.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map(
        (match) => match[1]
      )
    )
  ]
    .filter(
      (path) =>
        !path.startsWith("data:") &&
        !path.startsWith("http://") &&
        !path.startsWith("https://") &&
        !path.startsWith("#")
    );

  for (const assetPath of localAssets) {
    const absoluteAssetPath = resolve(dirname(filePath), assetPath);
    if (!existsSync(absoluteAssetPath)) {
      throw new Error(`${filePath}: missing local asset ${assetPath}`);
    }
  }

  if (!filePath.startsWith("docs/")) {
    sourceMetadata.push({ filePath, title, description, canonical });
  }
}

for (const key of ["title", "description", "canonical"]) {
  const values = sourceMetadata.map((entry) => entry[key]);
  if (new Set(values).size !== values.length) {
    throw new Error(`Source pages must use unique ${key} values`);
  }
}

const [sourceSocialImage, docsSocialImage] = socialImagePaths.map(readPng);
if (!sourceSocialImage.equals(docsSocialImage)) {
  throw new Error(
    "docs/social-preview.png must be identical to .github/social-preview.png"
  );
}

const [sourceFavicon, docsFavicon] = faviconPaths.map((filePath) => {
  if (!existsSync(filePath)) {
    throw new Error(`${filePath}: missing SVG favicon`);
  }

  const svg = readFileSync(filePath, "utf8");
  if (
    !svg.startsWith("<svg ") ||
    !svg.includes('viewBox="0 0 32 32"') ||
    !svg.includes("<title>A11y Tabs</title>")
  ) {
    throw new Error(`${filePath}: favicon must be a titled 32x32 SVG`);
  }
  return svg;
});

if (sourceFavicon !== docsFavicon) {
  throw new Error("docs/favicon.svg must be identical to favicon.svg");
}

console.log(
  `Validated ${htmlFiles.length} HTML files (${sourceMetadata.length} source pages and ${htmlFiles.length - sourceMetadata.length} docs mirrors).`
);
