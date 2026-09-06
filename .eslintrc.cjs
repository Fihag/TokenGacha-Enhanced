module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  rules: {
    "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
    "no-undef": "error",
    eqeqeq: ["warn", "smart"],
    "no-console": "off",
  },
  overrides: [
    {
      files: ["sw.js"],
      env: { serviceworker: true, browser: true, es2022: true },
      parserOptions: { sourceType: "script" },
      globals: {
        caches: "readonly",
        self: "readonly",
      },
    },
    {
      files: ["tests/**/*.js"],
      env: { node: true },
      parserOptions: { sourceType: "module" },
    },
    {
      files: ["vitest.config.js", ".prettierrc.json"],
      parserOptions: { sourceType: "module" },
      env: { node: true },
    },
  ],
};
