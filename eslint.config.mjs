import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".agents/**",
    ".temp_ag_kit/**",
    ".gemini/**",
    "e2e/**",
    "tests/**",
    "public/**",
    "supabase/**",
    "scripts/**",
    "scan_error.mjs",
  ]),
]);

export default eslintConfig;
