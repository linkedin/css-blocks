import require from 'require';
import environment from './environment';

const modulePrefix = environment.modulePrefix;
const metaName = `${modulePrefix}/config/asset-manifest`;
const nodeName = `${modulePrefix}/config/node-asset-manifest`;

let config = {};

try {
  // If we have a Node version of the asset manifest, use that for FastBoot and
  // similar environments.
  if (require.has(nodeName)) {
    config = require(nodeName).default; // eslint-disable-line
  } else {
    const rawConfig = document.querySelector('meta[name="' + metaName + '"]').getAttribute('content');
    config = JSON.parse(unescape(rawConfig));
  }
} catch(err) {
  throw new Error('Failed to load asset manifest. For browser environments, verify the meta tag with name "'+ metaName +
    '" is present. For non-browser environments, verify that you included the node-asset-manifest module.');
}

export default config;
