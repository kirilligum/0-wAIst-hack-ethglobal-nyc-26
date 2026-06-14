import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/0-wAIst-hack-ethglobal-nyc-26/" : "/",
  plugins: [react()],
  server: {
    port: 5173
  }
});
