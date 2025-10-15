import type { Config } from "@react-router/dev/config";

export default {
  ssr: false,
  appDirectory: "src/app",
  future: {
    unstable_viteEnvironmentApi: true,
  },
} satisfies Config;
