import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [react()],
  build: {
    // Target evergreen browsers — produces smaller, faster output.
    target: "es2020",
    // Raise the chunk size warning threshold (word-list is intentionally large).
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/scheduler")
          ) {
            return "vendor-react";
          }
          if (
            id.includes("node_modules/@codemirror") ||
            id.includes("node_modules/@uiw/codemirror") ||
            id.includes("node_modules/@uiw/react-codemirror") ||
            id.includes("node_modules/codemirror") ||
            id.includes("node_modules/@lezer") ||
            id.includes("node_modules/@marijn") ||
            id.includes("node_modules/style-mod") ||
            id.includes("node_modules/w3c-keyname") ||
            id.includes("node_modules/crelt")
          ) {
            return "vendor-codemirror";
          }
          // Word-list and CMU dictionary are large; isolate them so the main
          // bundle stays lean and they can be cached independently.
          if (
            id.includes("node_modules/word-list") ||
            id.includes("node_modules/cmu-pronouncing-dictionary")
          ) {
            return "vendor-dictionaries";
          }
          // docx is pulled in only for export; keep it out of the critical path.
          if (id.includes("node_modules/docx")) {
            return "vendor-docx";
          }
          // Vite's dynamic-import preload helper (a virtual module, so it matches
          // none of the path rules below). Left unclaimed, Rollup parks it in an
          // arbitrary chunk — it chose workshop-tools, and since the entry calls
          // the helper for every one of its lazy imports, the entry was forced to
          // statically import that whole 255KB chunk to obtain one small function.
          // Pin it next to the rest of the boot code.
          if (id.includes("vite/preload-helper")) {
            return "app-shell";
          }
          // Modules main.tsx pulls in synchronously to boot the app shell.
          //
          // These MUST be claimed before the workshop-tools rule below. They are
          // reachable both from the entry and from the analysis code, and when a
          // shared module has no manual chunk of its own Rollup folds it into the
          // manual chunk that also uses it. That put appearance/ and hints/ inside
          // workshop-tools — so the entry chunk ended up statically importing all
          // 257KB of it just to reach a handful of small bindings, and first paint
          // waited on the whole download. Measured on a throttled phone: FCP landed
          // ~90ms after workshop-tools finished, with the landing page's own assets
          // not even requested until afterwards.
          //
          // Listed file-by-file rather than by directory on purpose: a blanket
          // /src/workshop/appearance/ rule would also swallow BackgroundPicker and
          // its form fields, which are lazy-loaded and should stay split out.
          if (
            id.includes("/src/shared/") ||
            id.includes("/src/workshop/hints/") ||
            id.includes("/src/workshop/appearance/appearance.ts") ||
            id.includes("/src/workshop/appearance/fonts.ts") ||
            id.includes("/src/workshop/appearance/backgrounds/presets.ts")
          ) {
            return "app-shell";
          }
          // NOTE: analysis/ and voice/ are deliberately NOT grouped into a manual
          // chunk. They used to be ("workshop-tools"), on the reasoning that the
          // tool panels render immediately — but grouping by directory ignores
          // where the lazy boundary actually falls.
          //
          // WorkshopToolPanels is loaded through React.lazy, so Rollup can already
          // see that most of analysis/ is reachable only dynamically. The manual
          // rule overrode that: the shell statically imports a few small helpers
          // from the same directory (ToolTabBar, ai-analyze, the live syllable and
          // repeat analysis behind usePoemWorkshopModel), and because they shared a
          // chunk with the panels, importing ~52KB of helpers dragged ~550KB of
          // panel code onto the workshop's critical path. On a phone the tools
          // sheet starts closed, so that was paid before the user could type.
          //
          // Removing the rule lets Rollup split at the real dynamic-import
          // boundary. Measured: opening the workshop drops from 326KB to 281KB gz.
          // Re-adding a directory-wide rule here will silently undo that.

          // Landing page is lazy-loaded — give it its own chunk so the
          // workshop code (CodeMirror, tools, etc.) doesn't inflate the
          // landing-page download and vice-versa.
          if (id.includes("/src/landing/")) {
            return "landing";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    // In local dev, "vercel dev" runs on :3000 and handles /api/*.
    // If you run bare "vite dev" the analyze button will fail; use "vercel dev" instead.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
