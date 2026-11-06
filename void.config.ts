// Configuration for the native Void app.
import { defineConfig } from "void/config";

export default defineConfig({
  cloudflare: {
    name: "zli-caze",
    compatibility_date: "2026-02-24",
    compatibility_flags: ["nodejs_compat"],
  },
  worker: {
    compatibility_date: "2026-02-24",
  },
});
