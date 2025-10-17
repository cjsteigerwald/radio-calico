/**
 * PostCSS Configuration
 * Used for CSS bundling and optimization
 */

module.exports = {
  plugins: {
    // Resolve @import statements and inline them
    'postcss-import': {
      path: ['public/css']
    },
    // Minify CSS for production
    'cssnano': {
      preset: ['default', {
        // Preserve CSS custom properties (variables)
        calc: false,
        colormin: true,
        discardComments: {
          removeAll: true
        },
        normalizeWhitespace: true,
        // Don't remove quotes from URLs or attributes
        minifyFontValues: {
          removeQuotes: false
        },
        minifySelectors: true,
        // Preserve media query order
        mergeRules: false
      }]
    }
  }
};
