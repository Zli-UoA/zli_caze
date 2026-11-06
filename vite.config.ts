import tailwindcss from "@tailwindcss/vite";
import { defineConfig, lazyPlugins } from "vite-plus";
import devtoolsJson from "vite-plugin-devtools-json";
import { voidReact } from "@void/react/plugin";
import { voidPlugin } from "void";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "durable-objects/**/*.test.ts", "pages/**/*.test.tsx"],
    environment: "node",
    passWithNoTests: true,
  },
  plugins: lazyPlugins(() => [
    ...(process.env.VITEST ? [] : [voidPlugin(), voidReact()]),
    tailwindcss(),
    devtoolsJson(),
  ]),
});
