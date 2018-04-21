'use strict';

let browsers = [
  '> 5%',
  'last 2 Edge versions',
  'last 2 Chrome versions',
  'last 2 Firefox versions',
  'last 2 Safari versions',
];

if (process.env.EMBER_ENV === 'test') {
  browsers = [
    'last 1 Chrome versions',
    'last 1 Firefox versions'
  ];
}

module.exports = { browsers };
