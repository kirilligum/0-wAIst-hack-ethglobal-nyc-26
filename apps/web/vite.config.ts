import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(appDir, "../..");

function readDynamicEnvironmentId(mode: string): string {
  const rootEnv = loadEnv(mode, workspaceRoot, "");
  const appEnv = loadEnv(mode, appDir, "");
  return process.env.VITE_DYNAMIC_ENVIRONMENT_ID
    ?? process.env.DYNAMIC_ENVIRONMENT_ID
    ?? appEnv.VITE_DYNAMIC_ENVIRONMENT_ID
    ?? appEnv.DYNAMIC_ENVIRONMENT_ID
    ?? rootEnv.VITE_DYNAMIC_ENVIRONMENT_ID
    ?? rootEnv.DYNAMIC_ENVIRONMENT_ID
    ?? "";
}

export default defineConfig(({ mode }) => {
  const dynamicEnvironmentId = readDynamicEnvironmentId(mode);

  return {
    base: process.env.GITHUB_PAGES === "true" ? "/0-wAIst-hack-ethglobal-nyc-26/" : "/",
    envDir: workspaceRoot,
    plugins: [react()],
    define: {
      __DYNAMIC_ENVIRONMENT_ID__: JSON.stringify(dynamicEnvironmentId),
      "process.env": {},
      global: "globalThis"
    },
    server: {
      port: 5173
    }
  };
});
