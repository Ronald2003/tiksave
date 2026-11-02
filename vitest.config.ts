import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({ plugins: [react()], resolve: { alias: { "@": path.resolve("src"), "server-only": path.resolve("tests/empty.ts") } }, test: { include: ["tests/unit/**/*.test.{ts,tsx}"], environment: "node", clearMocks: true } });
