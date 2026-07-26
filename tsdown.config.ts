import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    docs: "./src/docs.ts",
    "addons/shared": "./src/addons/shared.ts",
    "addons/a11y-tabs-accordion": "./src/addons/a11y-tabs-accordion.ts",
    "addons/a11y-tabs-analytics": "./src/addons/a11y-tabs-analytics.ts",
    "addons/a11y-tabs-autoinit": "./src/addons/a11y-tabs-autoinit.ts",
    "addons/a11y-tabs-badges": "./src/addons/a11y-tabs-badges.ts",
    "addons/a11y-tabs-history": "./src/addons/a11y-tabs-history.ts",
    "addons/a11y-tabs-loader": "./src/addons/a11y-tabs-loader.ts",
    "addons/a11y-tabs-overflow-menu": "./src/addons/a11y-tabs-overflow-menu.ts",
    "addons/a11y-tabs-shortcuts": "./src/addons/a11y-tabs-shortcuts.ts",
    "addons/a11y-tabs-stepper": "./src/addons/a11y-tabs-stepper.ts",
    "addons/a11y-tabs-tour": "./src/addons/a11y-tabs-tour.ts",
    "addons/a11y-tabs-unsaved-guard": "./src/addons/a11y-tabs-unsaved-guard.ts",
    "addons/a11y-tabs-validation": "./src/addons/a11y-tabs-validation.ts"
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  platform: "neutral",
  outDir: "dist"
});
