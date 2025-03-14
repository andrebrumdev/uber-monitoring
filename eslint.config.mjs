import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/out'] },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect'
      }
    },
    extends: ['prettier']
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules,
      'react-hooks/exhaustive-deps': 'off', // Não exige dependências em useEffect
      'react-refresh/only-export-components': 'off', // Permite qualquer exportação
      '@typescript-eslint/no-require-imports': 'off', // Permite require()
      '@typescript-eslint/no-explicit-any': 'off', // Permite qualquer uso de any
      'no-console': 'off', // Permite console.log()
      '@typescript-config/consistent-casing': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'unused-imports/no-unused-imports': 'warn'
    }
  },
  eslintConfigPrettier
)
