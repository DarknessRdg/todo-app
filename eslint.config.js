import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Icons come from `@/icons`, named for what they mean in the app. Only
      // that folder may talk to an icon library, so swapping it is one edit.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lucide-react",
              message: "Import a domain icon from @/icons.",
            },
          ],
          patterns: [
            {
              group: ["@phosphor-icons/*"],
              message: "Import a domain icon from @/icons.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/icons/**"],
    rules: { "no-restricted-imports": "off" },
  },
]);
