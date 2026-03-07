import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  // Base TypeScript rules
  ...tseslint.configs.recommended,

  // React hooks
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  // React Refresh (Vite HMR safety)
  {
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Project-specific overrides
  {
    rules: {
      // Allow unused vars prefixed with _ (e.g. _req, _err)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `any` is sometimes needed in adapter code / error boundaries
      '@typescript-eslint/no-explicit-any': 'warn',
      // Consistent type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },

  // Stories and tests — relax some rules
  {
    files: ['src/stories/**', '**/*.test.ts', '**/*.test.tsx', 'e2e/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Ignore generated / vendored dirs
  {
    ignores: ['dist/', 'storybook-static/', 'examples/', 'node_modules/'],
  },

  // Prettier must be last — disables all formatting rules
  prettier,
)
