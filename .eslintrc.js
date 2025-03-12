module.exports = {
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "rules": {
    // Error prevention
    "no-unused-vars": "warn",
    "no-undef": "error",
    "no-var": "error",
    "prefer-const": "warn",

    // Style consistency
    "semi": ["warn", "always"],
    "quotes": ["warn", "single", { "allowTemplateLiterals": true }],
    "indent": ["warn", 2],
    "comma-dangle": ["warn", "never"],

    // Functional practices
    "no-param-reassign": "warn",
    "prefer-destructuring": "warn",
    "prefer-spread": "warn",

    // Documentation
    "valid-jsdoc": ["warn", {
      "requireReturn": false,
      "requireParamDescription": false,
      "requireReturnDescription": false
    }],
    "require-jsdoc": ["warn", {
      "require": {
        "FunctionDeclaration": true,
        "MethodDefinition": false,
        "ClassDeclaration": false,
        "ArrowFunctionExpression": false,
        "FunctionExpression": false
      }
    }],

    // Code quality
    "complexity": ["warn", 15],
    "max-depth": ["warn", 4],
    "max-len": ["warn", { "code": 100, "ignoreComments": true }],
    "max-lines-per-function": ["warn", { "max": 50, "skipBlankLines": true, "skipComments": true }]
  }
};
