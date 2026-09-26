import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import n8nNodes from 'eslint-plugin-n8n-nodes-base';
import tseslint from 'typescript-eslint';

/** Rules predating NodeConnectionTypes and external documentation URLs, also disabled by the n8n starter. */
const OUTDATED_N8N_RULES = {
  'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
  'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
  'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
};

const n8nRules = (config) => ({
  plugins: { 'n8n-nodes-base': n8nNodes },
  rules: { ...n8nNodes.configs[config].rules, ...OUTDATED_N8N_RULES },
});

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/reports/**', '**/.stryker-tmp/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'max-lines': ['error', 500],
      'max-lines-per-function': ['error', { max: 35, skipBlankLines: true, skipComments: true }],
    },
  },
  { files: ['**/test/**'], rules: { 'max-lines-per-function': 'off' } },
  { files: ['packages/n8n-nodes/nodes/**/*.ts'], ...n8nRules('nodes') },
  { files: ['packages/n8n-nodes/credentials/**/*.ts'], ...n8nRules('credentials') },
  prettier,
);
