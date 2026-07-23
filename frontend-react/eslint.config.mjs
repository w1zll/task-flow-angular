import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import storybook from 'eslint-plugin-storybook';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...storybook.configs['flat/recommended'],
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/sw.js',
    'public/sw.js.map',
    'public/swe-worker-*.js',
    'public/swe-worker-*.js.map',
  ]),
]);

export default eslintConfig;
