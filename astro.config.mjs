import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/contrib/mhchem';
import rehypeImageAttributes from './src/lib/rehype-image-attributes.mjs';
import rehypeLocalizeFootnotes from './src/lib/rehype-localize-footnotes.mjs';

const addArticleModifiedDate = (item) => {
  const pathname = new URL(item.url).pathname;
  if (!/^\/archive\/[^/]+\/$/.test(pathname)) return item;
  const htmlPath = resolve(process.cwd(), 'dist', decodeURIComponent(pathname).replace(/^\/+/, ''), 'index.html');
  if (!existsSync(htmlPath)) return item;
  const html = readFileSync(htmlPath, 'utf8');
  const modified = html.match(/"dateModified":"([^"]+)"/)?.[1];
  return modified ? { ...item, lastmod: new Date(modified) } : item;
};

export default defineConfig({
  site: 'https://rang-iosphere.pages.dev',
  integrations: [sitemap({ serialize: addArticleModifiedDate })],
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
      rehypePlugins: [[rehypeKatex, { strict: false }], rehypeImageAttributes, rehypeLocalizeFootnotes],
    }),
  },
});
