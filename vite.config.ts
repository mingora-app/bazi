import { defineConfig } from "vite";

export default defineConfig({
  root: "site",
  base: "/bazi/",
  publicDir: "public",
  build: {
    outDir: "../site-dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});
