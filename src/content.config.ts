import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.md" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date().transform((date) => {
        date.setHours(12);
        return date;
      }),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.optional(image()),
    }),
});

export const collections = { blog };
