import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://rang-iosphere.pages.dev',
  integrations: [sitemap()],
  vite: {
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          const isKnownZodAnnotationWarning = warning.code === 'INVALID_ANNOTATION'
            && warning.id?.includes('/zod/v4/core/');
          if (!isKnownZodAnnotationWarning) warn(warning);
        },
      },
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: false }]],
    }),
  },
});
