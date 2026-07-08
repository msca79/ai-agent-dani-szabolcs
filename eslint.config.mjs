import nxPlugin from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist', '**/node_modules', '**/.nx'],
  },
  tseslint.configs.recommended,
  ...nxPlugin.configs['flat/base'],
  ...nxPlugin.configs['flat/typescript'],
  ...nxPlugin.configs['flat/javascript'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          depConstraints: [
            {
              sourceTag: 'type:data',
              onlyDependOnLibsWithTags: [],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: ['type:data', 'type:feature'],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:feature', 'type:data'],
            },
          ],
        },
      ],
    },
  },
);
