import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Configuração dos testes (Vitest). Ambiente Node — os testes cobrem a lógica
 * pura dos módulos (sem BD nem rede): normalização, pontuação, atribuição,
 * relatórios, SLA. O `tsconfigPaths` resolve o alias "@/…".
 */
export default defineConfig({
  plugins: [react(),tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globals: false,
  },
});
