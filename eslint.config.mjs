import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.flat.recommended.rules,
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
