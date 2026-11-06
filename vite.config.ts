import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, lazyPlugins } from "vite-plus";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["worker-configuration.d.ts"],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ["worker-configuration.d.ts"],
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    passWithNoTests: true,
  },
  plugins: lazyPlugins(() => [
    ...(process.env.VITEST ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
    tailwindcss(),
    reactRouter(),
    devtoolsJson(),
  ]),
});
