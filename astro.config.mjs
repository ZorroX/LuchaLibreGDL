import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://zorrox.github.io',
  base: process.env.BASE_PATH ?? '/',
  devToolbar: { enabled: false },
});
