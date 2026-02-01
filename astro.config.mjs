// @ts-check

import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://illright.me",
  integrations: [sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },
});