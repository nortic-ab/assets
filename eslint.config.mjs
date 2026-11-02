import nortic from '@nortic-ab/eslint-config'

export default nortic({
  formatters: true,
  // The playground's copy of dagny's stylesheets and its pages are dagny's own markup and CSS, kept as
  // dagny serves them
  ignores: [
    'assets/hosting/playground/vendor/**',
    'assets/hosting/playground/pages/**',
    'assets/hosting/playground/partials/**',
  ],
})
