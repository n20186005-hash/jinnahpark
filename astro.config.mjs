import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const configuredSite = process.env.SITE_URL?.trim();
const site = configuredSite ? configuredSite : 'https://jinnahpark.com';

export default defineConfig({
  site,
  output: 'server',
  adapter: cloudflare({ configPath: './wrangler.jsonc' }),
  integrations: site ? [sitemap({ filter: url => !new URL(url).pathname.startsWith('/404') })] : [],
  vite: {
    plugins: [tailwindcss()]
  }
});
