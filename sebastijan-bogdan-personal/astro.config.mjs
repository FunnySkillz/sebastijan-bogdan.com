import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://sebastijanbogdan.com",
  adapter: vercel(),
  integrations: [sitemap()],
  i18n: {
    defaultLocale: "de",
    locales: ["de", "en"]
  }
});
