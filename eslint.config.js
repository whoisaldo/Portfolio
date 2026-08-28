import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { react },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Without this, eslint cannot see identifiers used only as JSX element
      // names, so `motion` (lowercase, so not covered by varsIgnorePattern)
      // was reported unused in every file that renders <motion.div>. That made
      // `npm run lint` fail on a clean checkout.
      'react/jsx-uses-vars': 'error',
    },
  },
  // stats-api/ is a separate Vercel project that happens to live in this repo.
  // It is Node, not a browser: `process`, `Buffer` and friends are real there
  // and `globals.browser` alone reports every one of them as undefined. The
  // build scripts under scripts/ are Node for the same reason.
  {
    files: ['stats-api/**/*.{js,mjs}', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: {
      // Vite's React fast-refresh rule has no meaning outside the React app,
      // and every serverless handler is a default-exported function.
      'react-refresh/only-export-components': 'off',
    },
  },
])
