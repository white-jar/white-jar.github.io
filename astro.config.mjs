// @ts-check
import { defineConfig } from "astro/config";

import preact from "@astrojs/preact";
import icon from "astro-icon";
import rehypeMermaidDual from "./src/utils/rehype-mermaid-dual.js";

// https://astro.build/config
export default defineConfig({
  site: "https://white-jar.github.io",
  integrations: [preact(), icon()],
  markdown: {
    syntaxHighlight: {
      type: "shiki",
      excludeLangs: ["mermaid"],
    },
    rehypePlugins: [rehypeMermaidDual],
  },
  server: {
    port: 3000,
  },
});
