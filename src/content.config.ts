import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/data/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['observation', 'equipment', 'theory', 'simulation', 'open-data']),
    publishedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(true),
    featured: z.boolean().default(false),
    series: z.string().optional(),
    cover: z.string().optional(),
    observation: z.object({
      target: z.string().optional(),
      observedAt: z.coerce.date().optional(),
      location: z.string().optional(),
      equipment: z.array(z.string()).default([]),
      conditions: z.string().optional(),
    }).optional(),
  }),
});

export const collections = { posts };
