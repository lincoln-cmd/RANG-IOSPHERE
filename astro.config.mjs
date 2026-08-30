import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://rang-iosphere.pages.dev',
  integrations: [sitemap()],
});
