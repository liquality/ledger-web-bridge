module.exports = {
    root: true,
  
    env: {
      browser: true,
      node: true
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
      project: "./tsconfig.json"
    },
    rules: {
      "no-underscore-dangle": "off",
      "comma-dangle": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-member-accessibility": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/no-parameter-properties": "off",
      "@typescript-eslint/explicit-function-return-type": "off"
    },
    plugins: ["@typescript-eslint"],
    extends: ["plugin:@typescript-eslint/recommended"],
    overrides: [
      {
        files: ["src/*.ts", "tests/*.ts"]
      }
    ]
  };