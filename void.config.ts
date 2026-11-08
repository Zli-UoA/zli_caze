// Configuration for the native Void app.
import { defineConfig } from "void/config";

export default defineConfig({
  head: {
    title: "Caze",
    htmlAttrs: { lang: "ja" },
    bodyAttrs: { class: "dark" },
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    link: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
      },
    ],
  },
  cloudflare: {
    name: "zli-caze",
    compatibility_date: "2026-02-24",
    compatibility_flags: ["nodejs_compat"],
    workers_dev: true,
    preview_urls: true,
    routes: [{ pattern: "caze.zli.works", custom_domain: true }],
  },
  worker: {
    compatibility_date: "2026-02-24",
  },
});
