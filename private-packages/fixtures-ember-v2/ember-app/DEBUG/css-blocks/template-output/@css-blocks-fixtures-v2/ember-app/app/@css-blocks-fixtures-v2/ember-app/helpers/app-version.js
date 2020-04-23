import { helper } from '@ember/component/helper';
import config from '../config/environment';
import { shaRegExp, versionRegExp, versionExtendedRegExp } from 'ember-cli-app-version/utils/regexp';

export function appVersion(_, hash = {}) {
  const version = config.APP.version;
  // e.g. 1.0.0-alpha.1+4jds75hf

  // Allow use of 'hideSha' and 'hideVersion' For backwards compatibility
  let versionOnly = hash.versionOnly || hash.hideSha;
  let shaOnly = hash.shaOnly || hash.hideVersion;

  let match = null;

  if (versionOnly) {
    if (hash.showExtended) {
      match = version.match(versionExtendedRegExp); // 1.0.0-alpha.1
    }
    // Fallback to just version
    if (!match) {
      match = version.match(versionRegExp); // 1.0.0
    }
  }

  if (shaOnly) {
    match = version.match(shaRegExp); // 4jds75hf
  }

  return match ? match[0] : version;
}

export default helper(appVersion);
