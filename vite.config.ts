import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./tests/setup.ts",
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
    ],
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["src/**"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.{js,ts,jsx,tsx}",
        "src/**/*.spec.{js,ts,jsx,tsx}",
        "src/main.tsx",
        "src/index.tsx",
      ],
    },
  },
});
