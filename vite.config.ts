import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background/index.ts"),
      },
      output: {
        entryFileNames: "background/index.js",
        format: "es",
      },
    },
  },
});
