import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "playwright-report/**",
    "test-results/**",
    "public/**",
    "coverage/**",
    "prisma/migrations/**",
  ]),
]);

export default eslintConfig;