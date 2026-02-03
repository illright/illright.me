// @ts-check

import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import icon from "astro-icon";
import expressiveCode from "astro-expressive-code";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";

export default defineConfig({
  site: "https://illright.me",

  markdown: {
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          content:
            // https://icones.js.org/collection/solar?s=link&icon=solar:link-circle-linear
            fromHtmlIsomorphic(
              '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><!-- Icon from Solar by 480 Design - https://creativecommons.org/licenses/by/4.0/ --><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M14 12a6 6 0 1 1-6-6"/><path d="M10 12a6 6 0 1 1 6 6"/></g></svg>',
            ),
        },
      ],
    ],
  },

  integrations: [
    sitemap(),
    icon(),
    expressiveCode({
      themes: ["one-dark-pro", "one-light"],
      styleOverrides: {
        codeFontFamily: "var(--font-family-code)",
        codeFontSize: "var(--font-size-code)",
        borderRadius: "var(--border-radius-code)",
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare({
    imageService: "compile",
  }),
});
