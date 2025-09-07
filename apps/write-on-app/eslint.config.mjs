import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import writeonPlugin from "eslint-plugin-writeon";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    plugins: {
      writeon: writeonPlugin,
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "writeon/no-direct-dom-manipulation": "error",
      "writeon/store-access-via-hooks": "warn",
      "writeon/no-unauthorized-transform": "error",
      "writeon/require-canvas-error-boundary": "warn",
      "writeon/store-naming-convention": "warn",
      "writeon/hook-naming-convention": "warn",
      "writeon/event-prop-naming": "warn",
      "writeon/workspace-css-prefix": "warn",
      "writeon/chrome-css-prefix": "warn",
      "writeon/no-transform-on-chrome": "error",
    },
  },
];

export default eslintConfig;
