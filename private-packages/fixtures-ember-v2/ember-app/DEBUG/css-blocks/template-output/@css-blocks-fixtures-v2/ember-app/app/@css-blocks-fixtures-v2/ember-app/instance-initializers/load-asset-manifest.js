import manifest from '../config/asset-manifest';

/**
 * Initializes the AssetLoader service with a generated asset-manifest.
 */
export function initialize(instance) {
  const service = instance.lookup('service:asset-loader');
  service.pushManifest(manifest);
}

export default {
  name: 'load-asset-manifest',
  initialize
};
