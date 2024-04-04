module.exports = {
  extends: ['../../.eslintrc.js'],

  ignorePatterns: ['!.eslintrc.js', 'dist/'],
  rules: {
    camelcase: 'off',
    'no-bitwise': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
  },
};
