/* eslint-env node */
'use strict';

module.exports = {
  name: require("./package.json").name,

  isDevelopingAddon() {
    return true;
  }
};
