// Configuration for the native Void app.
import { defineConfig } from "void/config";

export default defineConfig({
  head: {
    title: "Caze (beta)",
    htmlAttrs: { lang: "ja" },
    bodyAttrs: { class: "dark" },
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    link: [
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
  },
  worker: {
    compatibility_date: "2026-02-24",
  },
});
