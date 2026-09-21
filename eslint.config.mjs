import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "@typescript-eslint/eslint-plugin";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": [
        "error",
        {
          fixToUnknown: true,
        },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSAsExpression",
          message: "Do not use TypeScript type assertions; use declarations, generics, unions, or narrowing.",
        },
        {
          selector: "TSTypeAssertion",
          message: "Do not use TypeScript type assertions; use declarations, generics, unions, or narrowing.",
        },
      ],
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "coverage/**", "public/**"]),
]);
