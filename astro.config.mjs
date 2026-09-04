// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://ai-api-hub-zeta.vercel.app',
  output: 'static',
  integrations: [tailwind(), sitemap()],
});
