module.exports = {
  test_page: 'tests/index.html?hidepassed&nolint&nocontainer',
  disable_watching: true,
  // only emit logs for failed tests
  // https://github.com/testem/testem#tap-options
  tap_quiet_logs: true,
  launch_in_ci: [
    'Chrome'
  ],
  launch_in_dev: [
    'Chrome'
  ],
  browser_args: {
    Chrome: [
      '--disable-gpu',
      '--headless',
      '--remote-debugging-port=9222',
      '--window-size=1440,900'
    ]
  }
};
